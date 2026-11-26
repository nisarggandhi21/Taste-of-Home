import mongoose from 'mongoose';
const { Schema } = mongoose;

// One row per call to the AI model: what it was for, how long it took, what it used.
// This is what the daily limit and the usage report are worked out from.
const AiCallSchema = new Schema(
  {
    feature: { type: String, required: true },
    model: { type: String, required: true },
    ok: { type: Boolean, required: true },
    ms: { type: Number, required: true },
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    userId: { type: String },
    error: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AiCallSchema.index({ createdAt: -1 });

export default mongoose.model('AiCall', AiCallSchema);
