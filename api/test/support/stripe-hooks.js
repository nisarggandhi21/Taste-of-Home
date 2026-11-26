// Module hook used by the tests: imports of third-party services get local fakes instead, so
// the test suite needs no accounts or keys and never talks to Stripe or to an AI provider.
const FAKES = {
  stripe: new URL('./fake-stripe.js', import.meta.url).href,
  '@google/genai': new URL('./fake-genai.js', import.meta.url).href,
};

export async function resolve(specifier, context, nextResolve) {
  const fake = FAKES[specifier];
  // The fakes themselves may import the real package.
  if (fake && context.parentURL !== fake) return { url: fake, shortCircuit: true };
  return nextResolve(specifier, context);
}
