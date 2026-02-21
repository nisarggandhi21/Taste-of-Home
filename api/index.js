import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { initializeSocket } from './socket.js';
import authRoute from './routes/auth.route.js';
import conversationRoutes from './routes/conversation.route.js';
import itemRoutes from './routes/item.route.js';
import messageRoutes from './routes/message.route.js';
import orderRoutes from './routes/order.route.js';
import reviewRoutes from './routes/review.route.js';
import userRoute from './routes/user.route.js';
import errorHandler from './middleware/errorHandler.js';
import { validateEnv } from './utils/validateEnv.js';

const app = express();
dotenv.config();
validateEnv();
const httpServer = createServer(app);
const io = initializeSocket(httpServer);

mongoose.set('strictQuery', true);
mongoose.set('debug', true);

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
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(morgan('dev'));
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

if (process.env.NODE_ENV !== 'production') {
  httpServer.listen(port, () => {
    console.log(`Backend server is running on port ${port}!`);
  });
}

export default app;
