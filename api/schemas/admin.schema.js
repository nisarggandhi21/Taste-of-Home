import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'That id is not valid');

// Every action that takes something away from a user has to say why.
export const reasonSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    reason: z
      .string('A reason is required')
      .trim()
      .min(3, 'A reason is required')
      .max(300, 'Reason is too long'),
  }),
});

export const idSchema = z.object({ params: z.object({ id: objectId }) });

export const listQuerySchema = z.object({
  search: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  // Users: "suspended". Listings: "taken_down". Orders: an order status.
  state: z.string().max(30).optional(),
});
