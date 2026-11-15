import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { Button } from './ui/Button';
import { ErrorState, Spinner } from './ui/StatusMessage';
import { timeAgo } from '../lib/format';

/**
 * Pick GitHub repositories to track. Lists repos 30 at a time (most
 * recently pushed first) with a client-side filter over what's loaded.
 */
export default function TrackRepoDialog({ tracked, onClose, onTracked }) {
  const dialogRef = useRef(null);
  const [repos, setRepos] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');
  const [pending, setPending] = useState(null);
  const [trackError, setTrackError] = useState(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  useEffect(() => {
    let active = true;
    api.getGitHubRepositories(page).then(
      (data) => {
        if (!active) return;
        setRepos((prev) => [...prev, ...data.repositories]);
        setHasMore(data.repositories.length === 30);
        setLoading(false);
      },
      (err) => {
        if (!active) return;
        setError(err);
        setLoading(false);
      }
    );
    return () => {
      active = false;
    };
  }, [page]);

  const trackedKeys = new Set(tracked.map((r) => `${r.owner}/${r.name}`));
  const query = filter.trim().toLowerCase();
  const visible = query ? repos.filter((r) => r.fullName.toLowerCase().includes(query)) : repos;

  async function track(repo) {
    setPending(repo.fullName);
    setTrackError(null);
    try {
      await api.trackRepo(repo.owner, repo.name);
      onTracked();
    } catch (err) {
      setTrackError(`${repo.fullName}: ${err.message}`);
    } finally {
      setPending(null);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="track-title"
      className="m-auto w-[min(560px,calc(100vw-2rem))] rounded-xl border border-line-strong bg-surface p-0 text-fg shadow-2xl backdrop:bg-black/60"
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 id="track-title" className="text-sm font-semibold">
          Track a repository
        </h2>
        <button type="button" onClick={() => dialogRef.current.close()} className="text-muted hover:text-fg" aria-label="Close">
          ✕
        </button>
      </div>

      <div className="px-5 pt-4">
        <input
          type="search"
          autoFocus
          placeholder="Filter repositories…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-9 w-full rounded-lg border border-line bg-base px-3 text-[13px] text-fg placeholder:text-muted focus:border-accent focus:outline-none"
        />
        {trackError && <p className="mt-2 text-xs text-bad">{trackError}</p>}
      </div>

      <div className="max-h-[50vh] overflow-y-auto px-2 py-3">
        {error && <ErrorState error={error} what="your repositories" compact />}
        <ul>
          {visible.map((repo) => {
            const isTracked = trackedKeys.has(`${repo.owner}/${repo.name}`);
            return (
              <li key={repo.githubId} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-surface-2">
                <div className="min-w-0">
                  <div className="truncate font-mono text-[13px] text-fg">{repo.fullName}</div>
                  <div className="text-[11px] text-muted">
                    {repo.private ? 'Private' : 'Public'} · pushed {timeAgo(repo.pushedAt)}
                  </div>
                </div>
                {isTracked ? (
                  <span className="text-xs text-good">Tracking</span>
                ) : (
                  <Button size="sm" variant="secondary" disabled={pending !== null} onClick={() => track(repo)}>
                    {pending === repo.fullName ? <Spinner className="size-3" /> : 'Track'}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
        {loading && (
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        )}
        {!loading && !error && visible.length === 0 && (
          <p className="py-6 text-center text-[13px] text-muted">
            {query ? 'No loaded repositories match.' : 'No repositories found on your GitHub account.'}
          </p>
        )}
        {!loading && hasMore && !error && (
          <div className="flex justify-center pt-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setLoading(true);
                setPage((p) => p + 1);
              }}
            >
              Load more
            </Button>
          </div>
        )}
      </div>
    </dialog>
  );
}
