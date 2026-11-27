// The database connection, made in a way that suits serverless hosting.
//
// There the API is started afresh many times a day, and a start can coincide with a slow or
// failed connection. Requests therefore wait for the connection (see requireDb) instead of
// running into it half-made, and a failed attempt is tried again by the next request instead
// of leaving that copy of the API broken for as long as it lives.
import mongoose from 'mongoose';
import createError from './createError.js';

// How long a request waits for the database before giving up with a clear answer. Well
// inside the host's own time limit for a request.
const WAIT_MS = Number(process.env.DB_WAIT_MS) || 8000;

const OPTIONS = {
  serverSelectionTimeoutMS: WAIT_MS,
  // Each copy of the API holds its own connections, and the database has a limit on them.
  maxPoolSize: 10,
};

let everConnected = false;
let attempt = null;

const waitForReconnect = () =>
  new Promise((resolve, reject) => {
    const { connection } = mongoose;
    const timer = setTimeout(() => {
      connection.off('connected', onConnected);
      reject(new Error('The database connection did not come back in time'));
    }, WAIT_MS);
    const onConnected = () => {
      clearTimeout(timer);
      resolve();
    };
    connection.once('connected', onConnected);
  });

// Resolves once the database can be used. Rejects when it cannot be reached in time.
export const connectDb = () => {
  if (mongoose.connection.readyState === 1) return Promise.resolve();

  // Connected before and lost it: the driver reconnects by itself, so wait for that.
  if (everConnected) return waitForReconnect();

  // Never connected: make the first connection, or try again after a failed attempt.
  // Requests that arrive meanwhile share the same attempt.
  attempt ||= mongoose
    .connect(process.env.MONGO, OPTIONS)
    .then(() => {
      everConnected = true;
    })
    .finally(() => {
      attempt = null;
    });
  return attempt;
};

export const DB_UNAVAILABLE = 'We could not reach the database just now. Please try again.';

// Holds a request until the database is ready. Costs nothing once it is.
export const requireDb = async (req, res, next) => {
  if (mongoose.connection.readyState === 1) return next();
  try {
    await connectDb();
    next();
  } catch (err) {
    console.error('Database not reachable:', err.message);
    next(createError(503, DB_UNAVAILABLE));
  }
};

// Errors that mean "the database could not be reached", whichever layer reports them.
export const isDbConnectionError = (err) =>
  /buffering timed out|before initial connection is complete/.test(err?.message || '') ||
  [
    'MongooseServerSelectionError',
    'MongoServerSelectionError',
    'MongoNetworkError',
    'MongoNetworkTimeoutError',
    'MongoNotConnectedError',
    'MongoTopologyClosedError',
    'MongoPoolClearedError',
  ].includes(err?.name);
