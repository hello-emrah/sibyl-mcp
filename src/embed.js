// ─── Embeddings ──────────────────────────────────────────────────────────────
import { ai, MODELS, OUTPUT_DIR, expandPath } from './client.js';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';

export async function embed({ text, texts, output_path, model } = {}) {
  const items = texts || (text ? [text] : null);
  if (!items || !items.length) throw new Error('text or texts is required');
  const r = await ai.models.embedContent({
    model: model || MODELS.embed,
    contents: items,
  });
  const vectors = (r.embeddings || []).map((e) => e.values);
  const result = { model: model || MODELS.embed, count: vectors.length, dims: vectors[0]?.length || 0 };
  // vectors are large; write to disk and return the path rather than inline
  const out = expandPath(output_path || join(OUTPUT_DIR, `embeddings-${vectors.length}x${result.dims}.json`));
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify({ ...result, embeddings: vectors }));
  return { ...result, file: out };
}

export const mod = {
  tools: [
    {
      name: 'embed',
      description: 'Create embedding vectors for one or more texts with Gemini. Writes the vectors to a JSON file and returns the path and dimensions.',
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'A single text to embed.' },
          texts: { type: 'array', items: { type: 'string' }, description: 'Multiple texts to embed in one call.' },
          output_path: { type: 'string', description: 'Where to write the JSON (defaults under the output dir).' },
          model: { type: 'string' },
        },
      },
    },
  ],
  handlers: { embed },
};
