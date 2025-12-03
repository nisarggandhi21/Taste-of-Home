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

export default mongoose.model('Order', OrderSchema);
