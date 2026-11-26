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

const newPassword = z
  .string('Password is required')
  .min(6, 'Password must be at least 6 characters long')
  .max(200, 'Password is too long');
const token = z.string('This link is not valid').min(20, 'This link is not valid').max(200);

export const verifyEmailSchema = z.object({ body: z.object({ token }) });

export const forgotPasswordSchema = z.object({
  body: z.object({ email: z.email('Invalid email address') }),
});

export const resetPasswordSchema = z.object({
  body: z.object({ token, password: newPassword }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string('Current password is required'),
    newPassword,
  }),
});

// Only the fields a user may change about themselves. An empty string clears a field.
export const updateProfileSchema = z.object({
  body: z.object({
    img: z.union([z.url('Image must be a valid URL'), z.literal('')]).optional(),
    location: z.string().trim().max(80, 'Location is too long').optional(),
    phone: z.string().trim().max(20, 'Phone number is too long').optional(),
    desc: z.string().trim().max(1000, 'Description is too long').optional(),
  }),
});
