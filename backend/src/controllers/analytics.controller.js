const analyticsService = require('../services/analytics.service');

// Categories are produced by the AI and validated in ai.service; this only
// keeps the filter to a sane shape.
const CATEGORY_PATTERN = /^[a-z]{1,30}$/;
const MAX_PATH_LENGTH = 1000;

async function getDashboard(req, res, next) {
  try {
    const { owner, repo } = req.params;
    const dashboard = await analyticsService.getDashboard(owner, repo);
    res.json(dashboard);
  } catch (err) {
    next(err);
  }
}

/** GET /:owner/:repo/issues?status=open|recurring|resolved&category=security */
async function listIssues(req, res, next) {
  try {
    const { owner, repo } = req.params;
    const { status, category } = req.query;
    if (status !== undefined && !analyticsService.ISSUE_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${analyticsService.ISSUE_STATUSES.join(', ')}` });
    }
    if (category !== undefined && !CATEGORY_PATTERN.test(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }
    const issues = await analyticsService.listIssues(owner, repo, { status, category });
    res.json({ issues });
  } catch (err) {
    next(err);
  }
}

/** GET /:owner/:repo/issues/:id */
async function getIssue(req, res, next) {
  try {
    const { owner, repo, id } = req.params;
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ error: 'Invalid issue id' });
    }
    const issue = await analyticsService.getIssue(owner, repo, id);
    if (!issue) return res.status(404).json({ error: 'Issue not found' });
    res.json(issue);
  } catch (err) {
    next(err);
  }
}

/** GET /:owner/:repo/file?path=src/a.js */
async function getFile(req, res, next) {
  try {
    const { owner, repo } = req.params;
    const filePath = req.query.path;
    if (typeof filePath !== 'string' || filePath.length === 0 || filePath.length > MAX_PATH_LENGTH) {
      return res.status(400).json({ error: 'path query parameter is required' });
    }
    res.json(await analyticsService.getFileDetail(owner, repo, filePath));
  } catch (err) {
    next(err);
  }
}

/** GET /:owner/:repo/pull-reviews - latest review per PR number */
async function getPullReviews(req, res, next) {
  try {
    const { owner, repo } = req.params;
    res.json({ reviews: await analyticsService.getLatestReviewsByPr(owner, repo) });
  } catch (err) {
    next(err);
  }
}

module.exports = { getDashboard, listIssues, getIssue, getFile, getPullReviews };
