import { Link, useParams } from 'react-router';
import { RotateCcw } from 'lucide-react';
import { api } from '../api';
import { useApi } from '../lib/useApi';
import { formatDate, plural } from '../lib/format';
import { Card, Panel, Stat } from '../components/ui/Card';
import { CategoryTag, SeverityBadge, StatusBadge } from '../components/ui/Badge';
import { ErrorState, Skeleton } from '../components/ui/StatusMessage';
import { FingerprintGlyph } from '../components/Fingerprint';

/**
 * Turn occurrences + the last resolution into a chronological story:
 * each detection, the resolution, and (for recurring issues) the
 * detections after it, marked as having come back.
 */
function buildTimeline(issue) {
  const resolvedAt = issue.resolved_at ? new Date(issue.resolved_at) : null;
  const events = issue.occurrences.map((o, i) => ({
    type: 'occurrence',
    at: new Date(o.created_at),
    occurrence: o,
    first: i === 0,
    cameBack: resolvedAt !== null && new Date(o.created_at) > resolvedAt,
  }));
  if (resolvedAt) {
    events.push({ type: 'resolved', at: resolvedAt, prNumber: issue.resolved_by_pr_number, reviewId: issue.resolved_by_review_id });
  }
  return events.sort((a, b) => a.at - b.at);
}

function Occurrence({ event, base }) {
  const o = event.occurrence;
  return (
    <>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`inline-flex items-center gap-1 font-medium ${event.cameBack ? 'text-recurring' : 'text-fg'}`}>
          {event.cameBack && <RotateCcw size={12} aria-hidden="true" />}
          {event.first ? 'First detected' : event.cameBack ? 'Came back' : 'Detected again'}
        </span>
        <span className="text-muted">in</span>
        <Link to={`${base}/reviews/${o.review_id}`} className="font-mono text-accent hover:underline">
          PR #{o.pr_number}
        </Link>
        <span className="truncate text-fg-2">{o.pr_title}</span>
        <SeverityBadge severity={o.severity} />
      </div>
      <div className="mt-0.5 text-[11px] text-muted">
        {formatDate(o.created_at)}
        {o.author_username ? ` · by ${o.author_username}` : ''}
        {o.line_number ? ` · line ${o.line_number}` : ''}
      </div>
      <details className="mt-2 group">
        <summary className="cursor-pointer text-xs text-muted hover:text-fg">What was flagged</summary>
        <div className="mt-2 space-y-2 text-[13px] text-fg-2">
          <p>{o.description}</p>
          {o.recommendation && <p className="border-l-2 border-accent pl-3">{o.recommendation}</p>}
        </div>
      </details>
    </>
  );
}

export default function IssueDetail() {
  const { owner, repo, issueId } = useParams();
  const base = `/repos/${owner}/${repo}`;
  const { data: issue, error, reload } = useApi(() => api.getIssue(owner, repo, issueId), [owner, repo, issueId]);

  if (error) return <ErrorState error={error} what="this issue" onRetry={reload} />;
  if (!issue) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  const timeline = buildTimeline(issue);

  return (
    <div className="space-y-4">
      <Link to={`${base}/issues`} className="text-xs text-muted hover:text-fg">
        ← All issues
      </Link>

      <Card className="p-5">
        <div className="flex items-start gap-4">
          <FingerprintGlyph
            seed={issueId}
            occurrences={issue.occurrence_count}
            severity={issue.latest_severity}
            resolved={issue.status === 'resolved'}
            size={64}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] text-muted">[ FP-{String(issueId).padStart(4, '0')} ]</span>
              <SeverityBadge severity={issue.latest_severity} />
              <StatusBadge status={issue.status} />
              <CategoryTag category={issue.category} />
            </div>
            <h1 className="mt-2 text-xl font-bold tracking-tight text-fg">{issue.representative_title}</h1>
            <Link
              to={`${base}/file?path=${encodeURIComponent(issue.file_path)}`}
              className="mt-1 inline-block break-all font-mono text-xs text-fg-2 hover:text-accent"
            >
              {issue.file_path}
            </Link>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-6 border-t border-line pt-4 md:grid-cols-4">
          <Stat label="Occurrences" value={issue.occurrence_count} tone={issue.occurrence_count > 1 ? 'text-recurring' : 'text-fg'} />
          <Stat label="First seen" value={<span className="text-[16px]">{formatDate(issue.first_detected_at)}</span>} />
          <Stat label="Last seen" value={<span className="text-[16px]">{formatDate(issue.last_detected_at)}</span>} />
          <Stat
            label="Last resolved"
            value={<span className="text-[16px]">{issue.resolved_at ? formatDate(issue.resolved_at) : 'Never'}</span>}
            hint={issue.resolved_by_pr_number ? `in PR #${issue.resolved_by_pr_number}` : undefined}
          />
        </div>
      </Card>

      <Panel title="Timeline" subtitle={`${plural(issue.occurrences.length, 'detection')} across pull requests`}>
        <ol className="relative ml-2 border-l border-line-strong">
          {timeline.map((event, i) => (
            <li key={i} className="relative pb-6 pl-6 last:pb-0">
              <span
                aria-hidden="true"
                className={`absolute -left-[5px] top-1 size-2.5 rounded-full ring-4 ring-surface ${
                  event.type === 'resolved' ? 'bg-good' : event.cameBack ? 'bg-recurring' : event.first ? 'bg-sev-high' : 'bg-muted'
                }`}
              />
              {event.type === 'resolved' ? (
                <div className="text-xs">
                  <span className="font-medium text-good">Resolved</span>
                  {event.prNumber && (
                    <>
                      <span className="text-muted"> - not found when </span>
                      <Link to={`${base}/reviews/${event.reviewId}`} className="font-mono text-accent hover:underline">
                        PR #{event.prNumber}
                      </Link>
                      <span className="text-muted"> touched this file</span>
                    </>
                  )}
                  <div className="mt-0.5 text-[11px] text-muted">{formatDate(event.at)}</div>
                </div>
              ) : (
                <Occurrence event={event} base={base} />
              )}
            </li>
          ))}
        </ol>
      </Panel>
    </div>
  );
}
