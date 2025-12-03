import { z } from 'zod';

const envSchema = z.object({
  MONGO: z.string().min(1, 'MONGO URL is required'),
  JWT_KEY: z.string().min(1, 'JWT_KEY is required'),
  STRIPE_SECRET_KEY: z.string().min(1, 'STRIPE_SECRET_KEY is required'),
  CORS_URL: z.string().min(1, 'CORS_URL is required'),
  PORT: z.string().optional(),
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
