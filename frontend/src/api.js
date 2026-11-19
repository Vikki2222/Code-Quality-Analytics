const BASE = '/api';

async function request(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    // Session (or GitHub token) expired mid-use: AuthProvider drops back to
    // the landing page. /auth/me is excluded - a 401 there is the normal
    // "not logged in" check.
    if (response.status === 401 && path !== '/auth/me') {
      window.dispatchEvent(new Event('auth:expired'));
    }
    const body = await response.json().catch(() => ({}));
    const error = new Error(body.error || `Request failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return response.status === 204 ? null : response.json();
}

const repoPath = (owner, repo) => `${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;

export const api = {
  getCurrentUser: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),

  // GitHub (live)
  getGitHubRepositories: (page = 1) => request(`/github/repositories?page=${page}`),
  getPullRequests: (owner, repo, state = 'open') =>
    request(`/github/repositories/${repoPath(owner, repo)}/pulls?state=${state}`),

  // Tracked repos (Portfolio)
  getTrackedRepos: () => request('/repos'),
  trackRepo: (owner, repo) => request('/repos', { method: 'POST', body: JSON.stringify({ owner, repo }) }),
  untrackRepo: (owner, repo) => request(`/repos/${repoPath(owner, repo)}`, { method: 'DELETE' }),

  // Repo analytics
  getDashboard: (owner, repo) => request(`/analytics/${repoPath(owner, repo)}/dashboard`),
  getIssues: (owner, repo, { status, category } = {}) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (category) params.set('category', category);
    const qs = params.toString();
    return request(`/analytics/${repoPath(owner, repo)}/issues${qs ? `?${qs}` : ''}`);
  },
  getIssue: (owner, repo, id) => request(`/analytics/${repoPath(owner, repo)}/issues/${id}`),
  getFile: (owner, repo, path) =>
    request(`/analytics/${repoPath(owner, repo)}/file?path=${encodeURIComponent(path)}`),
  getPullReviews: (owner, repo) => request(`/analytics/${repoPath(owner, repo)}/pull-reviews`),

  // Reviews
  createReview: (owner, repo, pullNumber) =>
    request('/reviews', { method: 'POST', body: JSON.stringify({ owner, repo, pullNumber }) }),
  getReview: (reviewId) => request(`/reviews/${reviewId}`),
  getRepoHistory: (owner, repo) => request(`/reviews/history/${repoPath(owner, repo)}`),
};

export function loginWithGitHub() {
  // Relative so it works on whatever host serves the app (nginx proxies /api).
  window.location.href = `${BASE}/auth/github`;
}
