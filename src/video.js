// ─── Video (Veo generation) ──────────────────────────────────────────────────
// Async: generate_video fires the job and returns an operation name; video_status
// polls and, when done, downloads the mp4. Veo takes 1-3 minutes and is billed
// per second of output.
import { ai, MODELS, expandPath } from './client.js';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

export async function generateVideo({ prompt, model } = {}) {
  if (!prompt) throw new Error('prompt is required');
  const op = await ai.models.generateVideos({ model: model || MODELS.video, prompt });
  return {
    operation: op.name,
    model: model || MODELS.video,
    message: 'Video generation started. Poll video_status with this operation name; Veo typically takes 1-3 minutes.',
  };
}

export async function videoStatus({ operation, output_path } = {}) {
  if (!operation) throw new Error('operation is required');
  if (!output_path) throw new Error('output_path is required (where to save the mp4)');
  const op = await ai.operations.getVideosOperation({ operation: { name: operation } });
  if (!op.done) return { status: 'in_progress', operation, message: 'Still rendering. Poll again in ~30s.' };
  const video = op.response?.generatedVideos?.[0]?.video;
  if (!video) throw new Error(`Completed but no video in response: ${JSON.stringify(op.error || op.response || {})}`);
  const p = expandPath(output_path);
  mkdirSync(dirname(p), { recursive: true });
  await ai.files.download({ file: video, downloadPath: p });
  return { status: 'completed', path: p };
}

export const mod = {
  tools: [
    {
      name: 'generate_video',
      description: 'Generate a video from a text prompt with Veo. Async: returns an operation name, then poll video_status. Veo takes 1-3 minutes and is billed per second.',
      inputSchema: {
        type: 'object',
        properties: { prompt: { type: 'string' }, model: { type: 'string' } },
        required: ['prompt'],
      },
    },
    {
      name: 'video_status',
      description: 'Poll a Veo generation by its operation name. When done, downloads the mp4 to output_path.',
      inputSchema: {
        type: 'object',
        properties: {
          operation: { type: 'string', description: 'The operation name from generate_video.' },
          output_path: { type: 'string', description: 'Where to save the .mp4 when ready.' },
        },
        required: ['operation', 'output_path'],
      },
    },
  ],
  handlers: { generate_video: generateVideo, video_status: videoStatus },
};
