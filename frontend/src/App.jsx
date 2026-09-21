import { useState, useEffect } from 'react';
import { api, loginWithGitHub } from './api';
import Sidebar from './components/Sidebar';
import AnalyticsView from './views/AnalyticsView';
import ReviewView from './views/ReviewView';
import HistoryView from './views/HistoryView';

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [activeView, setActiveView] = useState('analytics');

  useEffect(() => {
    api.getCurrentUser()
      .then(u => { setUser(u); return api.getRepositories(); })
      .then(d => setRepos(d.repositories))
      .catch((err) => {
        if (err.status === 401 || !err.status) setUser(null);
      })
      .finally(() => setCheckingAuth(false));
  }, []);

  function handleSelectRepo(repo) {
    setSelectedRepo(repo);
    setActiveView('analytics');
  }

  if (checkingAuth) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-base)',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
        fontSize: 13,
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {user && (
        <Sidebar
          user={user}
          repos={repos}
          selectedRepo={selectedRepo}
          onSelectRepo={handleSelectRepo}
          activeView={activeView}
          onChangeView={setActiveView}
          onLogout={() => {
            api.logout();
            setUser(null);
            setRepos([]);
            setSelectedRepo(null);
          }}
        />
      )}

      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {!user && <LoginScreen />}

        {user && !selectedRepo && (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            fontSize: 13,
            fontFamily: 'var(--font-ui)',
          }}>
            Select a repository from the sidebar
          </div>
        )}

        {user && selectedRepo && activeView === 'analytics' && (
          <AnalyticsView owner={selectedRepo.owner} repo={selectedRepo.name} />
        )}
        {user && selectedRepo && activeView === 'review' && (
          <ReviewView owner={selectedRepo.owner} repo={selectedRepo.name} />
        )}
        {user && selectedRepo && activeView === 'history' && (
          <HistoryView owner={selectedRepo.owner} repo={selectedRepo.name} />
        )}
      </main>
    </div>
  );
}

function LoginScreen() {
  const [hovered, setHovered] = useState(false);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-base)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Dot grid background — graph paper texture, one quiet texture */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'radial-gradient(circle, #30363D 1px, transparent 1px)',
        backgroundSize: '28px 28px',
        opacity: 0.4,
        pointerEvents: 'none',
      }} />

      {/* Content — centered, narrow, disciplined */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0,
        maxWidth: 380,
        width: '100%',
        padding: '0 24px',
      }}>

        {/* Product name — large, structural, monospace */}
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 42,
          fontWeight: 600,
          color: 'var(--text-primary)',
          letterSpacing: '-1.5px',
          lineHeight: 1,
          marginBottom: 16,
          textAlign: 'center',
        }}>
          cq·analytics
        </div>

        {/* Accent rule — one structural element, not decoration */}
        <div style={{
          width: 32,
          height: 2,
          background: 'var(--accent)',
          marginBottom: 20,
          borderRadius: 1,
        }} />

        {/* Description — restrained, functional */}
        <p style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 14,
          color: 'var(--text-muted)',
          textAlign: 'center',
          lineHeight: 1.65,
          marginBottom: 40,
          maxWidth: 300,
        }}>
          Track systemic code quality issues across your GitHub repositories over time.
        </p>

        {/* GitHub connect button — the only CTA, can't be missed */}
        <button
          onClick={loginWithGitHub}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            width: '100%',
            padding: '13px 24px',
            background: hovered ? '#2d7dd2' : 'var(--bg-surface)',
            border: hovered ? '1px solid var(--accent)' : '1px solid var(--border-strong)',
            color: hovered ? '#fff' : 'var(--text-primary)',
            borderRadius: 8,
            fontSize: 14,
            fontFamily: 'var(--font-ui)',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background 0.15s, border-color 0.15s, color 0.15s',
          }}
        >
          {/* GitHub mark SVG — inline so no external dependency */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          Connect GitHub
        </button>

        {/* Fine print — present but not competing */}
        <p style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 11,
          color: 'var(--text-muted)',
          textAlign: 'center',
          marginTop: 16,
          opacity: 0.6,
          lineHeight: 1.5,
        }}>
          Requires access to your repositories and pull requests.
        </p>
      </div>
    </div>
  );
}