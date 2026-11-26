// Settings for the AI features. They are optional: without GEMINI_API_KEY every AI endpoint
// answers "not set up", the client hides the AI parts, and the rest of the site is unchanged.
//
//   GEMINI_API_KEY        turns the features on
//   AI_MODEL              text and image model            (default gemini-4-hydrogen)
//   AI_EMBEDDING_MODEL    embedding model for search      (default gemini-embedding-2)
//   AI_DAILY_LIMIT        model calls allowed per day     (default 500)
//   AI_HOURLY_LIMIT       AI requests per visitor an hour (default 30)

export const isAiEnabled = () => !!process.env.GEMINI_API_KEY;

export const aiConfig = () => ({
  model: process.env.AI_MODEL || 'gemini-4-hydrogen',
  embeddingModel: process.env.AI_EMBEDDING_MODEL || 'gemini-embedding-2',
  dailyLimit: Number(process.env.AI_DAILY_LIMIT) || 500,
});

// Size of the stored search vectors. Smaller than the model's default to keep items light.
export const EMBEDDING_DIMENSIONS = 768;
