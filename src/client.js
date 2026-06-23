// ─── Shared Gemini client and model config ──────────────────────────────────
// One GoogleGenAI client for the whole Gemini generative surface. Deep research
// may use its own key (GEMINI_DEEP_RESEARCH_API_KEY); everything else uses
// GEMINI_API_KEY. Every model id is env-overridable, with current defaults.

import { GoogleGenAI } from '@google/genai';
import { homedir } from 'os';
import { resolve } from 'path';

const KEY = process.env.GEMINI_API_KEY;
if (!KEY) {
  console.error('ERROR: GEMINI_API_KEY is not set.');
  process.exit(1);
}

export const ai = new GoogleGenAI({ apiKey: KEY });

const RKEY = process.env.GEMINI_DEEP_RESEARCH_API_KEY || KEY;
export const researchAi = RKEY === KEY ? ai : new GoogleGenAI({ apiKey: RKEY });

export const MODELS = {
  text:     process.env.GEMINI_TEXT_MODEL     || 'gemini-3.1-pro-preview',
  image:    process.env.GEMINI_IMAGE_MODEL    || 'gemini-3.1-flash-image-preview',
  video:    process.env.GEMINI_VIDEO_MODEL    || 'veo-3.1-generate-preview',
  tts:      process.env.GEMINI_TTS_MODEL      || 'gemini-2.5-flash-preview-tts',
  embed:    process.env.GEMINI_EMBED_MODEL    || 'gemini-embedding-001',
  research: process.env.GEMINI_RESEARCH_AGENT || 'deep-research-preview-04-2026',
};

export const OUTPUT_DIR = process.env.SIBYL_OUTPUT_DIR
  ? expandPath(process.env.SIBYL_OUTPUT_DIR)
  : `${homedir()}/Documents/sibyl-output`;

export function expandPath(p) {
  if (!p) return p;
  return resolve(p.replace(/^~/, homedir()));
}
