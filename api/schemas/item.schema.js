import { z } from 'zod';

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
  }),
});
