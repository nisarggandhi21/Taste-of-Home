import mongoose from 'mongoose';
const { Schema } = mongoose;

const OrderSchema = new Schema(
  {
    itemId: {
      type: String,
      required: true,
    },
    img: {
      type: String,
      required: false,
    },
    title: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    sellerId: {
      type: String,
      required: true,
    },
    buyerId: {
      type: String,
      required: true,
    },
    // Set once Stripe confirms the payment.
    isPaid: {
      type: Boolean,
      default: false,
    },
    // Set by the seller once the order has been fulfilled.
    isCompleted: {
      type: Boolean,
      default: false,
    },
    payment_intent: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

OrderSchema.index({ sellerId: 1 });
OrderSchema.index({ buyerId: 1 });
OrderSchema.index({ itemId: 1 });
OrderSchema.index({ payment_intent: 1 });

// Orders created before `isPaid` existed used `isCompleted` to mean "paid".
export const PAID_ORDER_FILTER = {
  $or: [{ isPaid: true }, { isPaid: { $exists: false }, isCompleted: true }],
};

export default mongoose.model('Order', OrderSchema);
