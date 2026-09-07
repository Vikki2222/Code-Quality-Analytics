const axios = require('axios');

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
 * Sorted by most recently pushed, since those are most likely
 * to be actively worked on and relevant to analyze.
 */
async function listUserRepositories(accessToken, { page = 1, perPage = 30 } = {}) {
  const client = githubClient(accessToken);
  const response = await client.get('/user/repos', {
    params: {
      sort: 'pushed',
      direction: 'desc',
      per_page: perPage,
      page,
    },
  });

  logRateLimit(response);

  return response.data.map(mapRepository);
}

/**
 * List open pull requests for a specific repository.
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
 * Get the changed files for a specific pull request, each with its own
 * diff ("patch"), status, and line-change counts.
 *
 * We deliberately use /pulls/:number/files rather than requesting the
 * raw whole-PR diff (Accept: application/vnd.github.v3.diff). The
 * per-file shape is what the filtering/budgeting pipeline needs:
 * - additions/deletions/changes -> rank files by signal
 * - filename -> filter out vendored/generated paths, detect file type
 * - status ("added"/"modified"/"removed"/"renamed") -> handle renames
 * - patch -> the actual unified diff hunk for just that file
 *
 * Note: GitHub omits `patch` for binary files and for individual files
 * whose diff exceeds ~1MB or ~3000 lines - callers must handle a
 * missing patch field rather than assuming it's always present.
 *
 * GitHub paginates this at up to 100 files per page (`perPage` below).
 * Large PRs may need multiple pages - not handled yet, flagged as a
 * follow-up once we see whether it matters in practice.
 */
async function getPullRequestFiles(accessToken, owner, repo, pullNumber, { page = 1, perPage = 100 } = {}) {
  const client = githubClient(accessToken);
  const response = await client.get(`/repos/${owner}/${repo}/pulls/${pullNumber}/files`, {
    params: { per_page: perPage, page },
  });

  logRateLimit(response);

  return response.data.map(mapPullRequestFile);
}

function mapPullRequestFile(file) {
  return {
    filename: file.filename,
    // 'added' | 'modified' | 'removed' | 'renamed' | 'copied' | 'changed' | 'unchanged'
    status: file.status,
    additions: file.additions,
    deletions: file.deletions,
    changes: file.changes,
    // Present for text diffs under GitHub's size limit; undefined for
    // binary files or oversized individual-file diffs.
    patch: file.patch || null,
    previousFilename: file.previous_filename || null, // set when status === 'renamed'
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

// GitHub returns rate-limit headers on every response. Logging this now
// (rather than only reacting once we hit 0) makes it easy to spot a
// runaway loop of unnecessary calls during development - see doc
// section 20 "Do not make unnecessary API calls."
function logRateLimit(response) {
  const remaining = response.headers['x-ratelimit-remaining'];
  const limit = response.headers['x-ratelimit-limit'];
  if (remaining !== undefined && Number(remaining) < 100) {
    console.warn(`GitHub API rate limit getting low: ${remaining}/${limit} remaining`);
  }
}

module.exports = { listUserRepositories, listPullRequests, getPullRequestFiles };
