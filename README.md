<div align="center">

<img src="assets/logo.png" alt="Sibyl" width="160" />

# Sibyl

**The oracle for Google's Gemini.**

Where Pythia speaks for OpenAI, Sibyl speaks for Gemini. One MCP across the whole generative surface: text, image, video, speech, embeddings, and deep research. Built for personal use, shared openly, not productised.

<br/>

<a href="https://www.buymeacoffee.com/hello_emrah"><img src="https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=%E2%98%95&slug=hello_emrah&button_colour=2E7D74&font_colour=ffffff&coffee_colour=ffffff&outline_colour=ffffff&font_family=Inter" alt="Buy me a coffee" height="44" /></a>

</div>

---

Sibyl is a local Model Context Protocol server wrapping Google's Gemini generative API. It folds the old nano-banana (image) and gemini-deep-research servers into one coherent Gemini surface, and adds text, video, speech and embeddings, so an assistant reaches everything Gemini generates through a single tool set.

## Tools

| Tool | What it does |
|---|---|
| `generate` | Text, code, chat and reasoning with Gemini |
| `generate_image` / `edit_image` | Generate or edit images (Nano Banana). Edit takes one or more inputs for compositing and iterative refinement |
| `generate_video` / `video_status` | Generate video with Veo. Async: fire, then poll |
| `speak` | Text to speech with Gemini TTS |
| `embed` | Embedding vectors for one or more texts |
| `deep_research` / `research_get` / `research_followup` | Fire an autonomous multi-step research task, poll it, and save a cited Markdown report; ask follow-ups without re-running |

## Requirements

- Node 18 or newer.
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey).

## Install

```bash
git clone https://github.com/hello-emrah/sibyl-mcp.git
cd sibyl-mcp
npm install
```

## Wire into Claude

```json
{
  "mcpServers": {
    "sibyl": {
      "command": "node",
      "args": ["/absolute/path/to/sibyl-mcp/index.js"],
      "env": { "GEMINI_API_KEY": "your-key" }
    }
  }
}
```

## Config

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Required. Your Gemini API key. |
| `GEMINI_DEEP_RESEARCH_API_KEY` | Optional. A separate key for the research agent; falls back to `GEMINI_API_KEY`. |
| `GEMINI_TEXT_MODEL` / `GEMINI_IMAGE_MODEL` / `GEMINI_VIDEO_MODEL` / `GEMINI_TTS_MODEL` / `GEMINI_EMBED_MODEL` | Optional model overrides; sensible current defaults otherwise. |
| `SIBYL_OUTPUT_DIR` | Where research reports and embedding files land by default. |

## Why "Sibyl"

The Sibyl was the prophetess of the ancient world, an oracle with no temple of her own, a wandering voice of foresight who spoke the future in riddles. She is the twin to the Pythia: where Pythia spoke for Apollo at Delphi, Sibyl speaks for Gemini here. Fitting that the Gemini API, named for the twins, should fall to the oracle's twin.

## Design philosophy

The visual mark and the tool itself were built deliberately against the visual language of capitalist software design. No gradients, no neon, no glass, no drop shadows, no isometric stock illustration. Single-shade flat seals in warm, considered colours, ancient-glyph silhouettes, generous whitespace. The mark could be pressed into wax or carved into stone.

This tool is built for personal use and shared openly. It is not productised, monetised, or instrumented. Use it for your own work or fork it for yours.

## License

MIT.
