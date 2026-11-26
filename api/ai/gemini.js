// The only file that talks to the model provider. Everything else in ai/ uses the three
// functions exported here, so moving to another provider means rewriting this file alone.
import { GoogleGenAI } from '@google/genai';
import { EMBEDDING_DIMENSIONS, aiConfig } from './config.js';

let client;
const getClient = () => {
  client ||= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
};

const usageOf = (interaction) => ({
  inputTokens: interaction.usage?.total_input_tokens || 0,
  outputTokens: interaction.usage?.total_output_tokens || 0,
});

// input: [{ type: 'text', text }, { type: 'image', data: <base64>, mimeType }]
const toInput = (parts) =>
  parts.map((part) =>
    part.type === 'image'
      ? { type: 'image', data: part.data, mime_type: part.mimeType }
      : { type: 'text', text: part.text }
  );

// One request whose answer must be JSON matching `schema` (a JSON Schema object).
// Resolves to { data, usage }. `data` is parsed but NOT yet trusted: callers validate it.
export const generateJson = async ({ system, input, schema, maxOutputTokens = 1500 }) => {
  const interaction = await getClient().interactions.create({
    model: aiConfig().model,
    system_instruction: system,
    input: toInput(input),
    response_format: { type: 'text', mime_type: 'application/json', schema },
    generation_config: { max_output_tokens: maxOutputTokens },
    store: false,
  });
  return { data: JSON.parse(interaction.output_text), usage: usageOf(interaction) };
};

// A request in which the model may call the given tools before answering.
//   tools:    [{ name, description, parameters: <JSON Schema> }]
//   handlers: { [name]: async (args) => result }   (results are sent back as JSON text)
// Resolves to { text, calls: [{ name, args, result }], usage }.
export const runWithTools = async ({ system, prompt, tools, handlers, maxRounds = 4 }) => {
  const declarations = tools.map((tool) => ({ type: 'function', ...tool }));
  const calls = [];
  const usage = { inputTokens: 0, outputTokens: 0 };
  const add = (interaction) => {
    const used = usageOf(interaction);
    usage.inputTokens += used.inputTokens;
    usage.outputTokens += used.outputTokens;
  };

  let interaction = await getClient().interactions.create({
    model: aiConfig().model,
    system_instruction: system,
    input: prompt,
    tools: declarations,
  });
  add(interaction);

  for (let round = 0; round < maxRounds; round++) {
    const requested = (interaction.steps || []).filter((step) => step.type === 'function_call');
    if (requested.length === 0) break;

    const results = [];
    for (const step of requested) {
      const handler = handlers[step.name];
      let result;
      try {
        result = handler ? await handler(step.arguments || {}) : { error: 'Unknown tool' };
      } catch (err) {
        result = { error: err.message };
      }
      calls.push({ name: step.name, args: step.arguments || {}, result });
      results.push({
        type: 'function_result',
        name: step.name,
        call_id: step.id,
        result: [{ type: 'text', text: JSON.stringify(result) }],
      });
    }

    interaction = await getClient().interactions.create({
      model: aiConfig().model,
      system_instruction: system,
      input: results,
      tools: declarations,
      previous_interaction_id: interaction.id,
    });
    add(interaction);
  }

  return { text: interaction.output_text || '', calls, usage };
};

// Turns one text into a search vector of unit length. `kind` is 'query' or 'document'.
export const embed = async (text, kind = 'document', title = '') => {
  const { embeddingModel } = aiConfig();
  // This model family takes the task as part of the text instead of a separate setting.
  const contents =
    kind === 'query' ? `task: search result | query: ${text}` : `title: ${title} | text: ${text}`;
  const response = await getClient().models.embedContent({
    model: embeddingModel,
    contents,
    config: { outputDimensionality: EMBEDDING_DIMENSIONS },
  });
  const values = response.embeddings?.[0]?.values;
  if (!values?.length) throw new Error('The embedding model returned no vector');
  // Shortened vectors are not unit length; normalise so a dot product is the cosine.
  const length = Math.hypot(...values) || 1;
  return values.map((value) => value / length);
};
