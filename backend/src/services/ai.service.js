const OpenAI = require('openai');

// OpenRouter for PR analysis - free tier, no card needed, 50 req/day.
// openrouter/free spreads across all $0 models automatically.
// openrouter/auto looks similar but bills variable pricing - don't use it.
const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',  // with /v1
  // SDK default is 10 min x 2 retries - one hung free-tier model would
  // hold a worker slot for ~30 min. BullMQ retries the whole job anyway.
  timeout: 90 * 1000,
  maxRetries: 1,
  defaultHeaders: {
    'HTTP-Referer': 'https://github.com/Vikki2222/code-quality-analytics',
    'X-Title': 'Code Quality Analytics',
  },
});

// Gemini still used for embeddings only - OpenRouter doesn't support
// embedding endpoints, so we keep a separate client for that.
const geminiClient = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
  timeout: 15 * 1000,
  maxRetries: 2,
});

const VALID_CATEGORIES = ['security', 'reliability', 'performance', 'maintainability', 'testing', 'scalability'];
const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical'];

const SYSTEM_PROMPT = `You are a senior engineering lead analyzing a pull request diff for systemic code quality issues.

IMPORTANT: Do NOT flag syntax errors, style issues, missing semicolons, variable naming,
or anything a linter would catch. Those are solved by other tools.

Focus ONLY on issues that represent systemic risk or accumulating technical debt:
- Security vulnerabilities that could be exploited (real attack vectors, not theoretical)
- Missing error handling that will cause silent failures in production
- Architectural patterns that will cause problems as the codebase scales
- Test coverage gaps on critical business logic (not coverage percentage, real risk)
- Performance patterns that degrade under load (not micro-optimizations)
- Design decisions that create tight coupling or make future changes dangerous

For each issue found, explain not just what is wrong but WHY it matters at a systemic level.
Only flag issues a tech lead would raise in a real code review as a risk to long-term system health.
If a file has no systemic issues, do not include it.

Respond ONLY with a valid JSON object, no other text, no markdown:
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
}

category must be one of: ${VALID_CATEGORIES.join(', ')}
severity must be one of: ${VALID_SEVERITIES.join(', ')}`;

/**
 * Analyze PR diffs via OpenRouter free tier.
 * No response_format enforcement - not all free models support it.
 * parseAndValidateFindings handles malformed responses defensively.
 */
async function analyzeDiff(filesToAnalyze, { model = 'openrouter/free' } = {}) {
  const diffText = filesToAnalyze
    .map((file) => `### File: ${file.filename} (${file.status})\n${file.patch}`)
    .join('\n\n');

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: diffText },
    ],
    temperature: 0.2,
  });

  // Free models sometimes return no choices or null content (e.g. a
  // content filter) - fail with a readable message, not a TypeError.
  const raw = response.choices && response.choices[0] && response.choices[0].message.content;
  if (!raw) {
    throw new Error(`AI returned an empty response (model: ${response.model || model})`);
  }
  return parseAndValidateFindings(raw, model);
}

function parseAndValidateFindings(raw, model) {
  let parsed;
  try {
    // Strip markdown code fences if the model wraps its JSON response in them
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    parsed = JSON.parse(cleaned);
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
 * Embeddings still use Gemini directly - OpenRouter doesn't support
 * embedding endpoints.
 */
async function getEmbedding(text) {
  const response = await geminiClient.embeddings.create({
    model: 'gemini-embedding-001',
    input: text,
  });
  return response.data[0].embedding;
}

module.exports = { analyzeDiff, getEmbedding, parseAndValidateFindings };