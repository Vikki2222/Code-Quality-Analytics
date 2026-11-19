import { Link, useParams } from 'react-router';
import { api } from '../api';
import { useApi } from '../lib/useApi';
import { formatDateTime, plural } from '../lib/format';
import { ButtonLink } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/Badge';
import { ErrorState, Skeleton, StatusMessage } from '../components/ui/StatusMessage';

/** Every review run against this repo, newest first. */
export default function ReviewsPage() {
  const { owner, repo } = useParams();
  const base = `/repos/${owner}/${repo}`;
  const { data, error, loading, reload } = useApi(() => api.getRepoHistory(owner, repo), [owner, repo]);

  return (
    <Card className="overflow-hidden">
      {loading && !data && (
        <div className="space-y-2 p-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      )}
      {error && <ErrorState error={error} what="reviews" onRetry={reload} />}
      {data && data.reviews.length === 0 && (
        <StatusMessage
          title="No reviews yet"
          action={
            <ButtonLink to={`${base}/pulls`} variant="primary">
              Review a pull request
            </ButtonLink>
          }
        />
      )}
      {data && data.reviews.length > 0 && (
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-line text-xs text-muted">
            <tr>
              <th className="px-4 py-2.5 font-normal">Pull request</th>
              <th className="hidden px-4 py-2.5 font-normal sm:table-cell">Findings</th>
              <th className="hidden px-4 py-2.5 font-normal md:table-cell">When</th>
              <th className="px-4 py-2.5 text-right font-normal">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.reviews.map((r) => (
              <tr key={r.review_id} className="hover:bg-surface-2">
                <td className="max-w-0 px-4 py-3">
                  <Link to={`${base}/reviews/${r.review_id}`} className="block truncate text-fg hover:text-accent">
                    <span className="font-mono text-muted">#{r.pr_number}</span> {r.pr_title}
                  </Link>
                </td>
                <td className="hidden px-4 py-3 font-mono text-fg-2 sm:table-cell">
                  {r.status === 'completed' ? plural(Number(r.finding_count), 'finding') : '—'}
                </td>
                <td className="hidden px-4 py-3 text-muted md:table-cell">{formatDateTime(r.created_at)}</td>
                <td className="px-4 py-3 text-right">
                  <StatusBadge status={r.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
