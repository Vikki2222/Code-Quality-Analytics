const { query } = require('../config/db');
const aiService = require('./ai.service');
const { computeStructuralKey, findBestMatch } = require('../utils/fingerprint');

/**
 * Given a new finding, determine which fingerprint group it belongs to
 * (creating a new one if it's genuinely new), and return that group's
 * id. This is the entry point Tier 1 + Tier 2 both feed into.
 *
 * Order of checks (cheapest first):
 * 1. Tier 1 - exact structural key match (no API call, instant)
 * 2. Tier 2 - embedding similarity within the same repo+file+category
 *    bucket (one API call, only runs if Tier 1 misses)
 * 3. No match - this is a genuinely new fingerprint group
 *
 * KNOWN LIMITATION: bucket scoping includes `category`, so if the AI
 * classifies the same underlying issue under a different category on
 * a later run (e.g. "readability" vs "maintainability" for a rename),
 * fingerprinting will treat it as a new issue rather than merging.
 * Accepted tradeoff for MVP - the AI's own categorization inconsistency
 * is an upstream problem, not a bug in the matching logic itself.
 * Revisit by scoping Tier 2 to repo+file only (dropping category) if
 * this proves to matter in practice.
 */
async function fingerprintFinding({ owner, repo, filePath, category, title, description }) {
  const structuralKey = computeStructuralKey({ owner, repo, filePath, category, title });

  const exactMatch = await query(
    `SELECT * FROM finding_fingerprints
     WHERE repository_owner = $1 AND repository_name = $2 AND file_path = $3
       AND category = $4 AND structural_key = $5`,
    [owner, repo, filePath, category, structuralKey]
  );

  if (exactMatch.rows.length > 0) {
    return recordOccurrence(exactMatch.rows[0].id);
  }

  const bucket = await query(
    `SELECT * FROM finding_fingerprints
     WHERE repository_owner = $1 AND repository_name = $2 AND file_path = $3 AND category = $4`,
    [owner, repo, filePath, category]
  );

  const newEmbedding = await aiService.getEmbedding(`${title}. ${description}`);
  const match = findBestMatch(newEmbedding, bucket.rows);

  if (match) {
    return recordOccurrence(match.fingerprint.id);
  }

  const created = await query(
    `INSERT INTO finding_fingerprints
       (repository_owner, repository_name, file_path, category, structural_key, embedding, representative_title, occurrence_count, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 1, 'open')
     RETURNING id`,
    [owner, repo, filePath, category, structuralKey, JSON.stringify(newEmbedding), title]
  );

  return created.rows[0].id;
}

/**
 * Bump occurrence count + last_detected_at on an existing fingerprint.
 * If it had been marked resolved, this occurrence flips it to
 * 'recurring' - the lifecycle transition the doc's design calls for.
 */
async function recordOccurrence(fingerprintId) {
  await query(
    `UPDATE finding_fingerprints
     SET occurrence_count = occurrence_count + 1,
         last_detected_at = now(),
         status = CASE WHEN status = 'resolved' THEN 'recurring' ELSE status END
     WHERE id = $1`,
    [fingerprintId]
  );
  return fingerprintId;
}

/**
 * After a review completes, check which previously-open fingerprints
 * for the reviewed files did NOT show up in this review's findings,
 * and mark them resolved. Call this once per review, after all
 * findings have been fingerprinted and inserted.
 *
 * Scoped to only the files actually analyzed in this review - a
 * fingerprint for a file that wasn't touched by this PR shouldn't be
 * marked resolved just because this review didn't mention it.
 */
async function markResolvedFindings({ owner, repo, analyzedFilePaths, detectedFingerprintIds }) {
  if (analyzedFilePaths.length === 0) return;

  const result = await query(
    `UPDATE finding_fingerprints
     SET status = 'resolved'
     WHERE repository_owner = $1
       AND repository_name = $2
       AND file_path = ANY($3)
       AND status IN ('open', 'recurring')
       AND NOT (id = ANY($4))
     RETURNING id, representative_title`,
    [owner, repo, analyzedFilePaths, detectedFingerprintIds.length > 0 ? detectedFingerprintIds : [0]]
  );

  return result.rows;
}

module.exports = { fingerprintFinding, markResolvedFindings };