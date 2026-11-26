import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';

export const userRoom = (userId) => `user:${userId}`;

const getCookie = (header = '', name) =>
  header
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);

export const initializeSocket = (httpServer) => {
  const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
    ? process.env.CORS_ALLOWED_ORIGINS.split(',')
    : [];

  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  // A socket is identified by the same login cookie as the REST API, never by what it claims.
  io.use((socket, next) => {
    const token = getCookie(socket.handshake.headers.cookie, 'accessToken');
    if (!token) return next(new Error('You are not authenticated!'));

    jwt.verify(token, process.env.JWT_KEY, (err, payload) => {
      if (err) return next(new Error('Token is not valid!'));
      socket.data.userId = payload.id;
      next();
    });
  });

  // Messages are emitted by the REST API to the receiver's room (see message.controller.js).
  io.on('connection', (socket) => {
    socket.join(userRoom(socket.data.userId));
  });

  return io;
};
