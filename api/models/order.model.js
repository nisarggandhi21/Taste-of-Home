import mongoose from 'mongoose';
const { Schema } = mongoose;

// The stages a paid order moves through, in order. The seller advances one stage at a time.
export const ORDER_STAGES = ['placed', 'accepted', 'preparing', 'out_for_delivery', 'delivered'];
export const ORDER_STATUSES = ['pending_payment', ...ORDER_STAGES, 'cancelled'];

const AddressSchema = new Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    line1: { type: String, required: true },
    city: { type: String, required: true },
    pincode: { type: String, required: true },
    notes: { type: String },
  },
  { _id: false }
);

// One dish on an order.
const LineSchema = new Schema(
  {
    itemId: { type: String, required: true },
    title: { type: String, required: true },
    img: { type: String },
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const OrderSchema = new Schema(
  {
    // The dishes ordered. Orders created before carts existed have no lines; use
    // orderLines() to read either kind.
    lines: {
      type: [LineSchema],
      default: undefined,
    },
    // The fields below describe the order as a whole. On a one-dish order they describe
    // that dish, which is how orders were stored before carts existed.
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
    // Total charged: unitPrice x quantity.
    price: {
      type: Number,
      required: true,
    },
    unitPrice: {
      type: Number,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    deliveryAddress: {
      type: AddressSchema,
    },
    sellerId: {
      type: String,
      required: true,
    },
    buyerId: {
      type: String,
      required: true,
    },
    // No default on purpose: orders created before this field existed must stay without it,
    // so that effectiveStatus() can work their status out from the two flags below.
    status: {
      type: String,
      enum: ORDER_STATUSES,
    },
    statusHistory: {
      type: [{ _id: false, status: String, at: Date }],
      default: undefined,
    },
    // Set once Stripe confirms the payment.
    isPaid: {
      type: Boolean,
      default: false,
    },
    // Set once the order has been delivered.
    isCompleted: {
      type: Boolean,
      default: false,
    },
    cancelledBy: {
      type: String,
      enum: ['buyer', 'seller'],
    },
    cancelReason: {
      type: String,
    },
    refundId: {
      type: String,
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
OrderSchema.index({ 'lines.itemId': 1 });
OrderSchema.index({ payment_intent: 1 });

// Orders created before `isPaid` existed used `isCompleted` to mean "paid".
export const PAID_ORDER_FILTER = {
  $or: [{ isPaid: true }, { isPaid: { $exists: false }, isCompleted: true }],
};

// Status of any order, including ones created before the `status` field existed.
export const effectiveStatus = (order) => {
  if (order.status) return order.status;
  if (order.isCompleted) return 'delivered';
  return order.isPaid ? 'placed' : 'pending_payment';
};

// The dishes on any order, including ones created before carts existed.
export const orderLines = (order) =>
  order.lines?.length
    ? order.lines.map((line) => ({
        itemId: line.itemId,
        title: line.title,
        img: line.img,
        unitPrice: line.unitPrice,
        quantity: line.quantity,
      }))
    : [
        {
          itemId: order.itemId,
          title: order.title,
          img: order.img,
          unitPrice: order.unitPrice ?? order.price / (order.quantity || 1),
          quantity: order.quantity || 1,
        },
      ];

// Matches orders that include the given item, old or new.
export const includesItem = (itemId) => ({
  $or: [{ itemId: String(itemId) }, { 'lines.itemId': String(itemId) }],
});

export const nextStage = (status) => {
  const index = ORDER_STAGES.indexOf(status);
  return index === -1 ? undefined : ORDER_STAGES[index + 1];
};

export default mongoose.model('Order', OrderSchema);
