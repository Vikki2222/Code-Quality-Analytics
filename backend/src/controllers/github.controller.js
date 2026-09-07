const githubService = require('../services/github.service');

async function getRepositories(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const repos = await githubService.listUserRepositories(req.user.github_access_token, { page });
    res.json({ repositories: repos, page });
  } catch (err) {
    // GitHub 401 usually means the stored token was revoked - surface
    // that distinctly so the frontend can prompt a re-login rather than
    // showing a generic error.
    if (err.response && err.response.status === 401) {
      return res.status(401).json({ error: 'GitHub authorization expired. Please log in again.' });
    }
    next(err);
  }
}

async function getPullRequestFiles(req, res, next) {
  try {
    const { owner, repo, number } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const files = await githubService.getPullRequestFiles(req.user.github_access_token, owner, repo, number, {
      page,
    });
    res.json({ files, page });
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

async function getPullRequests(req, res, next) {
  try {
    const { owner, repo } = req.params;
    const state = req.query.state || 'open';
    const page = parseInt(req.query.page, 10) || 1;
    const pullRequests = await githubService.listPullRequests(req.user.github_access_token, owner, repo, {
      state,
      page,
    });
    res.json({ pullRequests, page });
  } catch (err) {
    if (err.response && err.response.status === 401) {
      return res.status(401).json({ error: 'GitHub authorization expired. Please log in again.' });
    }
    if (err.response && err.response.status === 404) {
      return res.status(404).json({ error: 'Repository not found or not accessible.' });
    }
    next(err);
  }
}

module.exports = { getRepositories, getPullRequests, getPullRequestFiles };
