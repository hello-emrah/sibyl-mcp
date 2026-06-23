// ─── Speech (Gemini text to speech) ──────────────────────────────────────────
// Music generation (Lyria) is a Live API streaming model and lands with the
// real-time module in a later version; this covers request-and-response TTS.
import { ai, MODELS, expandPath } from './client.js';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

// Gemini TTS returns raw 16-bit PCM at 24kHz; wrap it in a WAV header.
function pcmToWav(pcm, sampleRate = 24000, channels = 1, bits = 16) {
  const blockAlign = (channels * bits) / 8;
  const byteRate = sampleRate * blockAlign;
  const buf = Buffer.alloc(44 + pcm.length);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + pcm.length, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(channels, 22); buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(byteRate, 28); buf.writeUInt16LE(blockAlign, 32); buf.writeUInt16LE(bits, 34);
  buf.write('data', 36); buf.writeUInt32LE(pcm.length, 40); pcm.copy(buf, 44);
  return buf;
}

export async function speak({ text, output_path, voice = 'Kore', model } = {}) {
  if (!text) throw new Error('text is required');
  if (!output_path) throw new Error('output_path is required (.wav)');
  const r = await ai.models.generateContent({
    model: model || MODELS.tts,
    contents: text,
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
    },
  });
  const b64 = r.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!b64) throw new Error('No audio returned.');
  const p = expandPath(output_path);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, pcmToWav(Buffer.from(b64, 'base64')));
  return { path: p, voice, model: model || MODELS.tts };
}

export const mod = {
  tools: [
    {
      name: 'speak',
      description: 'Text to speech with Gemini TTS. Saves a WAV to output_path. (Music generation rides with the Live API in a later version.)',
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          output_path: { type: 'string', description: 'Where to save the .wav file.' },
          voice: { type: 'string', description: 'Prebuilt voice name, e.g. Kore, Puck, Charon, Aoede.' },
          model: { type: 'string' },
        },
        required: ['text', 'output_path'],
      },
    },
  ],
  handlers: { speak },
};
