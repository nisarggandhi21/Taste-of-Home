import { z } from 'zod';

const envSchema = z.object({
  MONGO: z.string().min(1, 'MONGO URL is required'),
  JWT_KEY: z.string().min(1, 'JWT_KEY is required'),
  STRIPE_SECRET_KEY: z.string().min(1, 'STRIPE_SECRET_KEY is required'),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  CORS_URL: z.string().optional(),
  CORS_ALLOWED_ORIGINS: z.string().min(1, 'CORS_ALLOWED_ORIGINS is required'),
  PORT: z.string().optional(),
  TRUST_PROXY: z.string().optional(),
  // Public address of the client, used for links in emails. Defaults to the first allowed origin.
  CLIENT_URL: z.string().optional(),
  // Email is optional: without SMTP_HOST nothing is sent.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().optional(),
  // Optional: all three turn on signed image uploads.
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  // Optional: turns on the AI features (see ai/config.js).
  GEMINI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().optional(),
  AI_EMBEDDING_MODEL: z.string().optional(),
  AI_DAILY_LIMIT: z.string().optional(),
  AI_HOURLY_LIMIT: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
});

export const validateEnv = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error(
      '❌ Invalid environment variables:',
      JSON.stringify(result.error.format(), null, 2)
    );
    process.exit(1);
  }
};
