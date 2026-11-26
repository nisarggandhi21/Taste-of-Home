import AiCall from '../models/aiCall.model.js';
import createError from '../utils/createError.js';
import { aiConfig, isAiEnabled } from './config.js';

const startOfToday = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

// Refuses when AI is off or today's allowance is used up. The allowance protects a free
// quota from one busy day (or one abusive visitor).
export const assertAiAvailable = async () => {
  if (!isAiEnabled()) throw createError(503, 'AI features are not set up on this site.');
  const usedToday = await AiCall.countDocuments({ createdAt: { $gte: startOfToday() } });
  if (usedToday >= aiConfig().dailyLimit) {
    throw createError(
      429,
      'The AI helper has reached its limit for today. Please try again tomorrow.'
    );
  }
};

// Runs one model call and records how it went. `run` resolves to an object with a `usage`
// field ({ inputTokens, outputTokens }); everything it resolves to is passed through.
export const tracked = async ({ feature, model, userId }, run) => {
  const started = Date.now();
  try {
    const result = await run();
    await AiCall.create({
      feature,
      model,
      userId,
      ok: true,
      ms: Date.now() - started,
      inputTokens: result?.usage?.inputTokens || 0,
      outputTokens: result?.usage?.outputTokens || 0,
    }).catch(() => {});
    return result;
  } catch (err) {
    await AiCall.create({
      feature,
      model,
      userId,
      ok: false,
      ms: Date.now() - started,
      error: String(err.message).slice(0, 300),
    }).catch(() => {});
    throw err;
  }
};
