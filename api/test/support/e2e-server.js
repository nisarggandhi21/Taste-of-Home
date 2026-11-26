// Starts the API for the browser tests in ../../e2e: in-memory database, Stripe fake, a few
// seeded records, and a small control server the tests use to simulate a successful payment.
//
//   API:      http://localhost:8800
//   Control:  http://localhost:8801   GET /ready
//                                     POST /payment-intents/:id/succeed
//                                     GET /emails?to=address   (emails the API "sent")
import http from 'node:http';
import { createClient, sampleCheckout, sampleItem } from './client.js';
import { markSucceeded } from './fake-stripe.js';
import { startTestServer } from './server.js';

const server = await startTestServer({ port: 8800 });
const { call, register } = createClient(server.baseUrl);

const must = async (...args) => {
  const res = await call(...args);
  if (res.status >= 400) throw new Error(`seed failed: ${args[0]} ${args[1]} -> ${res.status}`);
  return res;
};

const seller = await register('albert', true);
const buyer = await register('stefan');

const thali = await must('POST', '/api/items', { cookie: seller.cookie, body: sampleItem });
await must('POST', '/api/items', {
  cookie: seller.cookie,
  body: {
    ...sampleItem,
    title: 'Veg Burger',
    cat: 'burger',
    shortTitle: 'Burger',
    price: 120,
    allergens: ['gluten'],
  },
});

// A second cook in another city, with enough items to fill more than one page of results.
const puneCook = await register('pune-cook', true, 'Pune');
const puneItems = [
  {
    title: 'Chicken Biryani',
    cat: 'north',
    diet: 'nonveg',
    allergens: ['nuts', 'dairy'],
    price: 300,
  },
  ...Array.from({ length: 12 }, (_, i) => ({
    title: `Laddu Box ${i + 1}`,
    cat: 'chocolates',
    allergens: ['dairy'],
    price: 60 + i,
  })),
];
for (const body of puneItems) {
  await must('POST', '/api/items', { cookie: puneCook.cookie, body: { ...sampleItem, ...body } });
}

// Two paid orders; the first one has also been delivered by the seller.
const paidOrder = async () => {
  const path = `/api/orders/create-payment-intent/${thali.data._id}`;
  const intent = await must('POST', path, { cookie: buyer.cookie, body: sampleCheckout });
  const id = intent.data.clientSecret.split('_secret')[0];
  markSucceeded(id);
  await must('PUT', '/api/orders', { cookie: buyer.cookie, body: { payment_intent: id } });
  return id;
};
const firstIntent = await paidOrder();
await paidOrder();
const first = await server.db.collection('orders').findOne({ payment_intent: firstIntent });
for (const status of ['accepted', 'preparing', 'out_for_delivery', 'delivered']) {
  await must('PATCH', `/api/orders/${first._id}/status`, {
    cookie: seller.cookie,
    body: { status },
  });
}

const conversation = await must('POST', '/api/conversations', {
  cookie: buyer.cookie,
  body: { to: seller.id },
});
await must('POST', '/api/messages', {
  cookie: buyer.cookie,
  body: { conversationId: conversation.data.id, desc: 'Is the thali spicy?' },
});

// Imported after the server has started, so it is the same module instance the API uses.
const { outbox } = await import('../../utils/mailer.js');

http
  .createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost:8801');
    const succeed = url.pathname.match(/^\/payment-intents\/([^/]+)\/succeed$/);
    try {
      if (req.method === 'POST' && succeed) {
        markSucceeded(succeed[1]);
      } else if (url.pathname === '/emails') {
        const to = url.searchParams.get('to');
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify(outbox.filter((message) => !to || message.to === to)));
      } else if (url.pathname !== '/ready') {
        res.statusCode = 404;
      }
    } catch {
      res.statusCode = 404;
    }
    res.end();
  })
  .listen(8801, () => console.log('E2E API ready on 8800, control on 8801'));
