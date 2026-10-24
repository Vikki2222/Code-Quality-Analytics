const BASE = '/api';

async function request(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    // Session (or GitHub token) expired mid-use: App drops back to login.
    // /auth/me is excluded - a 401 there is the normal "not logged in" check.
    if (response.status === 401 && path !== '/auth/me') {
      window.dispatchEvent(new Event('auth:expired'));
    }
    const body = await response.json().catch(() => ({}));
    const error = new Error(body.error || `Request failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

export const api = {
  getCurrentUser: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getRepositories: () => request('/github/repositories'),
  getPullRequests: (owner, repo) => request(`/github/repositories/${owner}/${repo}/pulls?state=all`),
  createReview: (owner, repo, pullNumber) =>
    request('/reviews', {
      method: 'POST',
      body: JSON.stringify({ owner, repo, pullNumber }),
    }),
  getReview: (reviewId) => request(`/reviews/${reviewId}`),
  getRepoHistory: (owner, repo) => request(`/reviews/history/${owner}/${repo}`),
  getDashboard: (owner, repo) => request(`/analytics/${owner}/${repo}/dashboard`),
};

export function loginWithGitHub() {
  // Relative so it works on whatever host serves the app (nginx proxies /api).
  window.location.href = `${BASE}/auth/github`;
}