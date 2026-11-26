// Module hook used by the tests: every `import ... from 'stripe'` gets the local fake instead,
// so the test suite needs no Stripe key and never talks to Stripe.
const fakeUrl = new URL('./fake-stripe.js', import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'stripe' && context.parentURL !== fakeUrl) {
    return { url: fakeUrl, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
