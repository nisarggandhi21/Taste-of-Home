import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    username: z
      .string({ required_error: 'Username is required' })
      .min(3, 'Username must be at least 3 characters long'),
    email: z.string({ required_error: 'Email is required' }).email('Invalid email address'),
    password: z
      .string({ required_error: 'Password is required' })
      .min(6, 'Password must be at least 6 characters long'),
    img: z.string().url('Image must be a valid URL').optional(),
    country: z.string().optional(),
    isSeller: z.boolean().optional(),
    phone: z.string().optional(),
    desc: z.string().optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    username: z.string({ required_error: 'Username is required' }),
    password: z.string({ required_error: 'Password is required' }),
  }),
});
