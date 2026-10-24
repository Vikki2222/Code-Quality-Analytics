import { loginWithGitHub } from '../api';

export default function Sidebar({
  user,
  repos,
  selectedRepo,
  onSelectRepo,
  activeView,
  onChangeView,
  onLogout,
}) {
  return (
    // Full-width header block on phones, fixed 240px column from md up.
    <aside
      className="w-full md:w-60 md:min-h-screen shrink-0 border-b md:border-b-0 md:border-r"
      style={{
        background: 'var(--bg-surface)',
        borderColor: 'var(--border)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div
            style={{
              width: 8,
              height: 24,
              background: 'var(--accent)',
              borderRadius: 2,
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              fontSize: 13,
              color: 'var(--text-primary)',
              letterSpacing: '-0.3px',
            }}
          >
            Chronicles
          </span>
        </div>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <img
              src={user.avatarUrl}
              alt=""
              style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid var(--border)' }}
            />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user.username}</span>
          </div>
        )}
      </div>

      {repos.length > 0 && (
        <div
          className="max-h-48 md:max-h-none overflow-y-auto"
          style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}
        >
          <div
            style={{
              padding: '4px 16px 8px',
              fontSize: 11,
              color: 'var(--text-muted)',
              textTransform: 'none',
              letterSpacing: 0,
            }}
          >
            Repositories
          </div>
          {repos.map((repo) => (
            <button
              key={repo.githubId}
              onClick={() => onSelectRepo(repo)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '6px 16px',
                background:
                  selectedRepo?.githubId === repo.githubId ? 'var(--bg-surface-2)' : 'transparent',
                border: 'none',
                borderLeft:
                  selectedRepo?.githubId === repo.githubId ? '2px solid var(--accent)' : '2px solid transparent',
                color:
                  selectedRepo?.githubId === repo.githubId ? 'var(--text-primary)' : 'var(--text-muted)',
                fontSize: 13,
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {repo.name}
            </button>
          ))}
        </div>
      )}

      {selectedRepo && (
        <nav style={{ padding: '12px 0', flex: 1 }}>
          {[
            { id: 'analytics', label: 'Analytics' },
            { id: 'review', label: 'Run Review' },
            { id: 'history', label: 'History' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '7px 16px',
                background: activeView === item.id ? 'var(--bg-surface-2)' : 'transparent',
                border: 'none',
                borderLeft: activeView === item.id ? '2px solid var(--accent)' : '2px solid transparent',
                color: activeView === item.id ? 'var(--text-primary)' : 'var(--text-muted)',
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
      )}

      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
        {user ? (
          <button
            onClick={onLogout}
            style={{
              width: '100%',
              padding: '6px 12px',
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
              borderRadius: 6,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        ) : (
          <button
            onClick={loginWithGitHub}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: 'var(--accent)',
              border: 'none',
              color: '#fff',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Connect GitHub
          </button>
        )}
      </div>
    </aside>
  );
}
