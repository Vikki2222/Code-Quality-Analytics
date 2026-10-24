const githubService = require('../services/github.service');

// GitHub owner/repo names: letters, digits, '-', '_', '.'. Rejecting
// anything else stops path tricks like '..' or encoded '/' from reaching
// the GitHub URL we build for the access check.
const NAME_PATTERN = /^[A-Za-z0-9_.-]{1,100}$/;

// Short-lived per-process cache so dashboard/history loads don't each
// cost a GitHub API call. Revoked access takes effect within the TTL.
const ACCESS_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 10000;
const accessCache = new Map();

function isValidRepoName(name) {
  return typeof name === 'string' && NAME_PATTERN.test(name) && name !== '.' && name !== '..';
}

/**
 * Stored reviews/findings/analytics are keyed by owner/repo, not by user -
 * so before returning them, confirm the caller can see that repo on
 * GitHub. Without this, any logged-in user could read findings for
 * someone else's private repo.
 */
async function hasRepoAccess(user, owner, repo) {
  const key = `${user.id}:${owner}/${repo}`.toLowerCase();
  const cachedUntil = accessCache.get(key);
  if (cachedUntil && cachedUntil > Date.now()) return true;

  const allowed = await githubService.canAccessRepository(user.github_access_token, owner, repo);
  if (allowed) {
    if (accessCache.size >= MAX_CACHE_ENTRIES) accessCache.clear();
    accessCache.set(key, Date.now() + ACCESS_TTL_MS);
  }
  return allowed;
}

async function requireRepoAccess(req, res, next) {
  const { owner, repo } = req.params;
  if (!isValidRepoName(owner) || !isValidRepoName(repo)) {
    return res.status(400).json({ error: 'Invalid repository name' });
  }

  try {
    if (await hasRepoAccess(req.user, owner, repo)) return next();
    return res.status(404).json({ error: 'Repository not found or not accessible.' });
  } catch (err) {
    if (err.response && err.response.status === 401) {
      return res.status(401).json({ error: 'GitHub authorization expired. Please log in again.' });
    }
    next(err);
  }
}

module.exports = { requireRepoAccess, hasRepoAccess, isValidRepoName, accessCache };
