import { z } from 'zod';

export const listingDraftSchema = z.object({
  body: z.object({
    imageUrl: z.url('A photo is required').max(500),
  }),
});

export const assistantSchema = z.object({
  body: z.object({
    messages: z
      .array(
        z.object({
          role: z.enum(['user', 'assistant'], 'Unknown message role'),
          text: z
            .string('Message text is required')
            .trim()
            .min(1, 'Message cannot be empty')
            .max(500, 'Message is too long'),
        }),
        'Messages are required'
      )
      .min(1, 'Messages are required')
      .max(12, 'This conversation is too long. Please start a new one.')
      .refine((messages) => messages.at(-1)?.role === 'user', 'The last message must be yours'),
  }),
});
