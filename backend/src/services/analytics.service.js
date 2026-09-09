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
  const [health, hotspots, recurringIssues, trends] = await Promise.all([
    getRepositoryHealth(owner, repo),
    getFileHotspots(owner, repo),
    getRecurringIssues(owner, repo),
    getIssueTrends(owner, repo),
  ]);

  return { health, hotspots, recurringIssues, trends };
}

module.exports = { getRepositoryHealth, getFileHotspots, getRecurringIssues, getIssueTrends, getDashboard };