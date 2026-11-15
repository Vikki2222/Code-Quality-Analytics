import { useParams, useSearchParams } from 'react-router';
import { api } from '../api';
import { useApi } from '../lib/useApi';
import { CATEGORIES, capitalize, plural } from '../lib/format';
import { Card } from '../components/ui/Card';
import { ErrorState, Skeleton, StatusMessage } from '../components/ui/StatusMessage';
import { IssueList } from '../components/IssueRow';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'recurring', label: 'Recurring' },
  { value: 'resolved', label: 'Resolved' },
];

/** Every fingerprinted issue in the repo. Filters live in the URL so views can be shared. */
export default function IssuesPage() {
  const { owner, repo } = useParams();
  const base = `/repos/${owner}/${repo}`;
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const category = params.get('category') || '';

  const { data, error, loading, reload } = useApi(
    () => api.getIssues(owner, repo, { status: status || undefined, category: category || undefined }),
    [owner, repo, status, category]
  );

  function setFilter(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-line bg-surface p-0.5" role="group" aria-label="Status">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.label}
              type="button"
              aria-pressed={status === f.value}
              onClick={() => setFilter('status', f.value)}
              className={`rounded-md px-3 py-1 text-xs transition-colors ${
                status === f.value ? 'bg-surface-3 text-fg' : 'text-muted hover:text-fg'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <select
          value={category}
          onChange={(e) => setFilter('category', e.target.value)}
          aria-label="Category"
          className="h-8 rounded-lg border border-line bg-surface px-2 text-xs text-fg-2 focus:border-accent focus:outline-none"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {capitalize(c)}
            </option>
          ))}
        </select>
        {data && <span className="ml-auto text-xs text-muted">{plural(data.issues.length, 'issue')}</span>}
      </div>

      <Card className="mt-4 overflow-hidden">
        {loading && !data && (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        )}
        {error && <ErrorState error={error} what="issues" onRetry={reload} />}
        {data && data.issues.length === 0 && (
          <StatusMessage title={status || category ? 'No issues match these filters' : 'No issues yet'}>
            {status || category
              ? 'Try a different status or category.'
              : 'Issues appear here once reviews find something. Each one keeps its full history across PRs.'}
          </StatusMessage>
        )}
        {data && data.issues.length > 0 && <IssueList issues={data.issues} base={base} />}
      </Card>
    </div>
  );
}
