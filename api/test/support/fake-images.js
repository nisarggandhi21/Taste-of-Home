// The listing-draft feature downloads the dish photo from the image host. In tests that
// download is answered locally: every other request goes through untouched.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

// Paths ending in these names behave specially; anything else is a small PNG.
//   missing.png -> 404      notes.txt -> a text file      huge.png -> larger than the limit
export const installFakeImageHost = () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = String(input instanceof Request ? input.url : input);
    if (!url.startsWith('https://res.cloudinary.com/')) return realFetch(input, init);

    if (url.endsWith('missing.png')) return new Response('not found', { status: 404 });
    if (url.endsWith('notes.txt')) {
      return new Response('hello', { headers: { 'content-type': 'text/plain' } });
    }
    const body = url.endsWith('huge.png') ? Buffer.alloc(6 * 1024 * 1024) : PNG;
    return new Response(body, { headers: { 'content-type': 'image/png' } });
  };
  return () => {
    globalThis.fetch = realFetch;
  };
};
