import nodemailer from 'nodemailer';

// Emails go out over SMTP, which every provider offers (Gmail app password, Brevo, Resend,
// SendGrid, ...). Without SMTP settings nothing is sent and the rest of the app still works.
//
//   SMTP_HOST, SMTP_PORT (default 587), SMTP_USER, SMTP_PASS, MAIL_FROM

// Messages "sent" while running the tests, newest last.
export const outbox = [];

let transport;
const getTransport = () => {
  if (transport !== undefined) return transport;

  if (process.env.NODE_ENV === 'test') {
    transport = nodemailer.createTransport({ jsonTransport: true });
  } else if (process.env.SMTP_HOST) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  } else {
    transport = null;
  }
  return transport;
};

export const isMailConfigured = () => !!getTransport();

// Resolves to true when the message was handed to the mail server.
export const sendMail = async ({ to, subject, text }) => {
  const mailer = getTransport();
  if (!mailer) {
    // In development the message is printed so links can still be followed. In production
    // it is not, because server logs are no place for password-reset links.
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[email not configured] To: ${to}\nSubject: ${subject}\n\n${text}\n`);
    } else {
      console.warn(`[email not configured] "${subject}" was not sent`);
    }
    return false;
  }

  await mailer.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER || 'Taste of Home <no-reply@localhost>',
    to,
    subject,
    text,
  });
  if (process.env.NODE_ENV === 'test') outbox.push({ to, subject, text });
  return true;
};

// Where links in emails point: the public address of the client.
export const clientUrl = (path = '') => {
  const base = process.env.CLIENT_URL || (process.env.CORS_ALLOWED_ORIGINS || '').split(',')[0];
  return `${base.replace(/\/$/, '')}${path}`;
};
