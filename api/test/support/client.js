// Small HTTP helpers for the API tests.
import { io } from 'socket.io-client';

export const createClient = (baseUrl) => {
  const call = async (method, path, { cookie, body, raw, headers } = {}) => {
    const res = await fetch(baseUrl + path, {
      method,
      headers: {
        ...(body && !raw ? { 'Content-Type': 'application/json' } : {}),
        ...(cookie ? { cookie } : {}),
        ...headers,
      },
      body: raw ?? (body ? JSON.stringify(body) : undefined),
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    return { status: res.status, data, setCookie: res.headers.get('set-cookie') };
  };

  const register = async (username, isSeller = false) => {
    const res = await call('POST', '/api/auth/register', {
      body: {
        username,
        email: `${username}@example.com`,
        password: 'secret123',
        isSeller,
        location: 'Mumbai',
      },
    });
    if (res.status !== 201) throw new Error(`register failed: ${JSON.stringify(res)}`);
    return { id: res.data._id, cookie: res.setCookie.split(';')[0], res };
  };

  // Resolves with { ok, error, socket } once the connection is accepted or refused.
  const connectSocket = ({ cookie, origin } = {}) =>
    new Promise((resolve) => {
      const socket = io(baseUrl, {
        extraHeaders: { ...(cookie ? { cookie } : {}), ...(origin ? { origin } : {}) },
        reconnection: false,
      });
      socket.on('connect', () => resolve({ ok: true, socket }));
      socket.on('connect_error', (error) => resolve({ ok: false, error: error.message, socket }));
    });

  return { call, register, connectSocket };
};

export const sampleItem = {
  title: 'Paneer Thali',
  cat: 'north',
  cover: 'https://example.com/cover.png',
  images: [],
  desc: 'A long enough description',
  shortTitle: 'Thali',
  shortDesc: 'Tasty',
  deliveryTime: 2,
  features: ['fresh'],
  price: 250,
};
