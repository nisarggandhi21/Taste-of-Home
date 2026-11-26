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
