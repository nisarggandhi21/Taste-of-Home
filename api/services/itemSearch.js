// Finding dishes. Used by the items endpoint and by the AI assistant's search tool, so both
// apply exactly the same filters and visibility rules.
import { aiConfig, isAiEnabled } from '../ai/config.js';
import { embedItem, embedQuery, similarity } from '../ai/embeddings.js';
import Item from '../models/item.model.js';
import User from '../models/user.model.js';

// The id is a tie-breaker so that pages never overlap.
const SORTS = {
  sales: { sales: -1, _id: 1 },
  createdAt: { createdAt: -1, _id: 1 },
  rating: { rating: -1, starNumber: -1, _id: 1 },
  price: { price: -1, _id: 1 },
  priceAsc: { price: 1, _id: 1 },
};

// Never returned to clients.
const HIDDEN = { embedding: 0, embeddingModel: 0 };

// A dish counts as a meaning-based match when it is close enough to the query in absolute
// terms and not far behind the best match for that query.
const MIN_SIMILARITY = Number(process.env.AI_SEARCH_MIN_SCORE) || 0.5;
const BEST_MATCH_MARGIN = 0.12;
// Upper bound on the dishes scored in memory for one search.
const MAX_CANDIDATES = 3000;
// Dishes saved before the AI features were on have no search vector. Each search gives a few
// of them one, so an existing menu becomes searchable by meaning without any manual step.
const BACKFILL_PER_SEARCH = 6;

// Search text is matched literally, never interpreted as a regular expression.
export const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const withRating = {
  $addFields: {
    rating: {
      $cond: [{ $gt: ['$starNumber', 0] }, { $divide: ['$totalStars', '$starNumber'] }, 0],
    },
  },
};

// Everything except the search text.
const buildFilters = async (q, currentUserId) => {
  const userId = {};
  if (q.userId) userId.$eq = q.userId;
  // Your own items are left out of general browsing.
  else if (currentUserId) userId.$ne = currentUserId;

  if (q.location) {
    // Items carry no location of their own; they are where their seller is.
    const sellers = await User.find({
      location: { $regex: escapeRegex(q.location), $options: 'i' },
    }).distinct('_id');
    userId.$in = sellers.map(String);
  }

  return {
    ...(Object.keys(userId).length && { userId }),
    ...(q.cat && { cat: { $regex: escapeRegex(q.cat), $options: 'i' } }),
    ...((q.min !== undefined || q.max !== undefined) && {
      price: {
        ...(q.min !== undefined && { $gt: q.min }),
        ...(q.max !== undefined && { $lt: q.max }),
      },
    }),
    // Paused items are only listed for their owner.
    ...(!(q.userId && q.userId === currentUserId) && { isAvailable: { $ne: false } }),
    ...(q.diet && { diet: q.diet }),
    // Items without declared allergens never count as free from anything.
    ...(q.freeFrom?.length && { allergens: { $exists: true, $nin: q.freeFrom } }),
  };
};

const page = (items, total, q) => ({
  items,
  total,
  page: q.page,
  pages: Math.max(1, Math.ceil(total / q.limit)),
});

const runPipeline = async (filters, q) => {
  const [result] = await Item.aggregate([
    { $match: filters },
    withRating,
    { $sort: SORTS[q.sort] || SORTS.createdAt },
    {
      $facet: {
        items: [{ $skip: (q.page - 1) * q.limit }, { $limit: q.limit }, { $project: HIDDEN }],
        total: [{ $count: 'count' }],
      },
    },
  ]);
  return page(result.items, result.total[0]?.count || 0, q);
};

// Scores every candidate dish against the query by words and by meaning.
// Resolves to [{ id, score }] best first, or null when meaning-based search is unavailable.
const rankByMeaning = async (filters, text) => {
  let queryVector;
  try {
    queryVector = await embedQuery(text);
  } catch (err) {
    console.error('Search fell back to keywords:', err.message);
    return null;
  }

  const words = new RegExp(escapeRegex(text), 'i');
  const candidates = await Item.find(filters)
    .select('title shortDesc desc cat diet features +embedding +embeddingModel')
    .limit(MAX_CANDIDATES)
    .lean();

  // A vector from another embedding model cannot be compared with this query.
  const { embeddingModel } = aiConfig();
  const usable = (item) => item.embedding?.length > 0 && item.embeddingModel === embeddingModel;
  const unindexed = candidates.filter((item) => !usable(item)).slice(0, BACKFILL_PER_SEARCH);
  const vectors = await Promise.all(unindexed.map((item) => embedItem(item)));
  unindexed.forEach((item, i) => {
    item.embedding = vectors[i] || undefined;
    item.embeddingModel = vectors[i] ? embeddingModel : item.embeddingModel;
  });

  const scored = candidates.map((item) => ({
    id: item._id,
    inTitle: words.test(item.title),
    inText: words.test(`${item.shortDesc} ${item.desc}`),
    similarity: usable(item) ? similarity(queryVector, item.embedding) : 0,
  }));
  const best = Math.max(0, ...scored.map((entry) => entry.similarity));
  const cutoff = Math.max(MIN_SIMILARITY, best - BEST_MATCH_MARGIN);

  return (
    scored
      .filter((entry) => entry.inTitle || entry.inText || entry.similarity >= cutoff)
      // Exact words in the title first, then in the text, then by closeness of meaning.
      .map((entry) => ({
        id: entry.id,
        score: (entry.inTitle ? 2 : 0) + (entry.inText ? 1 : 0) + entry.similarity,
      }))
      .sort((a, b) => b.score - a.score)
  );
};

// q is a validated items query (see schemas/item.schema.js).
// Resolves to { items, total, page, pages, smart } where `smart` says whether the results
// were matched by meaning as well as by words.
export const searchItems = async (q, { currentUserId } = {}) => {
  const filters = await buildFilters(q, currentUserId);

  if (!q.search) {
    const sort = q.sort === 'relevance' ? 'sales' : q.sort;
    return { ...(await runPipeline(filters, { ...q, sort })), smart: false };
  }

  const ranked = isAiEnabled() ? await rankByMeaning(filters, q.search) : null;
  if (!ranked) {
    // Plain keyword search on the title.
    const keyword = { ...filters, title: { $regex: escapeRegex(q.search), $options: 'i' } };
    const sort = q.sort === 'relevance' ? 'sales' : q.sort;
    return { ...(await runPipeline(keyword, { ...q, sort })), smart: false };
  }

  const ids = ranked.map((entry) => entry.id);
  if (q.sort !== 'relevance') {
    // The buyer chose an order (price, rating, ...): keep the matches, sort their way.
    return { ...(await runPipeline({ _id: { $in: ids } }, q)), smart: true };
  }

  // Best match first.
  const pageIds = ids.slice((q.page - 1) * q.limit, q.page * q.limit);
  const found = await Item.aggregate([
    { $match: { _id: { $in: pageIds } } },
    withRating,
    { $project: HIDDEN },
  ]);
  const byId = new Map(found.map((item) => [String(item._id), item]));
  const items = pageIds.map((id) => byId.get(String(id))).filter(Boolean);
  return { ...page(items, ids.length, q), smart: true };
};
