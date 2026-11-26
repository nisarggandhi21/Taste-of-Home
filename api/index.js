import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import { createServer } from 'http';
import mongoose from 'mongoose';
import morgan from 'morgan';
import errorHandler from './middleware/errorHandler.js';
import authRoute from './routes/auth.route.js';
import conversationRoutes from './routes/conversation.route.js';
import itemRoutes from './routes/item.route.js';
import messageRoutes from './routes/message.route.js';
import { stripeWebhook } from './controllers/order.controller.js';
import orderRoutes from './routes/order.route.js';
import reviewRoutes from './routes/review.route.js';
import userRoute from './routes/user.route.js';
import { initializeSocket } from './socket.js';
import createError from './utils/createError.js';
import { validateEnv } from './utils/validateEnv.js';

const app = express();
dotenv.config();
validateEnv();
// Behind a reverse proxy the client address is in X-Forwarded-For; rate limiting needs it.
if (process.env.TRUST_PROXY || process.env.VERCEL) {
  app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);
}
const httpServer = createServer(app);
const io = initializeSocket(httpServer);
app.set('io', io);

mongoose.set('strictQuery', true);

const connect = async () => {
  try {
    await mongoose.connect(process.env.MONGO);
    console.log('Connected to database');
  } catch (error) {
    console.log('Error connecting to database: ', error);
  }
};

const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
  ? process.env.CORS_ALLOWED_ORIGINS.split(',')
  : [];

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Requests from other websites are refused outright, which is also what stops them
      // from using a visitor's login cookie (CSRF). Requests with no origin (curl, mobile
      // apps, Stripe webhooks) are not sent by a browser page and are allowed.
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(createError(403, 'Requests from this origin are not allowed'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));
// Stripe signs the raw request body, so this route must be registered before express.json().
app.post('/api/orders/webhook', express.raw({ type: 'application/json' }), stripeWebhook);
app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.use('/api/auth', authRoute);
app.use('/api/users', userRoute);
app.use('/api/items', itemRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);

app.use(errorHandler);

connect();

const port = process.env.PORT || 8800;

// Vercel invokes the exported app itself; everywhere else we run a long-lived server.
if (!process.env.VERCEL) {
  httpServer.listen(port, () => {
    console.log(`Backend server is running on port ${port}!`);
  });
}

// The named export is for the tests; Vercel uses the default export.
export { httpServer };
export default app;
