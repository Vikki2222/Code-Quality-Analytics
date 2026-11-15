import { useEffect } from 'react';
import { Link, useParams } from 'react-router';
import { api } from '../api';
import { useApi } from '../lib/useApi';
import { formatDateTime, plural, SEVERITY_ORDER } from '../lib/format';
import { Card, Panel } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/Badge';
import { ErrorState, Skeleton, Spinner, StatusMessage } from '../components/ui/StatusMessage';
import FindingCard from '../components/FindingCard';

const POLL_MS = 2500;

const bySeverity = (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity);

function FindingGroup({ title, subtitle, findings, base, tagFor }) {
  if (findings.length === 0) return null;
  return (
    <section>
      <h2 className="text-[13px] font-medium text-fg">
        {title} <span className="font-mono text-muted">{findings.length}</span>
      </h2>
      <p className="text-xs text-muted">{subtitle}</p>
      <div className="mt-3 space-y-2">
        {[...findings].sort(bySeverity).map((f) => (
          <FindingCard key={f.id} finding={f} base={base} tag={tagFor?.(f)} />
        ))}
      </div>
    </section>
  );
}

/** One review: live progress while it runs, then what this PR introduced, repeated and fixed. */
export default function ReviewPage() {
  const { owner, repo, reviewId } = useParams();
  const base = `/repos/${owner}/${repo}`;
  const { data: review, error, reload } = useApi(() => api.getReview(reviewId), [reviewId]);
  const inProgress = review && (review.status === 'running' || review.status === 'queued');

  // Poll while the worker is still processing. reload() keeps the current
  // data on screen, so this doesn't flicker. `error` is a dependency so a
  // failed poll schedules another attempt instead of stopping.
  useEffect(() => {
    if (!inProgress) return undefined;
    const timer = setTimeout(reload, POLL_MS);
    return () => clearTimeout(timer);
  }, [inProgress, review, error, reload]);

  if (error && !review) return <ErrorState error={error} what="this review" onRetry={reload} />;
  if (!review) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const newFindings = review.findings.filter((f) => f.is_new);
  const repeated = review.findings.filter((f) => !f.is_new);

  return (
    <div className="space-y-4">
      <Link to={`${base}/reviews`} className="text-xs text-muted hover:text-fg">
        ← All reviews
      </Link>

      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={review.status} />
          {review.partialAnalysis && (
            <span className="text-[11px] text-warn" title="Some files were skipped (generated, too large, or over budget)">
              Partial analysis
            </span>
          )}
        </div>
        <h1 className="mt-2 text-xl font-bold tracking-tight text-fg">
          <span className="font-mono text-muted">#{review.pullRequest.number}</span> {review.pullRequest.title}
        </h1>
        <p className="mt-1 text-xs text-muted">
          {review.pullRequest.author ? `by ${review.pullRequest.author} · ` : ''}
          reviewed {formatDateTime(review.createdAt)}
          {review.model ? ` · ${review.model}` : ''}
        </p>

        {review.status === 'completed' && (
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-4 text-[13px]">
            <span>
              <span className="font-mono text-sev-high">{newFindings.length}</span> <span className="text-muted">new</span>
            </span>
            <span>
              <span className="font-mono text-recurring">{repeated.length}</span>{' '}
              <span className="text-muted">seen before</span>
            </span>
            <span>
              <span className="font-mono text-good">{review.resolvedIssues.length}</span>{' '}
              <span className="text-muted">resolved by this PR</span>
            </span>
          </div>
        )}
      </Card>

      {inProgress && (
        <Card>
          <StatusMessage title="Reviewing this pull request…">
            <span className="inline-flex items-center gap-2">
              <Spinner /> Fetching the diff, analysing it and matching findings against this repository's history.
              This page updates automatically.
            </span>
          </StatusMessage>
        </Card>
      )}

      {review.status === 'failed' && (
        <Card>
          <StatusMessage tone="error" title="The review failed">
            {review.errorMessage || 'Unknown error.'} You can start it again from Pull requests.
          </StatusMessage>
        </Card>
      )}

      {review.status === 'completed' && (
        <>
          {review.findings.length === 0 && review.resolvedIssues.length === 0 && (
            <Card>
              <StatusMessage title="No issues found">Nothing systemic was flagged in this pull request.</StatusMessage>
            </Card>
          )}
          <div className="space-y-6">
            <FindingGroup
              title="New in this PR"
              subtitle="First time Chronicles has seen these"
              findings={newFindings}
              base={base}
            />
            <FindingGroup
              title="Seen before"
              subtitle="Already known issues, detected again"
              findings={repeated}
              base={base}
              tagFor={(f) =>
                f.occurrence_count > 1 && (
                  <span className="rounded bg-recurring/10 px-1.5 py-0.5 font-mono text-[10px] text-recurring">
                    seen {f.occurrence_count}×
                  </span>
                )
              }
            />
            {review.resolvedIssues.length > 0 && (
              <Panel title="Resolved by this PR" subtitle="Known issues no longer found in files this PR touched" bodyClassName="">
                <ul className="divide-y divide-line">
                  {review.resolvedIssues.map((issue) => (
                    <li key={issue.id}>
                      <Link to={`${base}/issues/${issue.id}`} className="block px-4 py-3 hover:bg-surface-2">
                        <div className="text-[13px] text-fg">{issue.representative_title}</div>
                        <div className="mt-0.5 font-mono text-[11px] text-fg-2">{issue.file_path}</div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
          </div>
          {review.skippedFiles.length > 0 && (
            <p className="text-xs text-muted">
              {plural(review.skippedFiles.length, 'file')} skipped (generated, lock files, or over the analysis budget).
            </p>
          )}
        </>
      )}
    </div>
  );
}
