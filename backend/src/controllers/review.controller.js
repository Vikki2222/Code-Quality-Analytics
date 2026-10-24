const reviewService = require('../services/review.service');
const { enqueueReview } = require('../queues/review.queue');
const { query } = require('../config/db');
const { hasRepoAccess } = require('../middleware/requireRepoAccess');

async function createReview(req, res, next) {
  try {
    const { owner, repo, pullNumber } = req.body;

    if (!owner || !repo || !pullNumber) {
      return res.status(400).json({ error: 'owner, repo, and pullNumber are required' });
    }

    const { reviewId } = await reviewService.createQueuedReview({
      userId: req.user.id,
      accessToken: req.user.github_access_token,
      owner,
      repo,
      pullNumber,
    });

    await enqueueReview({
      userId: req.user.id,
      owner,
      repo,
      pullNumber,
      reviewId,
    });

    res.status(202).json({ reviewId, status: 'queued' });
  } catch (err) {
    if (err.response && err.response.status === 401) {
      return res.status(401).json({ error: 'GitHub authorization expired. Please log in again.' });
    }
    if (err.response && err.response.status === 404) {
      return res.status(404).json({ error: 'Pull request not found or not accessible.' });
    }
    next(err);
  }
}

async function getReview(req, res, next) {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ error: 'Invalid review id' });
    }

    const reviewResult = await query(
      `SELECT r.*, pr.repository_owner, pr.repository_name
       FROM reviews r
       JOIN pull_requests pr ON pr.id = r.pull_request_id
       WHERE r.id = $1`,
      [id]
    );
    const review = reviewResult.rows[0];

    // Same 404 for "doesn't exist" and "not yours" - don't reveal which
    // review ids exist on other users' private repos.
    if (!review || !(await hasRepoAccess(req.user, review.repository_owner, review.repository_name))) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const findingsResult = await query(
      `SELECT f.*, fp.occurrence_count, fp.status AS fingerprint_status, fp.first_detected_at
       FROM findings f
       LEFT JOIN finding_fingerprints fp ON f.fingerprint_id = fp.id
       WHERE f.review_id = $1`,
      [id]
    );

    res.json({
      reviewId: review.id,
      status: review.status,
      model: review.model,
      partialAnalysis: review.partial_analysis,
      errorMessage: review.error_message,
      findings: findingsResult.rows,
    });
  } catch (err) {
    if (err.response && err.response.status === 401) {
      return res.status(401).json({ error: 'GitHub authorization expired. Please log in again.' });
    }
    next(err);
  }
}

/**
 * GET /api/reviews/history/:owner/:repo
 * All reviews ever run against this repo, across all PRs, most recent
 * first - this is the "historical memory" view, not just a single
 * review's results. finding_count is computed via a correlated
 * subquery rather than a JOIN+GROUP BY, since it's simpler to read at
 * this data volume and the table sizes here don't justify optimizing
 * for it yet.
 */
async function getRepoHistory(req, res, next) {
  try {
    const { owner, repo } = req.params;

    const result = await query(
      `SELECT
         r.id AS review_id,
         r.status,
         r.model,
         r.partial_analysis,
         r.created_at,
         r.completed_at,
         pr.number AS pr_number,
         pr.title AS pr_title,
         (SELECT COUNT(*) FROM findings f WHERE f.review_id = r.id) AS finding_count
       FROM reviews r
       JOIN pull_requests pr ON pr.id = r.pull_request_id
       WHERE pr.repository_owner = $1 AND pr.repository_name = $2
       ORDER BY r.created_at DESC`,
      [owner, repo]
    );

    res.json({ reviews: result.rows });
  } catch (err) {
    next(err);
  }
}

module.exports = { createReview, getReview, getRepoHistory };