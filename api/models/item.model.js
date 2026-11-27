import mongoose from 'mongoose';
import { ALLERGENS, DIETS } from '../utils/food.js';
const { Schema } = mongoose;

const itemSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    desc: {
      type: String,
      required: true,
    },
    totalStars: {
      type: Number,
      default: 0,
    },
    starNumber: {
      type: Number,
      default: 0,
    },
    cat: {
      type: String,
      required: true,
    },
    // Missing on items created before dietary information was collected.
    diet: {
      type: String,
      enum: DIETS,
    },
    // No default on purpose: a missing list means "not declared", an empty list means the
    // seller declared that the item contains none of the listed allergens.
    allergens: {
      type: [{ type: String, enum: ALLERGENS }],
      default: undefined,
    },
    price: {
      type: Number,
      required: true,
    },
    cover: {
      type: String,
      required: true,
    },
    images: {
      type: [String],
      required: false,
    },
    shortTitle: {
      type: String,
      required: true,
    },
    shortDesc: {
      type: String,
      required: true,
    },
    deliveryTime: {
      type: Number,
      required: true,
    },
    features: {
      type: [String],
      required: false,
    },
    sales: {
      type: Number,
      default: 0,
    },
    // Search vector for this dish (see ai/embeddings.js). Left out of normal reads.
    embedding: {
      type: [Number],
      default: undefined,
      select: false,
    },
    embeddingModel: {
      type: String,
      select: false,
    },
    // AI summary of the reviews, with the number of reviews it was written from.
    reviewSummary: {
      type: new Schema(
        {
          text: String,
          pros: [String],
          cons: [String],
          reviewCount: Number,
          generatedAt: Date,
        },
        { _id: false }
      ),
      default: undefined,
    },
    // Sellers can pause an item without deleting it. Missing means available.
    isAvailable: {
      type: Boolean,
      default: true,
    },
    // Set when an administrator takes the listing down. The seller cannot make it available
    // again until it is restored. The reason is shown to the seller only.
    takenDownAt: Date,
    takenDownReason: String,
    // True while an administrator's action (a takedown, or suspending the seller) is what
    // keeps an otherwise available listing hidden, so lifting it brings the listing back.
    heldAvailable: Boolean,
  },
  {
    timestamps: true,
  }
);

itemSchema.index({ userId: 1 });
itemSchema.index({ cat: 1 });
itemSchema.index({ diet: 1 });

// Left out when a listing is shown to anybody but its seller.
export const PUBLIC_ITEM_FIELDS = '-takenDownReason -heldAvailable';

export default mongoose.model('Item', itemSchema);
