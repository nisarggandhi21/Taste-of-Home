import { askAssistant } from '../ai/assistant.js';
import { isAiEnabled } from '../ai/config.js';
import { draftListing } from '../ai/listingDraft.js';
import { getReviewSummary } from '../ai/reviewSummary.js';
import { assertAiAvailable } from '../ai/usage.js';
import { readUser } from '../middleware/jwt.js';
import createError from '../utils/createError.js';

// Lets the client decide whether to show the AI parts of the site at all.
export const getStatus = (req, res) => {
  res.status(200).send({ enabled: isAiEnabled() });
};

// Problems on the model's side reach the visitor as one plain message, never as a stack
// trace or a provider error.
const asAiError = (err) =>
  err.status
    ? err
    : createError(502, 'The AI helper is not available right now. Please try again.');

export const postListingDraft = async (req, res, next) => {
  try {
    if (!req.isSeller) return next(createError(403, 'Only sellers can draft listings'));
    await assertAiAvailable();
    const draft = await draftListing({ imageUrl: req.body.imageUrl, userId: req.userId });
    res.status(200).send(draft);
  } catch (err) {
    if (!err.status) console.error('Listing draft failed:', err.message);
    next(asAiError(err));
  }
};

export const postAssistant = async (req, res, next) => {
  try {
    await assertAiAvailable();
    const answer = await askAssistant({
      messages: req.body.messages,
      userId: readUser(req)?.id,
    });
    res.status(200).send(answer);
  } catch (err) {
    if (!err.status) console.error('Assistant failed:', err.message);
    next(asAiError(err));
  }
};

export const getItemReviewSummary = async (req, res, next) => {
  try {
    if (!/^[0-9a-fA-F]{24}$/.test(req.params.itemId)) {
      return next(createError(400, 'Item id is not valid'));
    }
    res.status(200).send({ summary: await getReviewSummary(req.params.itemId) });
  } catch (err) {
    next(err);
  }
};
