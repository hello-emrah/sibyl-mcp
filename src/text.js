// ─── Text (Gemini generation: text, code, chat, multimodal-from-text) ────────
import { ai, MODELS } from './client.js';

export async function generate({ prompt, system, json, model } = {}) {
  if (!prompt) throw new Error('prompt is required');
  const config = {};
  if (system) config.systemInstruction = system;
  if (json) config.responseMimeType = 'application/json';
  const r = await ai.models.generateContent({
    model: model || MODELS.text,
    contents: prompt,
    ...(Object.keys(config).length ? { config } : {}),
  });
  return { text: r.text, model: model || MODELS.text };
}

export const mod = {
  tools: [
    {
      name: 'generate',
      description: 'Generate text with Gemini: prose, code, chat, reasoning. The core generative call.',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'The prompt.' },
          system: { type: 'string', description: 'Optional system instruction.' },
          json: { type: 'boolean', description: 'Force a JSON response.' },
          model: { type: 'string', description: 'Override the Gemini text model.' },
        },
        required: ['prompt'],
      },
    },
  ],
  handlers: { generate },
};
