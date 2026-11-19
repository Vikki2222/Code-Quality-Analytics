import { Link, useParams, useSearchParams } from 'react-router';
import { api } from '../api';
import { useApi } from '../lib/useApi';
import { formatDate, plural } from '../lib/format';
import { Card, Panel } from '../components/ui/Card';
import { CategoryTag, SeverityBadge } from '../components/ui/Badge';
import { ErrorState, Skeleton, StatusMessage } from '../components/ui/StatusMessage';
import { IssueList } from '../components/IssueRow';

/** Everything Chronicles knows about one file: its issues and recent findings. */
export default function FilePage() {
  const { owner, repo } = useParams();
  const [params] = useSearchParams();
  const path = params.get('path') || '';
  const base = `/repos/${owner}/${repo}`;
  const { data, error, reload } = useApi(
    () => (path ? api.getFile(owner, repo, path) : Promise.resolve(null)),
    [owner, repo, path]
  );

  if (!path) return <StatusMessage title="No file selected">Open a file from a hotspot, issue or finding.</StatusMessage>;
  if (error) return <ErrorState error={error} what="this file" onRetry={reload} />;
  if (!data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const openCount = data.issues.filter((i) => i.status !== 'resolved').length;

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="text-xs text-muted">File</div>
        <h1 className="mt-1 break-all font-mono text-[16px] font-semibold text-fg">{path}</h1>
        <p className="mt-2 text-[13px] text-muted">
          {plural(data.issues.length, 'issue')} tracked · {openCount} not resolved ·{' '}
          {plural(data.findings.length, 'recent finding')}
        </p>
      </Card>

      <Panel title="Issues in this file" bodyClassName="">
        {data.issues.length > 0 ? (
          <IssueList issues={data.issues} base={base} showFile={false} />
        ) : (
          <p className="px-4 py-8 text-center text-[13px] text-muted">No issues recorded for this file.</p>
        )}
      </Panel>

      <Panel title="Findings history" subtitle="Most recent first" bodyClassName="">
        {data.findings.length > 0 ? (
          <ul className="divide-y divide-line">
            {data.findings.map((f) => (
              <li key={f.id} className="flex items-start gap-3 px-4 py-3">
                <SeverityBadge severity={f.severity} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] text-fg">{f.title}</div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-muted">
                    <Link to={`${base}/reviews/${f.review_id}`} className="font-mono text-accent hover:underline">
                      PR #{f.pr_number}
                    </Link>
                    <span>{formatDate(f.created_at)}</span>
                    {f.line_number && <span>line {f.line_number}</span>}
                    <CategoryTag category={f.category} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-8 text-center text-[13px] text-muted">No findings for this file.</p>
        )}
      </Panel>
    </div>
  );
}
