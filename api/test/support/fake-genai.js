// In-memory stand-in for the Gemini SDK (@google/genai). It implements the three calls the
// app makes, records every request, and lets a test script the model's answers.

// Every request the app sent, oldest first.
export const requests = [];

// What the "model" does next. Reset with resetScript().
//   json:       value (or function of the request) returned for a structured-output request
//   tools:      function (request, round) => { calls: [{ name, args }] } | { text }
//   error:      message to fail the next interaction with (used once)
//   embedError: when true, embedding requests fail
export const script = {};
export const resetScript = () => {
  for (const key of Object.keys(script)) delete script[key];
};

const USAGE = { total_input_tokens: 120, total_output_tokens: 40 };
const STEP_TYPES = ['user_input', 'function_result', 'function_call', 'model_output'];

// ---- embeddings: a bag-of-words vector, so texts that share words are similar ----------
const DIMENSIONS = 256;
// Words the app adds as a task prefix, plus filler words.
const IGNORED = new Set([
  'task',
  'search',
  'result',
  'query',
  'title',
  'text',
  'a',
  'an',
  'the',
  'of',
  'and',
  'with',
  'for',
  'in',
  'to',
  'category',
  'features',
]);
const hash = (word) =>
  [...word].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % DIMENSIONS, 7);
export const fakeVector = (text) => {
  const vector = new Array(DIMENSIONS).fill(0);
  for (const word of String(text)
    .toLowerCase()
    .match(/[a-z]+/g) || []) {
    if (!IGNORED.has(word)) vector[hash(word)] = 1;
  }
  return vector;
};

// ---- default behaviours, used when a test (or the browser-test server) scripts nothing ---
const DEFAULT_DRAFT = {
  isFood: true,
  title: 'Masala Dosa',
  shortTitle: 'Crispy masala dosa',
  shortDesc: 'Crisp rice crepe with spiced potato filling.',
  desc: 'A crisp, golden dosa filled with spiced potato masala. Served with coconut chutney and sambar.',
  cat: 'south',
  diet: 'veg',
  allergens: ['dairy'],
  features: ['Freshly made', 'Served with chutney'],
};

const DEFAULT_SUMMARY = {
  summary: 'Buyers enjoyed this dish and would order it again.',
  pros: ['Full of flavour', 'Generous portion'],
  cons: ['Arrived a little late'],
};

// The default depends on what the request asks for, told apart by its schema.
const defaultJson = (request) =>
  request.response_format.schema?.properties?.summary ? DEFAULT_SUMMARY : DEFAULT_DRAFT;

// Searches for whatever the visitor last said, then lists what came back.
const defaultTools = (request, round) => {
  if (round === 0) {
    const lastLine = String(request.input)
      .split('\n')
      .at(-1)
      .replace(/^Visitor:\s*/, '');
    return { calls: [{ name: 'search_dishes', args: { query: lastLine } }] };
  }
  const { dishes = [] } = JSON.parse(request.input[0].result[0].text);
  if (dishes.length === 0) return { text: 'I could not find anything like that right now.' };
  const names = dishes.slice(0, 3).map((dish) => `${dish.title} (₹ ${dish.priceRupees})`);
  return { text: `Here is what I found: ${names.join(', ')}.` };
};

let interactionCount = 0;
const rounds = new Map(); // interaction id -> how many tool rounds came before it

export class GoogleGenAI {
  constructor(options = {}) {
    this.apiKey = options.apiKey;

    this.interactions = {
      create: async (request) => {
        requests.push({ kind: 'interaction', ...request });
        if (script.error) {
          const message = script.error;
          delete script.error;
          throw new Error(message);
        }
        // Like the real API: a list given as input must be a list of steps, not bare
        // text or image parts (those belong inside a "user_input" step).
        if (Array.isArray(request.input)) {
          const bad = request.input.find((step) => !STEP_TYPES.includes(step.type));
          if (bad)
            throw new Error(`400 The value '${bad.type}' is not supported for 'input[0].type'`);
        }
        const id = `interaction_${++interactionCount}`;

        if (request.response_format) {
          const data = typeof script.json === 'function' ? script.json(request) : script.json;
          const text =
            typeof data === 'string' ? data : JSON.stringify(data ?? defaultJson(request));
          return { id, output_text: text, steps: [], usage: USAGE };
        }

        const round = request.previous_interaction_id
          ? (rounds.get(request.previous_interaction_id) ?? 0) + 1
          : 0;
        rounds.set(id, round);
        const next = (script.tools || defaultTools)(request, round);
        if (next.calls) {
          return {
            id,
            output_text: '',
            usage: USAGE,
            steps: next.calls.map((call, i) => ({
              type: 'function_call',
              id: `${id}_call_${i}`,
              name: call.name,
              arguments: call.args,
            })),
          };
        }
        return { id, output_text: next.text, steps: [], usage: USAGE };
      },
    };

    this.models = {
      embedContent: async (request) => {
        requests.push({ kind: 'embedding', ...request });
        if (script.embedError) throw new Error('embedding service unavailable');
        return { embeddings: [{ values: fakeVector(request.contents) }] };
      },
    };
  }
}
