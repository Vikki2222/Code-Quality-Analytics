const { query } = require('../config/db');

/** Repos the user follows, in the order they were added. */
async function listTrackedRepos(userId) {
  const result = await query(
    `SELECT repository_owner AS owner, repository_name AS name, created_at
     FROM tracked_repos
     WHERE user_id = $1
     ORDER BY created_at ASC`,
    [userId]
  );
  return result.rows;
}

/** Idempotent: tracking an already-tracked repo is a no-op. */
async function trackRepo(userId, owner, repo) {
  await query(
    `INSERT INTO tracked_repos (user_id, repository_owner, repository_name)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, repository_owner, repository_name) DO NOTHING`,
    [userId, owner, repo]
  );
}

/** Stops showing the repo in the Portfolio. Its review data is kept. */
async function untrackRepo(userId, owner, repo) {
  await query('DELETE FROM tracked_repos WHERE user_id = $1 AND repository_owner = $2 AND repository_name = $3', [
    userId,
    owner,
    repo,
  ]);
}

module.exports = { listTrackedRepos, trackRepo, untrackRepo };
