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
    // Sellers can pause an item without deleting it. Missing means available.
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

itemSchema.index({ userId: 1 });
itemSchema.index({ cat: 1 });
itemSchema.index({ diet: 1 });

export default mongoose.model('Item', itemSchema);
