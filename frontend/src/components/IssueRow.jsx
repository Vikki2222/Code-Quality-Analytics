import { Link } from 'react-router';
import { CategoryTag, SeverityBadge, StatusBadge } from './ui/Badge';
import { FingerprintGlyph } from './Fingerprint';
import { timeAgo } from '../lib/format';

/** One recurring-issue (fingerprint) row; links to its timeline. */
export function IssueRow({ issue, base, showFile = true }) {
  return (
    <li>
      <Link
        to={`${base}/issues/${issue.id}`}
        className="grid grid-cols-[auto_4.25rem_1fr_auto] items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-2"
      >
        <FingerprintGlyph
          seed={issue.id}
          occurrences={issue.occurrence_count}
          severity={issue.latest_severity}
          resolved={issue.status === 'resolved'}
        />
        <SeverityBadge severity={issue.latest_severity} />
        <div className="min-w-0">
          <div className="truncate text-[13px] text-fg">{issue.representative_title}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            {showFile && <span className="truncate font-mono text-[11px] text-fg-2">{issue.file_path}</span>}
            <CategoryTag category={issue.category} />
            <span className="text-[11px] text-muted">last seen {timeAgo(issue.last_detected_at)}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge status={issue.status} />
          <span className="font-mono text-[11px] text-muted">×{issue.occurrence_count}</span>
        </div>
      </Link>
    </li>
  );
}

export function IssueList({ issues, base, showFile }) {
  return (
    <ul className="divide-y divide-line">
      {issues.map((issue) => (
        <IssueRow key={issue.id} issue={issue} base={base} showFile={showFile} />
      ))}
    </ul>
  );
}
