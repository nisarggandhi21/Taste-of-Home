// Small HTTP helpers for the API tests.

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

  const register = async (username, isSeller = false, location = 'Mumbai') => {
    const res = await call('POST', '/api/auth/register', {
      body: {
        username,
        email: `${username}@example.com`,
        password: 'secret123',
        isSeller,
        location,
      },
    });
    if (res.status !== 201) throw new Error(`register failed: ${JSON.stringify(res)}`);
    return { id: res.data._id, cookie: res.setCookie.split(';')[0], res };
  };

  // Opens the live message stream as the given user. Resolves once the server has answered:
  //   { status, events: [{ event, data }], messages(), ended(), close() }
  // `events` keeps filling for as long as the stream is open.
  const openStream = async ({ cookie, origin } = {}) => {
    const controller = new AbortController();
    const res = await fetch(`${baseUrl}/api/messages/stream`, {
      headers: { ...(cookie ? { cookie } : {}), ...(origin ? { origin } : {}) },
      signal: controller.signal,
    });
    const events = [];
    let ended = false;

    const read = async () => {
      const decoder = new TextDecoder();
      let buffer = '';
      try {
        for await (const chunk of res.body) {
          buffer += decoder.decode(chunk, { stream: true });
          let end;
          while ((end = buffer.indexOf('\n\n')) !== -1) {
            const block = buffer.slice(0, end);
            buffer = buffer.slice(end + 2);
            const event = /^event: (.*)$/m.exec(block)?.[1];
            const data = /^data: (.*)$/m.exec(block)?.[1];
            if (event) events.push({ event, data: JSON.parse(data) });
          }
        }
      } catch {
        // Closed by the test.
      }
      ended = true;
    };
    if (res.status === 200) read();
    else await res.body?.cancel();

    return {
      status: res.status,
      contentType: res.headers.get('content-type'),
      events,
      messages: () =>
        events.filter((entry) => entry.event === 'message').map((entry) => entry.data),
      ended: () => ended,
      close: () => controller.abort(),
    };
  };

  return { call, register, openStream };
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
  diet: 'veg',
  allergens: ['dairy'],
};

export const sampleCheckout = {
  quantity: 1,
  deliveryAddress: {
    name: 'Stefan Buyer',
    phone: '+91 98765 43210',
    line1: '12 Marine Drive, Flat 4B',
    city: 'Mumbai',
    pincode: '400002',
    notes: 'Ring the bell twice',
  },
};
