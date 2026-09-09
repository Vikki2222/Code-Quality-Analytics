const OpenAI = require('openai');

// Gemini exposes an official OpenAI-compatible endpoint, so the same
// SDK works - just point baseURL at Google and use a Gemini model name.
const client = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
});

const VALID_CATEGORIES = ['bug', 'security', 'performance', 'readability', 'maintainability', 'testing'];
const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical'];

const SYSTEM_PROMPT = `You are a senior code reviewer analyzing a pull request diff.

Review the provided file diffs and identify concrete code quality issues.
For each issue found, produce a finding with:
- category: one of ${VALID_CATEGORIES.join(', ')}
- severity: one of ${VALID_SEVERITIES.join(', ')}
- file: the exact filename from the diff
- line: the line number in the NEW version of the file, if determinable from the diff hunk header, otherwise null
- title: a short (under 10 words) description of the issue
- description: 1-3 sentences explaining the problem
- recommendation: 1-2 sentences on how to fix it

Only flag genuine issues. Do not invent problems to pad the list.
If a file has no issues, do not include it.

Respond ONLY with a JSON object of this exact shape, no other text:
{
  "findings": [
    {
      "category": "...",
      "severity": "...",
      "file": "...",
      "line": 42,
      "title": "...",
      "description": "...",
      "recommendation": "..."
    }
  ]
}`;

/**
 * Send a batch of filtered/budgeted file diffs to the LLM and get back
 * structured findings. Takes filesToAnalyze exactly as produced by
 * utils/diffBudget.buildReviewPayload - this function has no knowledge
 * of GitHub or budgeting, just AI in/out.
 *
 * Using Gemini's free tier (no cost) via Google's official OpenAI
 * compatibility layer. Model name is config, not hardcoded logic, so
 * swapping providers/models later only touches this one constant.
 */
async function analyzeDiff(filesToAnalyze, { model = 'gemini-3.6-flash' } = {}) {
  const diffText = filesToAnalyze
    .map((file) => `### File: ${file.filename} (${file.status})\n${file.patch}`)
    .join('\n\n');

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: diffText },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
  });

  const raw = response.choices[0].message.content;
  return parseAndValidateFindings(raw, model);
}

function parseAndValidateFindings(raw, model) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`AI response was not valid JSON: ${err.message}`);
  }

  if (!parsed.findings || !Array.isArray(parsed.findings)) {
    throw new Error('AI response missing a "findings" array');
  }

  const validated = [];
  for (const finding of parsed.findings) {
    if (!VALID_CATEGORIES.includes(finding.category)) continue;
    if (!VALID_SEVERITIES.includes(finding.severity)) continue;
    if (!finding.file || !finding.title || !finding.description) continue;

    validated.push({
      category: finding.category,
      severity: finding.severity,
      file: finding.file,
      line: typeof finding.line === 'number' ? finding.line : null,
      title: finding.title,
      description: finding.description,
      recommendation: finding.recommendation || null,
    });
  }

  return { findings: validated, model };
}


/**
 * Get an embedding vector for a piece of text - used for Tier 2
 * fingerprinting (fuzzy similarity within a repo+file+category bucket).
 * Kept in ai.service.js since it's still "AI in, data out" - the
 * comparison logic itself lives in fingerprint.js, deterministic code.
 */
async function getEmbedding(text) {
  const response = await client.embeddings.create({
    model: 'gemini-embedding-001',
    input: text,
  });
  return response.data[0].embedding;
}

module.exports = { analyzeDiff, getEmbedding };

