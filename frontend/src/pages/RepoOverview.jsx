import { Link, useParams } from 'react-router';
import { api } from '../api';
import { useApi } from '../lib/useApi';
import { plural, timeAgo } from '../lib/format';
import { ButtonLink } from '../components/ui/Button';
import { Card, Panel, Stat } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/Badge';
import { ErrorState, Skeleton, StatusMessage } from '../components/ui/StatusMessage';
import { ScoreDelta, ScoreValue } from '../components/Score';
import { IssueList } from '../components/IssueRow';
import HealthChart from '../components/charts/HealthChart';
import CategoryTrendChart from '../components/charts/CategoryTrendChart';

function Hotspots({ hotspots, base }) {
  if (hotspots.length === 0) return <p className="text-[13px] text-muted">No hotspots yet.</p>;
  const max = Math.max(...hotspots.map((h) => h.findingCount));
  return (
    <ul className="space-y-3">
      {hotspots.map((h) => (
        <li key={h.filePath}>
          <Link to={`${base}/file?path=${encodeURIComponent(h.filePath)}`} className="group block">
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate font-mono text-xs text-fg-2 group-hover:text-accent">{h.filePath}</span>
              <span className="shrink-0 font-mono text-xs text-muted">{h.findingCount}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3">
              <div className="h-full rounded-full bg-sev-high/80" style={{ width: `${(h.findingCount / max) * 100}%` }} />
            </div>
            <div className="mt-0.5 text-[11px] text-muted">across {plural(h.prCount, 'PR')}</div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function RecentReviews({ reviews, base }) {
  if (reviews.length === 0) return <p className="text-[13px] text-muted">No reviews yet.</p>;
  return (
    <ul className="-mx-4 divide-y divide-line">
      {reviews.slice(0, 6).map((r) => (
        <li key={r.review_id}>
          <Link to={`${base}/reviews/${r.review_id}`} className="block px-4 py-2.5 hover:bg-surface-2">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[13px] text-fg">
                <span className="font-mono text-muted">#{r.pr_number}</span> {r.pr_title}
              </span>
              <StatusBadge status={r.status} />
            </div>
            <div className="mt-0.5 text-[11px] text-muted">
              {plural(Number(r.finding_count), 'finding')} · {timeAgo(r.created_at)}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function RepoOverview() {
  const { owner, repo } = useParams();
  const base = `/repos/${owner}/${repo}`;
  const dashboard = useApi(() => api.getDashboard(owner, repo), [owner, repo]);
  const history = useApi(() => api.getRepoHistory(owner, repo), [owner, repo]);

  if (dashboard.error) return <ErrorState error={dashboard.error} what="this repository" onRetry={dashboard.reload} />;
  if (!dashboard.data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const { health, hotspots, recurringIssues, trends, healthHistory } = dashboard.data;
  const reviews = history.data ? history.data.reviews : [];

  if (trends.length === 0 && hotspots.length === 0 && healthHistory.length === 0 && reviews.length === 0) {
    return (
      <Card>
        <StatusMessage
          title="No reviews yet"
          action={
            <ButtonLink to={`${base}/pulls`} variant="primary">
              Review a pull request
            </ButtonLink>
          }
        >
          Run a review on a pull request to start this repository's history. Each review adds findings, updates the health
          score and links issues that come back.
        </StatusMessage>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="grid grid-cols-2 gap-6 p-5 md:grid-cols-4">
        <div>
          <div className="text-xs text-muted">Health score</div>
          <div className="mt-1">
            <ScoreValue score={health.score} />
          </div>
          <div className="mt-1.5">
            <ScoreDelta delta={health.weekDelta} />
          </div>
        </div>
        <Stat label="Open issues" value={health.openCount} />
        <Stat
          label="Recurring"
          value={health.recurringCount}
          tone={health.recurringCount > 0 ? 'text-recurring' : 'text-fg'}
          hint="Resolved, then came back"
        />
        <Stat label="Resolved" value={health.resolvedCount} tone={health.resolvedCount > 0 ? 'text-good' : 'text-fg'} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Health over time" subtitle="Score after each review" className="lg:col-span-2">
          {healthHistory.length >= 2 ? (
            <HealthChart history={healthHistory} />
          ) : (
            <p className="py-12 text-center text-[13px] text-muted">The chart appears after two or more reviews.</p>
          )}
        </Panel>
        <Panel
          title="Recent reviews"
          action={
            <Link to={`${base}/reviews`} className="text-xs text-accent hover:underline">
              All →
            </Link>
          }
        >
          {history.error ? (
            <ErrorState error={history.error} what="reviews" onRetry={history.reload} compact />
          ) : (
            <RecentReviews reviews={reviews} base={base} />
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="New findings by week" subtitle="Stacked by category" className="lg:col-span-2">
          {trends.length > 0 ? (
            <CategoryTrendChart trends={trends} />
          ) : (
            <p className="py-12 text-center text-[13px] text-muted">No findings recorded yet.</p>
          )}
        </Panel>
        <Panel title="Hotspots" subtitle="Files with the most findings">
          <Hotspots hotspots={hotspots} base={base} />
        </Panel>
      </div>

      <Panel
        title="Top recurring issues"
        subtitle="Issues seen in more than one review"
        bodyClassName=""
        action={
          <Link to={`${base}/issues`} className="text-xs text-accent hover:underline">
            All issues →
          </Link>
        }
      >
        {recurringIssues.length > 0 ? (
          <IssueList issues={recurringIssues.slice(0, 5)} base={base} />
        ) : (
          <p className="px-4 py-8 text-center text-[13px] text-muted">Nothing has come back yet.</p>
        )}
      </Panel>
    </div>
  );
}
