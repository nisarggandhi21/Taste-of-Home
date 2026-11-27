// Boots the real API against a throwaway in-memory MongoDB, the Stripe fake and the AI fake.
// The AI features stay off unless a test passes env: { GEMINI_API_KEY: ... }.
import { once } from 'node:events';
import { register } from 'node:module';
import { MongoMemoryServer } from 'mongodb-memory-server-core';

export const CLIENT_ORIGIN = 'http://localhost:5173';
export const JWT_KEY = 'test-jwt-key';
export const WEBHOOK_SECRET = 'whsec_test_secret';

export const startTestServer = async ({ port = 0, env = {} } = {}) => {
  const mongod = await MongoMemoryServer.create();

  Object.assign(process.env, {
    MONGO: mongod.getUri('tasteofhome_test'),
    JWT_KEY,
    STRIPE_SECRET_KEY: 'sk_test_fake',
    STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
    CORS_ALLOWED_ORIGINS: CLIENT_ORIGIN,
    PORT: String(port),
    NODE_ENV: 'test',
    ...env,
  });

  // Must happen before the API (and therefore `stripe`) is imported.
  register('./stripe-hooks.js', import.meta.url);

  const { default: app, httpServer, config } = await import('../../index.js');
  const { default: mongoose } = await import('mongoose');
  await mongoose.connection.asPromise();

  // On Vercel the API does not listen by itself; the platform calls the exported app.
  const listens = !process.env.VERCEL;
  if (listens && !httpServer.listening) await once(httpServer, 'listening');

  return {
    app,
    httpServer,
    // What the module tells Vercel about itself.
    config,
    baseUrl: listens ? `http://localhost:${httpServer.address().port}` : null,
    db: mongoose.connection.db,
    stop: async () => {
      // Live message streams stay open on purpose; they must not keep the server from closing.
      httpServer.closeAllConnections();
      if (httpServer.listening) await new Promise((resolve) => httpServer.close(resolve));
      await mongoose.disconnect();
      await mongod.stop();
    },
  };
};
