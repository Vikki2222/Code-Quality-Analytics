// Decides which changed files from a PR are worth analyzing, and in
// what order, given a fixed token budget. Keeps GitHub-API-shaped data
// (from github.service.getPullRequestFiles) separate from anything
// LLM-specific - this file has no knowledge of OpenAI.

const IGNORED_PATH_PATTERNS = [
  /(^|\/)node_modules\//,
  /(^|\/)dist\//,
  /(^|\/)build\//,
  /\.min\.(js|css)$/,
  /package-lock\.json$/,
  /yarn\.lock$/,
  /\.lock$/,
];

// Rough chars-per-token estimate for filtering purposes. Not exact -
// good enough for budgeting decisions, not for billing.
const CHARS_PER_TOKEN = 4;

/**
 * Filter out files that shouldn't be sent to the LLM at all:
 * generated/vendored paths, binary files (no patch), and files GitHub
 * omitted a patch for because the diff was too large.
 */
function filterNoiseFiles(files) {
  const kept = [];
  const skipped = [];

  for (const file of files) {
    if (IGNORED_PATH_PATTERNS.some((pattern) => pattern.test(file.filename))) {
      skipped.push({ filename: file.filename, reason: 'ignored_path' });
      continue;
    }
    if (!file.patch) {
      skipped.push({ filename: file.filename, reason: 'no_patch_binary_or_too_large' });
      continue;
    }
    kept.push(file);
  }

  return { kept, skipped };
}

/**
 * Rank files by "signal" - how likely they are to matter for review.
 * Higher score = higher priority to include within the token budget.
 *
 * hotspotFilenames is optional: pass filenames that have historically
 * had findings (once the findings table exists) to boost their rank.
 */
function rankFilesBySignal(files, { hotspotFilenames = new Set() } = {}) {
  return [...files].sort((a, b) => scoreFile(b, hotspotFilenames) - scoreFile(a, hotspotFilenames));
}

function scoreFile(file, hotspotFilenames) {
  let score = file.changes; // lines changed is the base signal

  if (hotspotFilenames.has(file.filename)) {
    score *= 1.5; // known problem files get priority
  }

  // Favor source code over config/docs/markup - these are far more
  // likely to contain the kinds of issues we're analyzing for.
  if (/\.(js|jsx|ts|tsx|py|java|go|rb)$/.test(file.filename)) {
    score *= 1.2;
  } else if (/\.(json|md|yml|yaml|txt)$/.test(file.filename)) {
    score *= 0.5;
  }

  return score;
}

/**
 * Given ranked files, greedily include as many as fit within the token
 * budget. Returns which files made it in vs which were cut for space -
 * this `skippedForBudget` list is what populates the reviews table's
 * `skipped_files` flag.
 */
function applyTokenBudget(rankedFiles, { maxTokens = 7000 } = {}) {
  const included = [];
  const skippedForBudget = [];
  let tokensUsed = 0;

  for (const file of rankedFiles) {
    const estimatedTokens = Math.ceil(file.patch.length / CHARS_PER_TOKEN);

    if (tokensUsed + estimatedTokens > maxTokens) {
      skippedForBudget.push({ filename: file.filename, reason: 'over_token_budget' });
      continue;
    }

    included.push(file);
    tokensUsed += estimatedTokens;
  }

  return { included, skippedForBudget, tokensUsed };
}

/**
 * Full pipeline: raw GitHub files in -> what to actually send to the
 * LLM out, plus a complete record of what was skipped and why (this
 * maps directly onto the reviews.partial_analysis / skipped_files
 * columns from the schema).
 */
function buildReviewPayload(files, options = {}) {
  const { kept, skipped: skippedNoise } = filterNoiseFiles(files);
  const ranked = rankFilesBySignal(kept, options);
  const { included, skippedForBudget, tokensUsed } = applyTokenBudget(ranked, options);

  const allSkipped = [...skippedNoise, ...skippedForBudget];

  return {
    filesToAnalyze: included,
    skippedFiles: allSkipped,
    partialAnalysis: allSkipped.length > 0,
    estimatedTokens: tokensUsed,
  };
}

module.exports = { filterNoiseFiles, rankFilesBySignal, applyTokenBudget, buildReviewPayload };