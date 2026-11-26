import { z } from 'zod';

export const createReviewSchema = z.object({
  body: z.object({
    itemId: z.string('Item is required').regex(/^[0-9a-fA-F]{24}$/, 'Item id is not valid'),
    desc: z
      .string('Review text is required')
      .trim()
      .min(1, 'Review text cannot be empty')
      .max(1000, 'Review text must be under 1000 characters'),
    star: z.coerce
      .number('Rating must be a number')
      .int('Rating must be a whole number')
      .min(1, 'Rating must be between 1 and 5')
      .max(5, 'Rating must be between 1 and 5'),
  }),
});
