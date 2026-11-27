import Item from '../models/item.model.js';
import { aiConfig, isAiEnabled } from './config.js';
import { embed } from './gemini.js';
import { tracked } from './usage.js';

const DIET_WORDS = { veg: 'vegetarian', egg: 'contains egg', nonveg: 'non-vegetarian' };

// The text a dish is searched by: what a buyer might be thinking of when they want it.
export const searchTextOf = (item) =>
  [
    item.shortDesc,
    item.desc,
    `Category: ${item.cat}.`,
    item.diet ? `${DIET_WORDS[item.diet]}.` : '',
    item.features?.length ? `Features: ${item.features.join(', ')}.` : '',
  ]
    .filter(Boolean)
    .join(' ');

// Stores a dish's search vector and resolves to it, or to null when that was not possible.
// Never throws: a dish must save even when AI is down.
export const embedItem = async (item) => {
  if (!isAiEnabled()) return null;
  const { embeddingModel } = aiConfig();
  try {
    const vector = await tracked({ feature: 'embed-item', model: embeddingModel }, async () => ({
      vector: await embed(searchTextOf(item), 'document', item.title),
    }));
    await Item.updateOne({ _id: item._id }, { $set: { embedding: vector.vector, embeddingModel } });
    return vector.vector;
  } catch (err) {
    console.error('Could not embed item:', err.message);
    return null;
  }
};

// Recently used query vectors, so paging through results does not embed the query again.
const queryCache = new Map();
const CACHE_SIZE = 200;

export const embedQuery = async (text) => {
  const { embeddingModel } = aiConfig();
  const key = `${embeddingModel}:${text.trim().toLowerCase()}`;
  if (queryCache.has(key)) return queryCache.get(key);

  const { vector } = await tracked({ feature: 'embed-query', model: embeddingModel }, async () => ({
    vector: await embed(text, 'query'),
  }));
  queryCache.set(key, vector);
  if (queryCache.size > CACHE_SIZE) queryCache.delete(queryCache.keys().next().value);
  return vector;
};

// Both vectors are unit length, so the dot product is their cosine similarity.
export const similarity = (a, b) => {
  let sum = 0;
  for (let i = 0; i < a.length && i < b.length; i++) sum += a[i] * b[i];
  return sum;
};
