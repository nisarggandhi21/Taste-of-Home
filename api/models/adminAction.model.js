import mongoose from 'mongoose';
const { Schema } = mongoose;

// A record of everything an administrator did, kept so that a suspension, takedown or refund
// can always be traced to a person and a reason.
const AdminActionSchema = new Schema(
  {
    adminId: { type: String, required: true },
    adminName: { type: String, required: true },
    action: {
      type: String,
      required: true,
      enum: ['suspend_user', 'unsuspend_user', 'take_down_item', 'restore_item', 'refund_order'],
    },
    targetId: { type: String, required: true },
    // What the target was called at the time: it may be renamed or deleted later.
    targetLabel: { type: String, required: true },
    reason: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AdminActionSchema.index({ createdAt: -1 });

export default mongoose.model('AdminAction', AdminActionSchema);
