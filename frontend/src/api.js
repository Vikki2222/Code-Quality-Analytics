const BASE = '/api';

async function request(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    credentials: 'include', // send the session cookie
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
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
};

// Full page navigation, not a fetch - GitHub OAuth requires a real
// browser redirect, and this always hits the backend directly
// (bypassing the Vite proxy) since it's a top-level navigation.
export function loginWithGitHub() {
  window.location.href = 'http://localhost:4000/api/auth/github';
}
