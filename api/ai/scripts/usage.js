// Prints how the AI features were used over the last 7 days: calls, failures, speed, tokens.
//
//   npm run ai:usage
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import AiCall from '../../models/aiCall.model.js';

dotenv.config();
if (!process.env.MONGO) {
  console.error('Set MONGO first.');
  process.exit(1);
}

await mongoose.connect(process.env.MONGO);
const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
const rows = await AiCall.aggregate([
  { $match: { createdAt: { $gte: since } } },
  {
    $group: {
      _id: { feature: '$feature', model: '$model' },
      calls: { $sum: 1 },
      failed: { $sum: { $cond: ['$ok', 0, 1] } },
      averageMs: { $avg: '$ms' },
      slowestMs: { $max: '$ms' },
      inputTokens: { $sum: '$inputTokens' },
      outputTokens: { $sum: '$outputTokens' },
    },
  },
  { $sort: { calls: -1 } },
]);

console.table(
  rows.map((row) => ({
    feature: row._id.feature,
    model: row._id.model,
    calls: row.calls,
    failed: row.failed,
    'avg ms': Math.round(row.averageMs),
    'slowest ms': row.slowestMs,
    'input tokens': row.inputTokens,
    'output tokens': row.outputTokens,
  }))
);
if (rows.length === 0) console.log('No AI calls in the last 7 days.');
await mongoose.disconnect();
