const crypto = require('crypto');

// Common filler words that don't help distinguish one issue from
// another - stripping them means "missing the tests" and "tests are
// missing" normalize to the same tokens.
const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'to', 'of', 'in', 'on', 'for', 'with', 'this', 'that', 'it', 'its',
  'and', 'or', 'but', 'not', 'no', 'do', 'does', 'did',
]);

/**
 * Turn a raw finding title into a normalized token string that's
 * stable across superficial rewordings. This is deliberately crude -
 * a dependency-free stand-in for real stemming/lemmatization. It won't
 * catch every paraphrase (that's what Tier 2 embedding similarity is
 * for), but it should catch near-identical titles regardless of tense,
 * word order, or incidental filler words.
 */
function normalizeTitle(title) {
  const tokens = title
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')       // strip punctuation
    .replace(/\d+/g, ' ')            // strip numbers (line numbers, counts)
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => !STOPWORDS.has(word))
    .map(crudeStem);

  // Sort alphabetically - makes the key order-invariant, so "missing
  // error handling" and "error handling missing" normalize the same.
  return [...new Set(tokens)].sort().join(' ');
}

/**
 * Very crude suffix stripping - not a real stemmer (no Porter
 * algorithm dependency), just enough to collapse the most common
 * verb/noun variants: "testing"/"tested"/"tests" -> "test".
 */
function crudeStem(word) {
  if (word.length <= 4) return word; // too short to safely strip
  if (word.endsWith('ing')) return word.slice(0, -3);
  if (word.endsWith('ed')) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

/**
 * Tier 1 fingerprint key: repo + file + category + normalized title.
 * Deterministic and cheap - no API calls, no ML. This is the fast path
 * checked before ever falling back to embedding similarity (Tier 2).
 */
function computeStructuralKey({ owner, repo, filePath, category, title }) {
  const normalized = normalizeTitle(title);
  const raw = `${owner}/${repo}::${filePath}::${category}::${normalized}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}



/**
 * Cosine similarity between two equal-length vectors. Standard
 * measure for embedding comparison - 1.0 means identical direction
 * (near-duplicate meaning), 0 means unrelated, negative means opposite.
 */
function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Threshold above which two findings are considered the same recurring
// issue. Starting point based on typical embedding-similarity
// conventions - tune this empirically once there's more real data to
// check against (see doc's fingerprinting design discussion).
const SIMILARITY_THRESHOLD = 0.85;

/**
 * Tier 2: given a new finding's embedding and a list of candidate
 * existing fingerprints (already scoped to the same repo+file+category
 * bucket - callers must do that scoping before calling this), find the
 * best match above the similarity threshold, if any.
 */
function findBestMatch(newEmbedding, candidates) {
  let best = null;
  let bestScore = 0;

  for (const candidate of candidates) {
    if (!candidate.embedding) continue;
    const score = cosineSimilarity(newEmbedding, candidate.embedding);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  if (best && bestScore >= SIMILARITY_THRESHOLD) {
    return { fingerprint: best, score: bestScore };
  }
  return null;
}

module.exports = { normalizeTitle, computeStructuralKey, cosineSimilarity, findBestMatch, SIMILARITY_THRESHOLD };
