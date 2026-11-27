// Emails about an order: to the buyer and the cook when it is placed, to the buyer each time
// it moves forward, and to both when it is cancelled.
//
// Every function here resolves once the emails were handed to the mail server (a serverless
// host stops the code as soon as the response is sent, so they cannot be sent "later"), and
// none of them ever throws: an order must go through even when email is down.
import { effectiveStatus, orderLines } from '../models/order.model.js';
import User from '../models/user.model.js';
import { clientUrl, trySendMail } from './mailer.js';

const rupees = (amount) => `₹ ${Number(amount).toLocaleString('en-IN')}`;
// Short enough to read out on the phone; the same reference is shown on the orders page.
export const orderRef = (order) => `#${String(order._id).slice(-6).toUpperCase()}`;

// Names, dish titles and reasons are typed by users and end up inside HTML.
const escapeHtml = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]
  );

// Builds the text and the HTML of one email from the same description:
//   { heading, intro: [paragraph], lines, total, details: [[label, value]], action, outro }
const render = ({ heading, intro = [], lines = [], total, details = [], action, outro }) => {
  const text = [
    heading,
    '',
    ...intro,
    ...(lines.length
      ? ['', ...lines.map((line) => `  ${line.quantity} x ${line.title}  ${rupees(line.sum)}`)]
      : []),
    ...(total !== undefined ? [`  Total: ${rupees(total)}`] : []),
    ...(details.length ? ['', ...details.map(([label, value]) => `${label}: ${value}`)] : []),
    ...(action ? ['', `${action.label}: ${action.url}`] : []),
    ...(outro ? ['', outro] : []),
    '',
    'Taste of Home',
  ].join('\n');

  const cell = 'padding:8px 0;border-bottom:1px solid #eee;';
  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f6f3f0;font-family:Arial,Helvetica,sans-serif;color:#222;">
<div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px;">
<p style="margin:0 0 16px;color:#c9410d;font-weight:bold;">Taste of Home</p>
<h1 style="margin:0 0 16px;font-size:20px;">${escapeHtml(heading)}</h1>
${intro.map((paragraph) => `<p style="margin:0 0 12px;line-height:1.5;">${escapeHtml(paragraph)}</p>`).join('\n')}
${
  lines.length
    ? `<table style="width:100%;border-collapse:collapse;margin:8px 0 16px;">
${lines
  .map(
    (line) =>
      `<tr><td style="${cell}">${line.quantity} × ${escapeHtml(line.title)}</td><td style="${cell}text-align:right;white-space:nowrap;">${rupees(line.sum)}</td></tr>`
  )
  .join('\n')}
${total !== undefined ? `<tr><td style="padding:8px 0;font-weight:bold;">Total</td><td style="padding:8px 0;font-weight:bold;text-align:right;white-space:nowrap;">${rupees(total)}</td></tr>` : ''}
</table>`
    : ''
}
${details.map(([label, value]) => `<p style="margin:0 0 6px;line-height:1.5;"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`).join('\n')}
${action ? `<p style="margin:20px 0 8px;"><a href="${escapeHtml(action.url)}" style="display:inline-block;background:#c9410d;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:bold;">${escapeHtml(action.label)}</a></p>` : ''}
${outro ? `<p style="margin:16px 0 0;color:#666;font-size:13px;line-height:1.5;">${escapeHtml(outro)}</p>` : ''}
</div>
</body></html>`;

  return { text, html };
};

const linesOf = (order) =>
  orderLines(order).map((line) => ({
    title: line.title,
    quantity: line.quantity,
    sum: line.unitPrice * line.quantity,
  }));

const addressOf = (order) => {
  const address = order.deliveryAddress;
  if (!address) return [];
  return [
    ['Deliver to', `${address.name}, ${address.line1}, ${address.city} ${address.pincode}`],
    ['Phone', address.phone],
    ...(address.notes ? [['Note for the cook', address.notes]] : []),
  ];
};

// The two people on an order. Either can be missing (a deleted account).
const peopleOf = async (order) => {
  const users = await User.find({ _id: { $in: [order.buyerId, order.sellerId] } }).select(
    'username email'
  );
  const byId = new Map(users.map((user) => [String(user._id), user]));
  return { buyer: byId.get(order.buyerId), seller: byId.get(order.sellerId) };
};

const send = (user, subject, description) =>
  user?.email ? trySendMail({ to: user.email, subject, ...render(description) }) : false;

const ordersAction = (label) => ({ label, url: clientUrl('/orders') });

// Runs one of the notifications below without ever failing the caller.
const safely = (work) => async (order) => {
  try {
    await work(order);
  } catch (err) {
    console.error('Could not send order emails:', err.message);
  }
};

// Payment went through: a receipt for the buyer, a new order for the cook.
export const notifyOrderPlaced = safely(async (order) => {
  const { buyer, seller } = await peopleOf(order);
  const ref = orderRef(order);
  const lines = linesOf(order);

  await Promise.all([
    send(buyer, `Order ${ref} placed: ${order.title}`, {
      heading: 'Thank you, your order is placed',
      intro: [
        `Hi ${buyer?.username}, we have received your payment for order ${ref}.`,
        `${seller?.username || 'The cook'} will confirm it shortly. We will email you as it moves along.`,
      ],
      lines,
      total: order.price,
      details: addressOf(order),
      action: ordersAction('Track your order'),
      outro:
        'You can cancel for a full refund until the cook accepts the order. If you have an allergy, message the cook to confirm the ingredients.',
    }),
    send(seller, `New order ${ref}: ${order.title}`, {
      heading: 'You have a new order',
      intro: [
        `Hi ${seller?.username}, ${buyer?.username || 'a buyer'} has paid for order ${ref}.`,
        'Accept it to let them know you have started.',
      ],
      lines,
      total: order.price,
      details: addressOf(order),
      action: ordersAction('Open your orders'),
    }),
  ]);
});

const STAGE_NEWS = {
  accepted: {
    subject: 'was accepted',
    heading: 'Your order was accepted',
    line: (cook) => `${cook} has accepted your order and will start cooking soon.`,
  },
  preparing: {
    subject: 'is being prepared',
    heading: 'Your food is being prepared',
    line: (cook) => `${cook} is cooking your order now.`,
  },
  out_for_delivery: {
    subject: 'is on its way',
    heading: 'Your order is on its way',
    line: (cook) => `${cook} has sent your order out for delivery.`,
  },
  delivered: {
    subject: 'was delivered',
    heading: 'Your order was delivered',
    line: (cook) => `${cook} marked your order as delivered. Enjoy your meal!`,
  },
};

// The cook moved the order forward: tell the buyer.
export const notifyOrderStatus = safely(async (order) => {
  const news = STAGE_NEWS[effectiveStatus(order)];
  if (!news) return;
  const { buyer, seller } = await peopleOf(order);
  const delivered = effectiveStatus(order) === 'delivered';

  await send(buyer, `Order ${orderRef(order)} ${news.subject}`, {
    heading: news.heading,
    intro: [`Hi ${buyer?.username}, ${news.line(seller?.username || 'The cook')}`],
    lines: linesOf(order),
    total: order.price,
    action: delivered
      ? { label: 'Leave a review', url: clientUrl(`/item/${orderLines(order)[0].itemId}`) }
      : ordersAction('Track your order'),
    outro: delivered ? 'A short review helps the cook and the next buyer.' : undefined,
  });
});

const CANCELLED_BY = {
  buyer: { buyer: 'You cancelled this order.', seller: 'The buyer cancelled this order.' },
  seller: { buyer: 'The cook cancelled this order.', seller: 'You cancelled this order.' },
  admin: {
    buyer: 'Taste of Home cancelled this order.',
    seller: 'Taste of Home cancelled this order.',
  },
};

// The order was cancelled and the payment refunded: tell both sides.
export const notifyOrderCancelled = safely(async (order) => {
  const { buyer, seller } = await peopleOf(order);
  const ref = orderRef(order);
  const who = CANCELLED_BY[order.cancelledBy] || {
    buyer: 'This order was cancelled.',
    seller: 'This order was cancelled.',
  };
  const reason = order.cancelReason ? [['Reason', order.cancelReason]] : [];
  const lines = linesOf(order);

  await Promise.all([
    send(buyer, `Order ${ref} cancelled and refunded`, {
      heading: 'Your order was cancelled',
      intro: [
        `Hi ${buyer?.username}. ${who.buyer}`,
        `${rupees(order.price)} is being refunded to the way you paid. Banks usually take 5 to 10 days to show it.`,
      ],
      lines,
      total: order.price,
      details: reason,
      action: ordersAction('See your orders'),
    }),
    send(seller, `Order ${ref} was cancelled`, {
      heading: 'An order was cancelled',
      intro: [
        `Hi ${seller?.username}. ${who.seller}`,
        'The buyer has been refunded in full. There is nothing more to prepare for this order.',
      ],
      lines,
      total: order.price,
      details: reason,
      action: ordersAction('Open your orders'),
    }),
  ]);
});
