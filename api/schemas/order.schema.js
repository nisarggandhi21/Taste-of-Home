import { z } from 'zod';
import { ORDER_STAGES } from '../models/order.model.js';

export const MAX_QUANTITY = 20;

const text = (label, min, max) =>
  z
    .string(`${label} is required`)
    .trim()
    .min(min, `${label} is too short`)
    .max(max, `${label} is too long`);

export const checkoutSchema = z.object({
  body: z.object({
    quantity: z
      .number('Quantity must be a number')
      .int('Quantity must be a whole number')
      .min(1, 'Quantity must be at least 1')
      .max(MAX_QUANTITY, `You can order at most ${MAX_QUANTITY} at a time`),
    deliveryAddress: z.object(
      {
        name: text('Name', 2, 80),
        phone: z
          .string('Phone number is required')
          .trim()
          .regex(/^\+?[0-9][0-9 -]{6,14}$/, 'Phone number is not valid'),
        line1: text('Address', 5, 200),
        city: text('City', 2, 80),
        pincode: z
          .string('Pincode is required')
          .trim()
          .regex(/^[1-9][0-9]{5}$/, 'Pincode must be 6 digits'),
        notes: z.string().trim().max(300, 'Delivery notes are too long').optional(),
      },
      'Delivery address is required'
    ),
  }),
});

export const updateStatusSchema = z.object({
  body: z.object({
    // "placed" is set by payment, never by the seller.
    status: z.enum(ORDER_STAGES.slice(1), 'Unknown order status'),
  }),
});

export const cancelSchema = z.object({
  body: z
    .object({
      reason: z.string().trim().max(300, 'Reason is too long').optional(),
    })
    .optional(),
});
