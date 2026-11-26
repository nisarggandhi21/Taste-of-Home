import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    username: z
      .string('Username is required')
      .min(3, 'Username must be at least 3 characters long'),
    email: z.email('Invalid email address'),
    password: z
      .string('Password is required')
      .min(6, 'Password must be at least 6 characters long'),
    img: z.url('Image must be a valid URL').optional(),
    location: z.string().optional(),
    isSeller: z.boolean().optional(),
    phone: z.string().optional(),
    desc: z.string().optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    username: z.string('Username is required'),
    password: z.string('Password is required'),
  }),
});
