import { useState, useEffect } from 'react';
import { api } from './api';

const STATUS_STYLES = {
  completed: 'bg-green-100 text-green-800 border-green-200',
  failed: 'bg-red-100 text-red-800 border-red-200',
  running: 'bg-blue-100 text-blue-800 border-blue-200',
  queued: 'bg-slate-100 text-slate-600 border-slate-200',
};

export default function ReviewHistory({ owner, repo, onSelectReview }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .getRepoHistory(owner, repo)
      .then((data) => setHistory(data.reviews))
      .finally(() => setLoading(false));
  }, [owner, repo]);

  if (loading) return <p className="text-sm text-slate-500 mt-4">Loading history...</p>;

  if (history.length === 0) {
    return <p className="text-sm text-slate-500 mt-4">No reviews run against this repository yet.</p>;
  }

  return (
    <ul className="mt-4 space-y-2">
      {history.map((r) => (
        <li key={r.review_id}>
          <button
            onClick={() => onSelectReview(r.review_id)}
            className="w-full text-left border border-slate-200 rounded-lg p-3 hover:border-slate-300 flex items-center justify-between"
          >
            <div>
              <p className="text-sm font-medium text-slate-900">
                #{r.pr_number} {r.pr_title}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {new Date(r.created_at).toLocaleString()}
                {r.partial_analysis && ' · partial analysis'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">{r.finding_count} findings</span>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded border ${
                  STATUS_STYLES[r.status] || STATUS_STYLES.queued
                }`}
              >
                {r.status}
              </span>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}