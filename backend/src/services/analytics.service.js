const { query } = require('../config/db');

// Severity weights for health score penalty - deterministic, tunable
// constants, not something the LLM decides. Higher severity costs more.
const SEVERITY_WEIGHTS = { critical: 15, high: 8, medium: 4, low: 1 };

/**
 * Repository health score: starts at 100, loses points for every
 * currently open or recurring fingerprint, weighted by severity of
 * its most recent occurrence. Resolved issues cost nothing - the
 * score reflects the CURRENT state of the repo, not its full history.
 *
 * Deliberately calculated here in application code, never by the LLM
 * (per the project's core rule: AI identifies issues, the app
 * calculates metrics from stored data).
 */
async function getRepositoryHealth(owner, repo) {
  const result = await query(
    `SELECT fp.id, fp.status, fp.occurrence_count,
            (SELECT f.severity FROM findings f
             WHERE f.fingerprint_id = fp.id
             ORDER BY f.created_at DESC LIMIT 1) AS latest_severity
     FROM finding_fingerprints fp
     WHERE fp.repository_owner = $1 AND fp.repository_name = $2
       AND fp.status IN ('open', 'recurring')`,
    [owner, repo]
  );

  let penalty = 0;
  for (const row of result.rows) {
    const weight = SEVERITY_WEIGHTS[row.latest_severity] || SEVERITY_WEIGHTS.low;
    // Recurring issues cost more than a first-time open issue - they've
    // proven they don't get fixed, which is worse for repo health.
    const recurrenceMultiplier = row.status === 'recurring' ? 1.5 : 1;
    penalty += weight * recurrenceMultiplier;
  }

  const score = Math.max(0, Math.round(100 - penalty));

  const totals = await query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'open') AS open_count,
       COUNT(*) FILTER (WHERE status = 'resolved') AS resolved_count,
       COUNT(*) FILTER (WHERE status = 'recurring') AS recurring_count
     FROM finding_fingerprints
     WHERE repository_owner = $1 AND repository_name = $2`,
    [owner, repo]
  );

  return {
    score,
    openCount: Number(totals.rows[0].open_count),
    resolvedCount: Number(totals.rows[0].resolved_count),
    recurringCount: Number(totals.rows[0].recurring_count),
  };
}

/**
 * Files with the most accumulated findings - the "hotspot" view.
 * Counts distinct findings (not fingerprints) so a file that keeps
 * getting the same issue flagged repeatedly still shows real volume.
 */
async function getFileHotspots(owner, repo, { limit = 10 } = {}) {
  const result = await query(
    `SELECT f.file_path, COUNT(*) AS finding_count,
            COUNT(DISTINCT f.pull_request_id) AS pr_count
     FROM findings f
     JOIN pull_requests pr ON pr.id = f.pull_request_id
     WHERE pr.repository_owner = $1 AND pr.repository_name = $2
     GROUP BY f.file_path
     ORDER BY finding_count DESC
     LIMIT $3`,
    [owner, repo, limit]
  );

  return result.rows.map((r) => ({
    filePath: r.file_path,
    findingCount: Number(r.finding_count),
    prCount: Number(r.pr_count),
  }));
}

/**
 * Fingerprints that have occurred more than once, ranked by occurrence
 * count - this is the direct payoff of Phase 4's fingerprinting work.
 */
async function getRecurringIssues(owner, repo, { limit = 10 } = {}) {
  const result = await query(
    `SELECT id, file_path, category, representative_title, occurrence_count,
            status, first_detected_at, last_detected_at
     FROM finding_fingerprints
     WHERE repository_owner = $1 AND repository_name = $2
       AND occurrence_count > 1
     ORDER BY occurrence_count DESC
     LIMIT $3`,
    [owner, repo, limit]
  );

  return result.rows;
}

/**
 * Finding counts by category, bucketed by week, over the repo's
 * history - powers the trend chart. Uses date_trunc so weeks with zero
 * findings simply don't appear (acceptable for MVP; a real trend chart
 * would want to fill gaps with zeros, left as a frontend concern).
 */
async function getIssueTrends(owner, repo) {
  const result = await query(
    `SELECT date_trunc('week', f.created_at) AS week, f.category, COUNT(*) AS count
     FROM findings f
     JOIN pull_requests pr ON pr.id = f.pull_request_id
     WHERE pr.repository_owner = $1 AND pr.repository_name = $2
     GROUP BY week, f.category
     ORDER BY week ASC`,
    [owner, repo]
  );

  return result.rows.map((r) => ({
    week: r.week,
    category: r.category,
    count: Number(r.count),
  }));
}

/**
 * Everything the dashboard needs in one call, to avoid the frontend
 * making four separate round trips on page load.
 */
async function getDashboard(owner, repo) {
  const [health, hotspots, recurringIssues, trends, healthHistory, weekAgoScore] = await Promise.all([
    getRepositoryHealth(owner, repo),
    getFileHotspots(owner, repo),
    getRecurringIssues(owner, repo),
    getIssueTrends(owner, repo),
    getHealthHistory(owner, repo),
    getScoreWeekAgo(owner, repo),
  ]);

  return {
    health: { ...health, weekDelta: weekAgoScore === null ? null : health.score - weekAgoScore },
    hotspots,
    recurringIssues,
    trends,
    healthHistory,
  };
}

/**
 * Persist the current health score. Called after each completed review so
 * the app can answer "better or worse than last week?".
 */
async function recordHealthSnapshot(owner, repo, reviewId) {
  const health = await getRepositoryHealth(owner, repo);
  await query(
    `INSERT INTO repo_health_snapshots
       (repository_owner, repository_name, review_id, score, open_count, recurring_count, resolved_count)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [owner, repo, reviewId, health.score, health.openCount, health.recurringCount, health.resolvedCount]
  );
  return health;
}

/** Most recent snapshots, oldest first (ready to chart). */
async function getHealthHistory(owner, repo, { limit = 30 } = {}) {
  const result = await query(
    `SELECT score, created_at FROM repo_health_snapshots
     WHERE repository_owner = $1 AND repository_name = $2
     ORDER BY created_at DESC
     LIMIT $3`,
    [owner, repo, limit]
  );
  return result.rows.reverse().map((r) => ({ score: r.score, at: r.created_at }));
}

/** Latest score recorded at least 7 days ago, or null if there's no history that old. */
async function getScoreWeekAgo(owner, repo) {
  const result = await query(
    `SELECT score FROM repo_health_snapshots
     WHERE repository_owner = $1 AND repository_name = $2
       AND created_at <= now() - interval '7 days'
     ORDER BY created_at DESC
     LIMIT 1`,
    [owner, repo]
  );
  return result.rows[0] ? result.rows[0].score : null;
}

/** One Portfolio card: current health, weekly change, sparkline, last activity. */
async function getRepoSummary(owner, repo) {
  const [health, healthHistory, weekAgoScore, activity] = await Promise.all([
    getRepositoryHealth(owner, repo),
    getHealthHistory(owner, repo, { limit: 20 }),
    getScoreWeekAgo(owner, repo),
    query(
      `SELECT COUNT(r.id) AS review_count, MAX(r.created_at) AS last_review_at
       FROM reviews r
       JOIN pull_requests pr ON pr.id = r.pull_request_id
       WHERE pr.repository_owner = $1 AND pr.repository_name = $2`,
      [owner, repo]
    ),
  ]);

  return {
    health: { ...health, weekDelta: weekAgoScore === null ? null : health.score - weekAgoScore },
    healthHistory,
    reviewCount: Number(activity.rows[0].review_count),
    lastReviewAt: activity.rows[0].last_review_at,
  };
}

// Columns returned for a fingerprint - never the embedding (a large
// vector the client has no use for).
const ISSUE_COLUMNS = `fp.id, fp.file_path, fp.category, fp.representative_title, fp.occurrence_count,
  fp.status, fp.first_detected_at, fp.last_detected_at, fp.resolved_at, fp.resolved_by_review_id,
  (SELECT f.severity FROM findings f WHERE f.fingerprint_id = fp.id
   ORDER BY f.created_at DESC LIMIT 1) AS latest_severity`;

const ISSUE_STATUSES = ['open', 'recurring', 'resolved'];

/**
 * Issue list for a repo. status: one of ISSUE_STATUSES, or omitted for
 * all. Ordered by how often the issue has come back, then recency.
 */
async function listIssues(owner, repo, { status, category, filePath } = {}) {
  const conditions = ['fp.repository_owner = $1', 'fp.repository_name = $2'];
  const params = [owner, repo];
  if (status) {
    params.push(status);
    conditions.push(`fp.status = $${params.length}`);
  }
  if (category) {
    params.push(category);
    conditions.push(`fp.category = $${params.length}`);
  }
  if (filePath) {
    params.push(filePath);
    conditions.push(`fp.file_path = $${params.length}`);
  }

  const result = await query(
    `SELECT ${ISSUE_COLUMNS}
     FROM finding_fingerprints fp
     WHERE ${conditions.join(' AND ')}
     ORDER BY fp.occurrence_count DESC, fp.last_detected_at DESC
     LIMIT 200`,
    params
  );
  return result.rows;
}

/**
 * One issue with every occurrence across PRs, oldest first - the
 * "historical memory" timeline. Null if it doesn't belong to this repo.
 */
async function getIssue(owner, repo, issueId) {
  const issueResult = await query(
    `SELECT ${ISSUE_COLUMNS},
            rpr.number AS resolved_by_pr_number
     FROM finding_fingerprints fp
     LEFT JOIN reviews rr ON rr.id = fp.resolved_by_review_id
     LEFT JOIN pull_requests rpr ON rpr.id = rr.pull_request_id
     WHERE fp.id = $1 AND fp.repository_owner = $2 AND fp.repository_name = $3`,
    [issueId, owner, repo]
  );
  const issue = issueResult.rows[0];
  if (!issue) return null;

  const occurrences = await query(
    `SELECT f.id, f.severity, f.title, f.description, f.recommendation, f.line_number, f.created_at,
            f.review_id, pr.number AS pr_number, pr.title AS pr_title, pr.author_username
     FROM findings f
     JOIN pull_requests pr ON pr.id = f.pull_request_id
     WHERE f.fingerprint_id = $1
     ORDER BY f.created_at ASC, f.id ASC`,
    [issueId]
  );

  return { ...issue, occurrences: occurrences.rows };
}

/** Everything known about one file: its issues and its most recent findings. */
async function getFileDetail(owner, repo, filePath) {
  const [issues, findings] = await Promise.all([
    listIssues(owner, repo, { filePath }),
    query(
      `SELECT f.id, f.severity, f.category, f.title, f.line_number, f.created_at, f.fingerprint_id,
              f.review_id, pr.number AS pr_number, pr.title AS pr_title
       FROM findings f
       JOIN pull_requests pr ON pr.id = f.pull_request_id
       WHERE pr.repository_owner = $1 AND pr.repository_name = $2 AND f.file_path = $3
       ORDER BY f.created_at DESC
       LIMIT 100`,
      [owner, repo, filePath]
    ),
  ]);
  return { filePath, issues, findings: findings.rows };
}

/** Latest review per PR number, so the PR list can show review status. */
async function getLatestReviewsByPr(owner, repo) {
  const result = await query(
    `SELECT DISTINCT ON (pr.number)
            pr.number AS pr_number, r.id AS review_id, r.status, r.created_at,
            (SELECT COUNT(*) FROM findings f WHERE f.review_id = r.id) AS finding_count
     FROM reviews r
     JOIN pull_requests pr ON pr.id = r.pull_request_id
     WHERE pr.repository_owner = $1 AND pr.repository_name = $2
     ORDER BY pr.number, r.created_at DESC`,
    [owner, repo]
  );
  return result.rows.map((r) => ({ ...r, finding_count: Number(r.finding_count) }));
}

module.exports = {
  getRepositoryHealth,
  getFileHotspots,
  getRecurringIssues,
  getIssueTrends,
  getDashboard,
  recordHealthSnapshot,
  getHealthHistory,
  getRepoSummary,
  listIssues,
  getIssue,
  getFileDetail,
  getLatestReviewsByPr,
  ISSUE_STATUSES,
};