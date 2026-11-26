// Gives every dish a search vector, so dishes created before the AI features were turned on
// (or with another embedding model) can be found by meaning.
//
//   npm run ai:reindex
//
// Needs MONGO and GEMINI_API_KEY in the environment (or in .env). Safe to run again: dishes
// that already have a vector from the current model are skipped.
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Item from '../../models/item.model.js';
import { aiConfig, isAiEnabled } from '../config.js';
import { embedItem } from '../embeddings.js';

dotenv.config();
if (!process.env.MONGO || !isAiEnabled()) {
  console.error('Set MONGO and GEMINI_API_KEY first.');
  process.exit(1);
}

// Stay well inside a free tier's requests-per-minute limit.
const PAUSE_MS = Number(process.env.AI_REINDEX_PAUSE_MS) || 1500;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

await mongoose.connect(process.env.MONGO);
const { embeddingModel } = aiConfig();
const items = await Item.find({
  $or: [{ embedding: { $exists: false } }, { embeddingModel: { $ne: embeddingModel } }],
});
console.log(`${items.length} dishes need a search vector (model: ${embeddingModel}).`);

let done = 0;
for (const item of items) {
  if (await embedItem(item)) done += 1;
  else console.log(`  skipped: ${item.title}`);
  await pause(PAUSE_MS);
}
console.log(`Done: ${done} of ${items.length} indexed.`);
await mongoose.disconnect();
