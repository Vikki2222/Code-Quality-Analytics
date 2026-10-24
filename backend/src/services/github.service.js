const axios = require('axios');
const logger = require('../config/logger');

const GITHUB_API_BASE = 'https://api.github.com';

function githubClient(accessToken) {
  return axios.create({
    baseURL: GITHUB_API_BASE,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
}

/**
 * List repositories the authenticated user has access to.
 */
async function listUserRepositories(accessToken, { page = 1, perPage = 30 } = {}) {
  const client = githubClient(accessToken);
  const response = await client.get('/user/repos', {
    params: { sort: 'pushed', direction: 'desc', per_page: perPage, page },
  });
  logRateLimit(response);
  return response.data.map(mapRepository);
}

/**
 * List pull requests for a specific repository.
 */
async function listPullRequests(accessToken, owner, repo, { state = 'open', page = 1, perPage = 30 } = {}) {
  const client = githubClient(accessToken);
  const response = await client.get(`/repos/${owner}/${repo}/pulls`, {
    params: { state, per_page: perPage, page, sort: 'updated', direction: 'desc' },
  });
  logRateLimit(response);
  return response.data.map(mapPullRequest);
}

/**
 * Get metadata for a single pull request (not the list-of-many version).
 * Needed by review.service to create/update the pull_requests row with
 * accurate title/state/author before a review is run.
 */
async function getPullRequest(accessToken, owner, repo, pullNumber) {
  const client = githubClient(accessToken);
  const response = await client.get(`/repos/${owner}/${repo}/pulls/${pullNumber}`);
  logRateLimit(response);
  return mapPullRequest(response.data);
}

/**
 * Get the changed files for a specific pull request, each with its own
 * diff ("patch"), status, and line-change counts.
 */
async function getPullRequestFiles(accessToken, owner, repo, pullNumber, { page = 1, perPage = 100 } = {}) {
  const client = githubClient(accessToken);
  const response = await client.get(`/repos/${owner}/${repo}/pulls/${pullNumber}/files`, {
    params: { per_page: perPage, page },
  });
  logRateLimit(response);
  return response.data.map(mapPullRequestFile);
}

/**
 * Whether the token's user can see this repository. GitHub returns 404
 * (not 403) for private repos you can't access. 401 is re-thrown so
 * callers can prompt a re-login.
 */
async function canAccessRepository(accessToken, owner, repo) {
  const client = githubClient(accessToken);
  try {
    const response = await client.get(`/repos/${owner}/${repo}`);
    logRateLimit(response);
    return true;
  } catch (err) {
    if (err.response && (err.response.status === 404 || err.response.status === 403)) {
      return false;
    }
    throw err;
  }
}

function mapPullRequestFile(file) {
  return {
    filename: file.filename,
    status: file.status,
    additions: file.additions,
    deletions: file.deletions,
    changes: file.changes,
    patch: file.patch || null,
    previousFilename: file.previous_filename || null,
  };
}

function mapRepository(repo) {
  return {
    githubId: repo.id,
    owner: repo.owner.login,
    name: repo.name,
    fullName: repo.full_name,
    private: repo.private,
    defaultBranch: repo.default_branch,
    pushedAt: repo.pushed_at,
  };
}

function mapPullRequest(pr) {
  return {
    githubId: pr.id,
    number: pr.number,
    title: pr.title,
    state: pr.state,
    author: pr.user ? pr.user.login : null,
    createdAt: pr.created_at,
    updatedAt: pr.updated_at,
    mergedAt: pr.merged_at,
  };
}

function logRateLimit(response) {
  const remaining = response.headers['x-ratelimit-remaining'];
  const limit = response.headers['x-ratelimit-limit'];
  if (remaining !== undefined && Number(remaining) < 100) {
    logger.warn({ remaining, limit }, 'GitHub API rate limit getting low');
  }
}

module.exports = {
  listUserRepositories,
  listPullRequests,
  getPullRequest,
  getPullRequestFiles,
  canAccessRepository,
};