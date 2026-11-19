import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../auth/AuthContext';
import { useApi } from '../lib/useApi';
import { plural, timeAgo } from '../lib/format';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ErrorState, Skeleton, StatusMessage } from '../components/ui/StatusMessage';
import { ScoreDelta, ScoreValue, Sparkline } from '../components/Score';
import TrackRepoDialog from '../components/TrackRepoDialog';

function RepoCard({ repo, onUntrack }) {
  if (repo.accessLost) {
    return (
      <Card className="flex flex-col justify-between p-5 opacity-80">
        <div>
          <div className="font-mono text-[13px] text-muted">{repo.owner}/</div>
          <div className="truncate font-mono text-[16px] font-semibold text-fg">{repo.name}</div>
          <p className="mt-3 text-[13px] text-muted">You no longer have access to this repository on GitHub.</p>
        </div>
        <Button variant="danger" size="sm" className="mt-4 self-start" onClick={() => onUntrack(repo)}>
          Stop tracking
        </Button>
      </Card>
    );
  }

  const { health } = repo;
  const neverReviewed = repo.reviewCount === 0;

  return (
    <Link
      to={`/repos/${repo.owner}/${repo.name}`}
      className="group block rounded-[var(--radius-card)] border border-line bg-surface p-5 transition-colors hover:border-line-strong hover:bg-surface-2"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-xs text-muted">{repo.owner}/</div>
          <div className="truncate font-mono text-[16px] font-semibold text-fg group-hover:text-accent">{repo.name}</div>
        </div>
        {!neverReviewed && <ScoreValue score={health.score} />}
      </div>

      {neverReviewed ? (
        <p className="mt-6 text-[13px] text-muted">Not reviewed yet. Open it to review a pull request.</p>
      ) : (
        <>
          <div className="mt-4 flex items-end justify-between gap-3">
            <Sparkline points={repo.healthHistory} />
            <ScoreDelta delta={health.weekDelta} />
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3 text-xs">
            <div>
              <dt className="text-muted">Open</dt>
              <dd className="font-mono text-fg">{health.openCount}</dd>
            </div>
            <div>
              <dt className="text-muted">Recurring</dt>
              <dd className={`font-mono ${health.recurringCount > 0 ? 'text-recurring' : 'text-fg'}`}>{health.recurringCount}</dd>
            </div>
            <div>
              <dt className="text-muted">Resolved</dt>
              <dd className="font-mono text-fg">{health.resolvedCount}</dd>
            </div>
          </dl>
          <div className="mt-3 text-[11px] text-muted">
            {plural(repo.reviewCount, 'review')} · last {timeAgo(repo.lastReviewAt)}
          </div>
        </>
      )}
    </Link>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Burning the midnight oil';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Totals across every reviewed repo, for the header band. */
function summarize(repos) {
  const reviewed = repos.filter((r) => !r.accessLost && r.reviewCount > 0);
  const sum = (key) => reviewed.reduce((n, r) => n + (r.health[key] || 0), 0);
  return {
    reviewed,
    avgScore: reviewed.length ? Math.round(reviewed.reduce((n, r) => n + r.health.score, 0) / reviewed.length) : null,
    open: sum('openCount'),
    recurring: sum('recurringCount'),
    resolved: sum('resolvedCount'),
    // Repos are already sorted lowest score first.
    focus: reviewed[0],
  };
}

/** Header band in the landing hero's style: glow, grid lines, mint accents. */
function PortfolioHero({ username, repos, onTrack }) {
  const stats = summarize(repos);

  return (
    <section className="relative overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
      <svg
        className="pointer-events-none absolute left-1/2 top-[-60%] h-[320px] w-[900px] max-w-none -translate-x-1/2"
        viewBox="0 0 900 320"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <filter id="pf-glow" x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="30" />
          </filter>
          <radialGradient id="pf-glow-fill" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#5ee8d2" stopOpacity="0.35" />
            <stop offset="55%" stopColor="#1f7a5a" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#0a3a2a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="450" cy="160" rx="380" ry="90" fill="url(#pf-glow-fill)" filter="url(#pf-glow)" />
      </svg>
      <div className="pointer-events-none absolute inset-0 hidden md:block" aria-hidden="true">
        {['25%', '50%', '75%'].map((left) => (
          <div key={left} className="absolute inset-y-0 w-px bg-white/5" style={{ left }} />
        ))}
      </div>

      <div className="relative flex flex-wrap items-end justify-between gap-4 p-6 md:p-8">
        <div className="min-w-0">
          <p className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-accent">Your codebase, remembered</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-fg md:text-4xl">
            {greeting()}
            {username ? `, ${username}` : ''}
            <span className="text-accent">.</span>
          </h1>
          <p className="mt-2 text-[14px] text-fg-2">
            {stats.reviewed.length === 0 ? (
              <>
                Every review you run becomes <em className="font-serif text-[17px] text-fg">memory</em>.
              </>
            ) : (
              <>
                Here&apos;s how your code is <em className="font-serif text-[17px] text-fg">holding up</em> across{' '}
                {plural(stats.reviewed.length, 'repository', 'repositories')}.
              </>
            )}
          </p>
        </div>
        <Button onClick={onTrack}>+ Track repository</Button>
      </div>

      {stats.reviewed.length > 0 && (
        <div className="relative grid grid-cols-2 border-t border-line md:grid-cols-4">
          <Stat label="Avg health">
            <ScoreValue score={stats.avgScore} className="text-2xl" />
          </Stat>
          <Stat label="Open issues">
            <span className="text-2xl text-fg">{stats.open}</span>
          </Stat>
          <Stat label="Recurring">
            <span className={`text-2xl ${stats.recurring > 0 ? 'text-recurring' : 'text-fg'}`}>{stats.recurring}</span>
          </Stat>
          <Stat label="Resolved">
            <span className="text-2xl text-good">{stats.resolved}</span>
          </Stat>
        </div>
      )}

      {stats.focus && stats.focus.health.openCount > 0 && (
        <Link
          to={`/repos/${stats.focus.owner}/${stats.focus.name}`}
          className="group relative flex items-center justify-between gap-3 border-t border-line bg-accent/5 px-6 py-3 text-[13px] transition-colors hover:bg-accent/10 md:px-8"
        >
          <span className="min-w-0 truncate text-fg-2">
            <span className="font-display font-bold text-accent">Focus next</span>
            <span className="mx-2 text-muted">·</span>
            <span className="font-mono text-fg">
              {stats.focus.owner}/{stats.focus.name}
            </span>
            <span className="ml-2 text-muted">has the lowest health score</span>
          </span>
          <ArrowRight size={16} className="shrink-0 text-accent transition-transform group-hover:translate-x-1" />
        </Link>
      )}
    </section>
  );
}

function Stat({ label, children }) {
  return (
    <div className="border-line px-6 py-4 md:px-8 [&:not(:last-child)]:border-r [&:nth-child(2)]:max-md:border-r-0">
      <div className="text-[11px] uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-1 font-mono font-semibold tabular">{children}</div>
    </div>
  );
}

/** Lowest score first: the repo that needs attention is top-left. */
function byNeedsAttention(a, b) {
  const score = (r) => (r.accessLost || r.reviewCount === 0 ? 101 : r.health.score);
  return score(a) - score(b);
}

export default function Portfolio() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useApi(() => api.getTrackedRepos(), []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [untrackError, setUntrackError] = useState(null);

  async function untrack(repo) {
    setUntrackError(null);
    try {
      await api.untrackRepo(repo.owner, repo.name);
      reload();
    } catch (err) {
      setUntrackError(err.message);
    }
  }

  const repos = data ? [...data.repos].sort(byNeedsAttention) : [];

  return (
    <div>
      <PortfolioHero username={user?.username} repos={repos} onTrack={() => setDialogOpen(true)} />

      {untrackError && <p className="mt-4 text-[13px] text-bad">{untrackError}</p>}

      <div className="mt-8">
        {repos.length > 0 && (
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="font-display text-sm font-bold text-fg">Repositories</h2>
            <p className="text-xs text-muted">Lowest health first</p>
          </div>
        )}
        {loading && !data && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-52" />
            ))}
          </div>
        )}
        {error && <ErrorState error={error} what="your repositories" onRetry={reload} />}
        {data && repos.length === 0 && (
          <Card>
            <StatusMessage
              title="Track your first repository"
              action={<Button onClick={() => setDialogOpen(true)}>+ Track repository</Button>}
            >
              Choose the repositories you want Chronicles to follow. Each review adds to its history: recurring issues,
              hotspots and a health score over time.
            </StatusMessage>
          </Card>
        )}
        {repos.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {repos.map((repo) => (
              <RepoCard key={`${repo.owner}/${repo.name}`} repo={repo} onUntrack={untrack} />
            ))}
          </div>
        )}
      </div>

      {dialogOpen && (
        <TrackRepoDialog
          tracked={data ? data.repos : []}
          onClose={() => setDialogOpen(false)}
          onTracked={reload}
        />
      )}
    </div>
  );
}
