import { z } from 'zod';
import { ALLERGENS, DIETS } from '../utils/food.js';

export const createItemSchema = z.object({
  body: z.object({
    title: z.string('Title is required').min(1, 'Title cannot be empty'),
    desc: z
      .string('Description is required')
      .min(10, 'Description must be at least 10 characters long'),
    cat: z.string('Category is required').min(1, 'Category is required'),
    price: z.number('Price must be a number').positive('Price must be a positive number'),
    cover: z.url('Cover image is required and must be a valid URL'),
    images: z.array(z.url('Image must be a valid URL')).optional(),
    shortTitle: z
      .string('Short title is required')
      .max(50, 'Short title must be under 50 characters'),
    shortDesc: z
      .string('Short description is required')
      .max(100, 'Short description must be under 100 characters'),
    deliveryTime: z
      .number('Delivery time must be a number')
      .int('Delivery time must be a whole number')
      .positive('Delivery time must be a positive integer'),
    features: z.array(z.string()).optional(),
    diet: z.enum(DIETS, 'Please say whether this item is veg, egg or non-veg'),
    allergens: z
      .array(z.enum(ALLERGENS, 'Unknown allergen'), 'Please declare the allergens (or none)')
      .max(ALLERGENS.length),
  }),
});

// Query-string values arrive as strings; an empty value means "not set".
const optional = (schema) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional());

export const availabilitySchema = z.object({
  body: z.object({
    isAvailable: z.boolean('isAvailable must be true or false'),
  }),
});

export const PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 100;

// "nuts,dairy" -> ['nuts', 'dairy']
const list = (schema) =>
  z.preprocess(
    (value) => (typeof value === 'string' ? value.split(',').filter(Boolean) : value),
    schema
  );

export const itemsQuerySchema = z.object({
  userId: optional(z.string('userId must be text').max(100)),
  cat: optional(z.string('Category must be text').max(50)),
  search: optional(z.string('Search must be text').max(100, 'Search is too long')),
  location: optional(z.string('Location must be text').max(80, 'Location is too long')),
  min: optional(z.coerce.number('Minimum price must be a number').nonnegative()),
  max: optional(z.coerce.number('Maximum price must be a number').nonnegative()),
  diet: optional(z.enum(DIETS, 'Unknown diet')),
  // Only items whose seller declared that they contain none of these allergens.
  freeFrom: optional(list(z.array(z.enum(ALLERGENS, 'Unknown allergen')).max(ALLERGENS.length))),
  sort: optional(
    z.enum(
      ['relevance', 'sales', 'createdAt', 'rating', 'price', 'priceAsc'],
      'Unknown sort option'
    )
  ).default('createdAt'),
  page: optional(z.coerce.number('Page must be a number').int().min(1)).default(1),
  limit: optional(
    z.coerce.number('Limit must be a number').int().min(1).max(MAX_PAGE_SIZE)
  ).default(PAGE_SIZE),
});
