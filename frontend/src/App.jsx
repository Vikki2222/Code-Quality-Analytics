import { useState, useEffect } from 'react';
import { api, loginWithGitHub } from './api';
import FindingsList from './FindingsList';

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    api
      .getCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setCheckingAuth(false));
  }, []);

  if (checkingAuth) {
    return <CenteredMessage text="Loading..." />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header user={user} onLogout={() => setUser(null)} />
      <main className="max-w-3xl mx-auto px-4 py-8">
        {user ? <Dashboard /> : <LoginScreen />}
      </main>
    </div>
  );
}

function Header({ user, onLogout }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
        <h1 className="font-semibold text-slate-900">Code Quality Analytics</h1>
        {user && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">{user.username}</span>
            <button
              onClick={async () => {
                await api.logout();
                onLogout();
              }}
              className="text-sm text-slate-500 hover:text-slate-800"
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

function LoginScreen() {
  return (
    <div className="text-center py-16">
      <p className="text-slate-600 mb-6">Connect your GitHub account to analyze pull requests.</p>
      <button
        onClick={loginWithGitHub}
        className="bg-slate-900 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-slate-800"
      >
        Continue with GitHub
      </button>
    </div>
  );
}

function Dashboard() {
  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [pullRequests, setPullRequests] = useState([]);
  const [selectedPR, setSelectedPR] = useState(null);
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getRepositories().then((data) => setRepos(data.repositories));
  }, []);

  async function selectRepo(repo) {
    setSelectedRepo(repo);
    setSelectedPR(null);
    setReview(null);
    setError(null);
    const data = await api.getPullRequests(repo.owner, repo.name);
    setPullRequests(data.pullRequests);
  }

  async function runReview(pr) {
    setSelectedPR(pr);
    setReview(null);
    setError(null);
    setLoading(true);
    try {
      const result = await api.createReview(selectedRepo.owner, selectedRepo.name, pr.number);
      setReview(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <section>
        <h2 className="text-sm font-medium text-slate-500 mb-2">Repository</h2>
        <div className="flex flex-wrap gap-2">
          {repos.map((repo) => (
            <button
              key={repo.githubId}
              onClick={() => selectRepo(repo)}
              className={`text-sm px-3 py-1.5 rounded-full border ${
                selectedRepo?.githubId === repo.githubId
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'border-slate-300 text-slate-700 hover:border-slate-400'
              }`}
            >
              {repo.name}
            </button>
          ))}
        </div>
      </section>

      {selectedRepo && (
        <section className="mt-6">
          <h2 className="text-sm font-medium text-slate-500 mb-2">Pull requests</h2>
          {pullRequests.length === 0 ? (
            <p className="text-sm text-slate-500">No pull requests found in this repository.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {pullRequests.map((pr) => (
                <button
                  key={pr.githubId}
                  onClick={() => runReview(pr)}
                  className={`text-left text-sm px-3 py-2 rounded-lg border ${
                    selectedPR?.githubId === pr.githubId
                      ? 'border-slate-900'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  #{pr.number} {pr.title}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {loading && <p className="text-sm text-slate-500 mt-6">Running review...</p>}
      {error && <p className="text-sm text-red-600 mt-6">{error}</p>}
      {review && (
        <section className="mt-6">
          <h2 className="text-sm font-medium text-slate-500 mb-2">
            Review #{review.reviewId} — {review.status}
          </h2>
          <FindingsList findings={review.findings} />
        </section>
      )}
    </div>
  );
}

function CenteredMessage({ text }) {
  return (
    <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">{text}</div>
  );
}
