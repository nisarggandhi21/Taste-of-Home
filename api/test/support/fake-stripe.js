// In-memory stand-in for the Stripe SDK. Only the calls the API makes are implemented.
// Webhook signature checking is delegated to the real SDK, so that code path is the real one.
import RealStripe from 'stripe';

// Payment intents created by the API, keyed by id. Tests flip `status` to simulate a payment.
export const paymentIntents = new Map();

// Refunds issued by the API, in order.
export const refunds = [];

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
    this.refunds = {
      // Like Stripe, a repeated request with the same idempotency key returns the first refund.
      create: async (params, options = {}) => {
        const intent = paymentIntents.get(params.payment_intent);
        if (!intent) throw new Error(`No such payment_intent: ${params.payment_intent}`);
        if (intent.status !== 'succeeded') throw new Error('This payment has not succeeded');
        const repeat = refunds.find(
          (r) => r.idempotencyKey && r.idempotencyKey === options.idempotencyKey
        );
        if (repeat) return repeat;
        const refund = {
          id: `re_test_${refunds.length + 1}`,
          payment_intent: intent.id,
          amount: intent.amount,
          idempotencyKey: options.idempotencyKey,
        };
        refunds.push(refund);
        return refund;
      },
    };
  }
}
