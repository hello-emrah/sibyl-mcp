// ─── Deep Research (Gemini interactions agent) ───────────────────────────────
// Async: deep_research fires the task and returns an interaction id; research_get
// polls and, when complete, saves a cited Markdown report. Ported from the
// standalone gemini-deep-research server.
import { researchAi, MODELS, OUTPUT_DIR, expandPath } from './client.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const FORMATS = {
  report: ['Executive Summary', 'Background', 'Key Findings', 'Analysis', 'Conclusion', 'References'],
  'literature-review': ['Abstract', 'Introduction', 'Methodology', 'Literature Review', 'Synthesis', 'Gaps and Future Research', 'References'],
  'competitive-landscape': ['Market Overview', 'Key Players', 'Competitive Analysis', 'Market Trends', 'Opportunities and Threats', 'Strategic Recommendations', 'References'],
  'executive-brief': ['Executive Summary', 'Key Findings', 'Strategic Implications', 'Recommended Actions'],
  'comparative-analysis': ['Overview', 'Comparison Criteria', 'Comparative Analysis', 'Summary Table', 'Recommendation', 'References'],
};
const CITATIONS = {
  harvard: 'Harvard referencing style. In-text citations as (Author, Year). Full alphabetical reference list at the end.',
  apa: 'APA 7th edition. In-text citations as (Author, Year). Full reference list at the end.',
  chicago: 'Chicago style. Use footnotes for citations. Full bibliography at the end.',
  ieee: 'IEEE style. Numbered citations [1] inline. Full numbered reference list at the end.',
  none: 'Include source URLs inline where relevant. No formal referencing style required.',
};
const TONES = {
  analytical: 'Objective, analytical, evidence-based. Third-person throughout. Prioritise data and citations.',
  executive: 'Concise, strategic, action-oriented. Suitable for senior decision-makers. Lead with implications.',
  technical: 'Precise and detailed. Assumes expert audience. Include technical specifics, terminology, and depth.',
  casual: 'Accessible, plain English. Avoid jargon. Suitable for a general audience.',
};

function buildPrompt(userPrompt, format, citationStyle, tone, sections, formatInstructions) {
  if (formatInstructions) return `${userPrompt.trim()}\n\n${formatInstructions}`;
  const sectionList = sections ? sections.split(',').map((s) => s.trim()) : (FORMATS[format] || FORMATS.report);
  return `${userPrompt.trim()}

Format the output as a structured research document with the following specifications:

Structure: ${sectionList.join(', ')}

Citations: ${CITATIONS[citationStyle] || CITATIONS.harvard}

Tone: ${TONES[tone] || TONES.analytical}

Formatting rules:
- Markdown throughout. H2 for main sections, H3 for subsections.
- Include data tables where comparative or quantitative information is available.
- If specific data is unavailable for a given point, state it explicitly rather than estimating.
- Provide a word count estimate at the end.`;
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 60).replace(/-$/, '');
}
function generateFilename(prompt, outputFilename, stamp) {
  if (outputFilename) return outputFilename.endsWith('.md') ? outputFilename : `${outputFilename}.md`;
  return `${stamp}-research-${slugify(prompt.split('\n')[0])}.md`;
}
function frontmatter({ prompt, format, citationStyle, tone, interactionId, stamp }) {
  const title = prompt.split('\n')[0].slice(0, 100);
  return `---\ntitle: ${title}\nslug: research-${interactionId.slice(0, 8)}\ntype: artefact\ncategory: research\nformat: ${format}\ncitation_style: ${citationStyle}\ntone: ${tone}\ninteraction_id: ${interactionId}\nproduced_by:\n  - "[[Sibyl]]"\ncreated: "[[${stamp}]]"\ntags:\n  - deep-research\n  - gemini\n---\n\n`;
}

export async function deepResearch({ prompt, format = 'report', citation_style = 'harvard', tone = 'analytical', sections, format_instructions } = {}) {
  if (!prompt) throw new Error('prompt is required');
  const fullPrompt = buildPrompt(prompt, format, citation_style, tone, sections, format_instructions);
  const interaction = await researchAi.interactions.create({ input: fullPrompt, agent: MODELS.research, background: true });
  return { interaction_id: interaction.id, status: interaction.status, format, citation_style, tone, message: 'Research started. Call research_get with this interaction_id every 60 seconds until status is "completed".' };
}

// The interactions API has carried the report in two shapes: originally as
// interaction.outputs (last element's text was the whole report), and since
// mid-2026 as interaction.steps, where the text is spread across every
// model_output step's text content items (interaction.output_text holds only
// the final chunk, so it is not enough). Assemble steps first, fall back to
// outputs, and fail loudly rather than saving an empty report as a success.
function extractReportText(interaction) {
  const fromSteps = (interaction.steps || [])
    .filter((s) => s.type === 'model_output')
    .flatMap((s) => s.content || [])
    .filter((c) => c.type === 'text' && typeof c.text === 'string')
    .map((c) => c.text)
    .join('');
  if (fromSteps.trim()) return fromSteps;
  const legacy = interaction.outputs?.[interaction.outputs.length - 1]?.text ?? '';
  if (legacy.trim()) return legacy;
  throw new Error('Research completed but no report text was found on the interaction. The API response shape may have changed; inspect interaction.steps.');
}

function countImages(interaction) {
  return (interaction.steps || [])
    .filter((s) => s.type === 'model_output')
    .flatMap((s) => s.content || [])
    .filter((c) => c.type === 'image').length;
}

export async function researchGet({ interaction_id, prompt, format = 'report', citation_style = 'harvard', tone = 'analytical', output_filename, output_dir } = {}) {
  if (!interaction_id) throw new Error('interaction_id is required');
  if (!prompt) throw new Error('prompt is required (for the filename and frontmatter)');
  const interaction = await researchAi.interactions.get(interaction_id);
  if (interaction.status === 'in_progress') return { status: 'in_progress', interaction_id, message: 'Still researching. Poll again in 60 seconds.' };
  if (interaction.status === 'failed') throw new Error(interaction.error || 'Research failed.');
  if (interaction.status === 'completed') {
    const reportText = extractReportText(interaction);
    const stamp = new Date().toISOString().slice(0, 10);
    const fm = frontmatter({ prompt, format, citationStyle: citation_style, tone, interactionId: interaction_id, stamp });
    const filename = generateFilename(prompt, output_filename, stamp);
    const outDir = output_dir ? expandPath(output_dir) : OUTPUT_DIR;
    mkdirSync(outDir, { recursive: true });
    const filepath = join(outDir, filename);
    writeFileSync(filepath, fm + reportText, 'utf8');
    const images = countImages(interaction);
    const imageNote = images ? ` The research also generated ${images} chart image(s); they are not saved by this tool but can be read from interaction.steps via the API.` : '';
    return { status: 'completed', interaction_id, file: filepath, message: `Report saved to ${filepath} (${reportText.length} chars).${imageNote}` };
  }
  return { status: interaction.status, interaction_id };
}

export async function researchFollowup({ prompt, previous_interaction_id } = {}) {
  if (!prompt || !previous_interaction_id) throw new Error('prompt and previous_interaction_id are required');
  const interaction = await researchAi.interactions.create({ input: prompt, model: MODELS.text, previous_interaction_id });
  let text;
  try {
    text = extractReportText(interaction);
  } catch {
    text = interaction.output_text || JSON.stringify(interaction, null, 2);
  }
  return { text };
}

export const mod = {
  tools: [
    {
      name: 'deep_research',
      description: 'Fire a Gemini Deep Research task asynchronously. Returns an interaction_id; poll research_get every 60s. Takes 5-20 minutes, costs roughly $2-5 per task.',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'The research question or topic.' },
          format: { type: 'string', enum: ['report', 'literature-review', 'competitive-landscape', 'executive-brief', 'comparative-analysis'], description: 'Output structure preset. Default report.' },
          citation_style: { type: 'string', enum: ['harvard', 'apa', 'chicago', 'ieee', 'none'], description: 'Default harvard.' },
          tone: { type: 'string', enum: ['analytical', 'executive', 'technical', 'casual'], description: 'Default analytical.' },
          sections: { type: 'string', description: 'Comma-separated custom sections, overrides the format preset.' },
          format_instructions: { type: 'string', description: 'Freetext formatting instructions, replaces the format/citation/tone defaults.' },
        },
        required: ['prompt'],
      },
    },
    {
      name: 'research_get',
      description: 'Poll a running research task. When complete, saves a cited Markdown report to output_dir and returns the path. Pass the same format/citation/tone used to start it.',
      inputSchema: {
        type: 'object',
        properties: {
          interaction_id: { type: 'string', description: 'From deep_research.' },
          prompt: { type: 'string', description: 'The original prompt, for the filename and title.' },
          format: { type: 'string', enum: ['report', 'literature-review', 'competitive-landscape', 'executive-brief', 'comparative-analysis'] },
          citation_style: { type: 'string', enum: ['harvard', 'apa', 'chicago', 'ieee', 'none'] },
          tone: { type: 'string', enum: ['analytical', 'executive', 'technical', 'casual'] },
          output_filename: { type: 'string' },
          output_dir: { type: 'string', description: 'Where to save the report; pass the active hub or project folder.' },
        },
        required: ['interaction_id', 'prompt'],
      },
    },
    {
      name: 'research_followup',
      description: 'Ask a follow-up on a completed research task without re-running it. Returns the answer inline, saves nothing.',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string' },
          previous_interaction_id: { type: 'string' },
        },
        required: ['prompt', 'previous_interaction_id'],
      },
    },
  ],
  handlers: { deep_research: deepResearch, research_get: researchGet, research_followup: researchFollowup },
};
