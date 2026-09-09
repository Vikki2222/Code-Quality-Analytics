const { query } = require('../config/db');
const githubService = require('./github.service');
const aiService = require('./ai.service');
const { fingerprintFinding, markResolvedFindings } = require('./fingerprint.service');
const { buildReviewPayload } = require('../utils/diffBudget');

async function createReview({ userId, accessToken, owner, repo, pullNumber }) {
  const pullRequestId = await upsertPullRequest(accessToken, owner, repo, pullNumber);
  const reviewId = await createReviewRow(pullRequestId, userId);

  try {
    const files = await githubService.getPullRequestFiles(accessToken, owner, repo, pullNumber);
    const { filesToAnalyze, skippedFiles, partialAnalysis } = buildReviewPayload(files);

    if (filesToAnalyze.length === 0) {
      await completeReview(reviewId, { model: null, partialAnalysis: true, skippedFiles });
      return { reviewId, status: 'completed', findings: [] };
    }

    const { findings, model } = await aiService.analyzeDiff(filesToAnalyze);

    const detectedFingerprintIds = await insertFindings(reviewId, pullRequestId, findings, owner, repo);
    const analyzedFilePaths = [...new Set(filesToAnalyze.map((f) => f.filename))];
    await markResolvedFindings({ owner, repo, analyzedFilePaths, detectedFingerprintIds });

    await completeReview(reviewId, { model, partialAnalysis, skippedFiles });

    return { reviewId, status: 'completed', findings };
  } catch (err) {
    await failReview(reviewId, err.message);
    throw err;
  }
}

async function createQueuedReview({ userId, accessToken, owner, repo, pullNumber }) {
  const pullRequestId = await upsertPullRequest(accessToken, owner, repo, pullNumber);
  const reviewId = await createReviewRow(pullRequestId, userId);
  return { reviewId, pullRequestId };
}

async function processQueuedReview({ reviewId, userId, accessToken, owner, repo, pullNumber }) {
  const reviewRow = await query('SELECT pull_request_id FROM reviews WHERE id = $1', [reviewId]);
  const pullRequestId = reviewRow.rows[0].pull_request_id;

  try {
    const files = await githubService.getPullRequestFiles(accessToken, owner, repo, pullNumber);
    const { filesToAnalyze, skippedFiles, partialAnalysis } = buildReviewPayload(files);

    if (filesToAnalyze.length === 0) {
      await completeReview(reviewId, { model: null, partialAnalysis: true, skippedFiles });
      return;
    }

    const { findings, model } = await aiService.analyzeDiff(filesToAnalyze);

    const detectedFingerprintIds = await insertFindings(reviewId, pullRequestId, findings, owner, repo);
    const analyzedFilePaths = [...new Set(filesToAnalyze.map((f) => f.filename))];
    await markResolvedFindings({ owner, repo, analyzedFilePaths, detectedFingerprintIds });

    await completeReview(reviewId, { model, partialAnalysis, skippedFiles });
  } catch (err) {
    await failReview(reviewId, err.message);
    throw err;
  }
}

async function upsertPullRequest(accessToken, owner, repo, pullNumber) {
  const pr = await githubService.getPullRequest(accessToken, owner, repo, pullNumber);

  const result = await query(
    `INSERT INTO pull_requests
       (github_id, repository_owner, repository_name, number, title, author_username, state, created_at, updated_at, merged_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (repository_owner, repository_name, number)
     DO UPDATE SET title = $5, author_username = $6, state = $7, updated_at = $9, merged_at = $10
     RETURNING id`,
    [pr.githubId, owner, repo, pr.number, pr.title, pr.author, pr.state, pr.createdAt, pr.updatedAt, pr.mergedAt]
  );

  return result.rows[0].id;
}

async function createReviewRow(pullRequestId, userId) {
  const result = await query(
    `INSERT INTO reviews (pull_request_id, requested_by_user_id, status, started_at)
     VALUES ($1, $2, 'running', now())
     RETURNING id`,
    [pullRequestId, userId]
  );
  return result.rows[0].id;
}

/**
 * For each finding: determine its fingerprint group (Tier 1/Tier 2),
 * then insert the finding row linked to that group via fingerprint_id.
 * Returns the list of fingerprint ids touched by this review - used
 * afterward to figure out which previously-open fingerprints for these
 * files were NOT redetected (i.e. resolved).
 */
async function insertFindings(reviewId, pullRequestId, findings, owner, repo) {
  const detectedFingerprintIds = [];

  for (const finding of findings) {
    const fingerprintId = await fingerprintFinding({
      owner,
      repo,
      filePath: finding.file,
      category: finding.category,
      title: finding.title,
      description: finding.description,
    });

    detectedFingerprintIds.push(fingerprintId);

    await query(
      `INSERT INTO findings
         (review_id, pull_request_id, category, severity, file_path, line_number, title, description, recommendation, fingerprint_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        reviewId,
        pullRequestId,
        finding.category,
        finding.severity,
        finding.file,
        finding.line,
        finding.title,
        finding.description,
        finding.recommendation,
        fingerprintId,
      ]
    );
  }

  return detectedFingerprintIds;
}

async function completeReview(reviewId, { model, partialAnalysis, skippedFiles }) {
  await query(
    `UPDATE reviews
     SET status = 'completed', model = $1, partial_analysis = $2, skipped_files = $3, completed_at = now()
     WHERE id = $4`,
    [model, partialAnalysis, JSON.stringify(skippedFiles), reviewId]
  );
}

async function failReview(reviewId, errorMessage) {
  await query(
    `UPDATE reviews SET status = 'failed', error_message = $1, completed_at = now() WHERE id = $2`,
    [errorMessage, reviewId]
  );
}

module.exports = { createReview, createQueuedReview, processQueuedReview };