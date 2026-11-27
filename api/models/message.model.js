import mongoose from 'mongoose';
const { Schema } = mongoose;

const MessageSchema = new Schema(
  {
    conversationId: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    desc: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

MessageSchema.index({ conversationId: 1 });
// Live delivery looks for the newest messages (see realtime/hub.js).
MessageSchema.index({ createdAt: 1 });

export default mongoose.model('Message', MessageSchema);
