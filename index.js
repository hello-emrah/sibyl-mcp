#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { mod as text } from './src/text.js';
import { mod as image } from './src/image.js';
import { mod as video } from './src/video.js';
import { mod as speech } from './src/speech.js';
import { mod as embed } from './src/embed.js';
import { mod as research } from './src/research.js';

// ─── Module registry ────────────────────────────────────────────────────────
// The Gemini generative surface. Add new capabilities (real-time / Live API,
// music) here as they land.
const MODULES = [text, image, video, speech, embed, research];
const TOOLS = MODULES.flatMap((m) => m.tools);
const HANDLERS = Object.assign({}, ...MODULES.map((m) => m.handlers));

// ─── Server ─────────────────────────────────────────────────────────────────
const server = new Server(
  { name: 'sibyl-mcp', version: '0.1.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  const fn = HANDLERS[name];
  if (!fn) return { isError: true, content: [{ type: 'text', text: `Unknown tool: ${name}` }] };
  try {
    const result = await fn(args || {});
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  } catch (e) {
    return { isError: true, content: [{ type: 'text', text: `Error: ${e.message}` }] };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`sibyl ready (${TOOLS.length} tools: text, image, video, speech, embed, research)`);
