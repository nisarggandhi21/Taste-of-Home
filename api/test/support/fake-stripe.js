// In-memory stand-in for the Stripe SDK. Only the calls the API makes are implemented.
// Webhook signature checking is delegated to the real SDK, so that code path is the real one.
import RealStripe from 'stripe';

// Payment intents created by the API, keyed by id. Tests flip `status` to simulate a payment.
export const paymentIntents = new Map();

export const markSucceeded = (id) => {
  const intent = paymentIntents.get(id);
  if (!intent) throw new Error(`Unknown payment intent ${id}`);
  intent.status = 'succeeded';
};

export default class FakeStripe {
  constructor(key) {
    this.webhooks = new RealStripe(key).webhooks;
    this.paymentIntents = {
      create: async (params) => {
        const id = `pi_test_${paymentIntents.size + 1}`;
        paymentIntents.set(id, { id, ...params, status: 'requires_payment_method' });
        return { id, client_secret: `${id}_secret_test` };
      },
      retrieve: async (id) => {
        const intent = paymentIntents.get(id);
        if (!intent) throw new Error(`No such payment_intent: ${id}`);
        return { ...intent };
      },
    };
  }
}
