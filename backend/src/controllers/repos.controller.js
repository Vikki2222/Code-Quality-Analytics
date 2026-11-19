const trackedRepoService = require('../services/trackedRepo.service');
const analyticsService = require('../services/analytics.service');
const { hasRepoAccess, isValidRepoName } = require('../middleware/requireRepoAccess');

function githubAuthExpired(err, res) {
  if (err.response && err.response.status === 401) {
    res.status(401).json({ error: 'GitHub authorization expired. Please log in again.' });
    return true;
  }
  return false;
}

/**
 * GET /api/repos - the Portfolio. Access is re-checked per repo (cached):
 * a repo the user can no longer see stays listed (so they can untrack it)
 * but returns no data.
 */
async function listTracked(req, res, next) {
  try {
    const tracked = await trackedRepoService.listTrackedRepos(req.user.id);
    const repos = await Promise.all(
      tracked.map(async (t) => {
        if (!(await hasRepoAccess(req.user, t.owner, t.name))) {
          return { owner: t.owner, name: t.name, trackedAt: t.created_at, accessLost: true };
        }
        const summary = await analyticsService.getRepoSummary(t.owner, t.name);
        return { owner: t.owner, name: t.name, trackedAt: t.created_at, accessLost: false, ...summary };
      })
    );
    res.json({ repos });
  } catch (err) {
    if (githubAuthExpired(err, res)) return;
    next(err);
  }
}

/** POST /api/repos { owner, repo } */
async function track(req, res, next) {
  try {
    const { owner, repo } = req.body || {};
    if (!isValidRepoName(owner) || !isValidRepoName(repo)) {
      return res.status(400).json({ error: 'Valid owner and repo are required' });
    }
    if (!(await hasRepoAccess(req.user, owner, repo))) {
      return res.status(404).json({ error: 'Repository not found or not accessible.' });
    }
    await trackedRepoService.trackRepo(req.user.id, owner, repo);
    res.status(201).json({ owner, name: repo });
  } catch (err) {
    if (githubAuthExpired(err, res)) return;
    next(err);
  }
}

/** DELETE /api/repos/:owner/:repo - no access check: you can always untrack. */
async function untrack(req, res, next) {
  try {
    await trackedRepoService.untrackRepo(req.user.id, req.params.owner, req.params.repo);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { listTracked, track, untrack };
