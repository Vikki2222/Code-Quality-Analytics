import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { api } from '../api';
import { useApi } from '../lib/useApi';
import { plural, timeAgo } from '../lib/format';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/Badge';
import { ErrorState, Skeleton, Spinner, StatusMessage } from '../components/ui/StatusMessage';

const STATES = ['open', 'closed', 'all'];

/** Pull requests (live from GitHub) with Chronicles' latest review status for each. */
export default function PullsPage() {
  const { owner, repo } = useParams();
  const base = `/repos/${owner}/${repo}`;
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const state = STATES.includes(params.get('state')) ? params.get('state') : 'open';
  const [starting, setStarting] = useState(null);
  const [startError, setStartError] = useState(null);

  const pulls = useApi(() => api.getPullRequests(owner, repo, state), [owner, repo, state]);
  const reviews = useApi(() => api.getPullReviews(owner, repo), [owner, repo]);

  const latestByPr = new Map((reviews.data?.reviews || []).map((r) => [r.pr_number, r]));

  async function startReview(pr) {
    setStarting(pr.number);
    setStartError(null);
    try {
      const { reviewId } = await api.createReview(owner, repo, pr.number);
      navigate(`${base}/reviews/${reviewId}`);
    } catch (err) {
      setStartError(`PR #${pr.number}: ${err.message}`);
      setStarting(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-line bg-surface p-0.5" role="group" aria-label="Pull request state">
          {STATES.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={state === s}
              onClick={() => setParams({ state: s }, { replace: true })}
              className={`rounded-md px-3 py-1 text-xs capitalize transition-colors ${
                state === s ? 'bg-surface-3 text-fg' : 'text-muted hover:text-fg'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">Reviews run in the background and take about a minute.</p>
      </div>

      {startError && <p className="mt-3 text-[13px] text-bad">{startError}</p>}

      <Card className="mt-4 overflow-hidden">
        {pulls.loading && !pulls.data && (
          <div className="space-y-2 p-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        )}
        {pulls.error && <ErrorState error={pulls.error} what="pull requests" onRetry={pulls.reload} />}
        {pulls.data && pulls.data.pullRequests.length === 0 && (
          <StatusMessage title={`No ${state === 'all' ? '' : `${state} `}pull requests`}>
            {state === 'open' ? 'Try "closed" or "all" to review past pull requests.' : null}
          </StatusMessage>
        )}
        {pulls.data && pulls.data.pullRequests.length > 0 && (
          <ul className="divide-y divide-line">
            {pulls.data.pullRequests.map((pr) => {
              const latest = latestByPr.get(pr.number);
              const inProgress = latest && (latest.status === 'running' || latest.status === 'queued');
              return (
                <li key={pr.githubId} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted">#{pr.number}</span>
                      <span className="truncate text-[13px] text-fg">{pr.title}</span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted">
                      {pr.author} · {pr.mergedAt ? 'merged' : pr.state} · updated {timeAgo(pr.updatedAt)}
                    </div>
                  </div>
                  {latest && (
                    <Link to={`${base}/reviews/${latest.review_id}`} className="flex items-center gap-2 text-xs hover:underline">
                      <StatusBadge status={latest.status} />
                      {latest.status === 'completed' && (
                        <span className="text-muted">{plural(latest.finding_count, 'finding')}</span>
                      )}
                    </Link>
                  )}
                  <Button
                    size="sm"
                    variant={latest ? 'secondary' : 'primary'}
                    disabled={starting !== null || inProgress}
                    onClick={() => startReview(pr)}
                  >
                    {starting === pr.number ? <Spinner className="size-3" /> : latest ? 'Re-review' : 'Review'}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
