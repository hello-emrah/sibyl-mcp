// ─── Image (Gemini image generation and editing: Nano Banana) ────────────────
import { ai, MODELS, expandPath } from './client.js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, extname } from 'path';

function partsFrom(resp) {
  const parts = resp.candidates?.[0]?.content?.parts || [];
  const images = parts.filter((p) => p.inlineData?.data).map((p) => p.inlineData.data);
  const text = parts.filter((p) => p.text).map((p) => p.text).join('');
  return { images, text };
}

function save(b64, output_path) {
  const p = expandPath(output_path);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, Buffer.from(b64, 'base64'));
  return p;
}

function imagePart(p) {
  const buf = readFileSync(expandPath(p));
  const ext = extname(p).slice(1).toLowerCase();
  const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  return { inlineData: { mimeType, data: buf.toString('base64') } };
}

export async function generateImage({ prompt, output_path, model } = {}) {
  if (!prompt) throw new Error('prompt is required');
  if (!output_path) throw new Error('output_path is required');
  const r = await ai.models.generateContent({ model: model || MODELS.image, contents: prompt });
  const { images, text } = partsFrom(r);
  if (!images.length) throw new Error(`No image returned. ${text || ''}`.trim());
  return { path: save(images[0], output_path), model: model || MODELS.image, note: text || undefined };
}

export async function editImage({ prompt, image_paths, output_path, model } = {}) {
  if (!prompt) throw new Error('prompt is required');
  if (!image_paths?.length) throw new Error('image_paths is required');
  if (!output_path) throw new Error('output_path is required');
  const contents = [...image_paths.map(imagePart), { text: prompt }];
  const r = await ai.models.generateContent({ model: model || MODELS.image, contents });
  const { images, text } = partsFrom(r);
  if (!images.length) throw new Error(`No image returned. ${text || ''}`.trim());
  return { path: save(images[0], output_path), model: model || MODELS.image, note: text || undefined };
}

export const mod = {
  tools: [
    {
      name: 'generate_image',
      description: 'Generate an image from a text prompt with Gemini (Nano Banana). Saves to output_path.',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string' },
          output_path: { type: 'string', description: 'Where to save the image (.png).' },
          model: { type: 'string' },
        },
        required: ['prompt', 'output_path'],
      },
    },
    {
      name: 'edit_image',
      description: 'Edit or combine one or more input images with a natural-language instruction (style transfer, inpainting, compositing). Pass a prior output back in to keep refining. Saves to output_path.',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string' },
          image_paths: { type: 'array', items: { type: 'string' }, description: 'One or more input image paths.' },
          output_path: { type: 'string' },
          model: { type: 'string' },
        },
        required: ['prompt', 'image_paths', 'output_path'],
      },
    },
  ],
  handlers: { generate_image: generateImage, edit_image: editImage },
};
