import { useState, useEffect } from 'react';
import { api } from '../api';
import FindingCard from '../components/FindingCard';
import StatusMessage from '../components/StatusMessage';

const STATUS_COLORS = { completed: 'var(--success)', failed: 'var(--danger)' };

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return '1d ago';
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function HistoryView({ owner, repo }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState(null);
  const [reviewData, setReviewData] = useState(null);
  const [loadingReview, setLoadingReview] = useState(false);
  const [error, setError] = useState(null);
  const [reviewError, setReviewError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Views remount per repo (App keys them), so initial state already says
  // "loading"; only a retry needs to reset it.
  function retry() {
    setLoading(true);
    setError(null);
    setReloadKey((k) => k + 1);
  }

  useEffect(() => {
    api
      .getRepoHistory(owner, repo)
      .then((d) => setHistory(d.reviews))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [owner, repo, reloadKey]);

  async function loadReview(reviewId) {
    setSelectedReview(reviewId);
    setReviewData(null);
    setReviewError(null);
    setLoadingReview(true);
    try {
      const data = await api.getReview(reviewId);
      setReviewData(data);
    } catch (err) {
      setReviewError(err.message);
    } finally {
      setLoadingReview(false);
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] md:min-h-[calc(100vh-1px)]">
      <div
        className="max-h-72 md:max-h-none overflow-y-auto border-b md:border-b-0 md:border-r"
        style={{ borderColor: 'var(--border)', padding: '16px 0' }}
      >
        {!loading && !error && (
          <div style={{ padding: '4px 16px 10px', fontSize: 11, color: 'var(--text-muted)' }}>
            {history.length} {history.length === 1 ? 'review' : 'reviews'}
          </div>
        )}
        {loading && <StatusMessage>Loading...</StatusMessage>}
        {error && (
          <StatusMessage tone="error" onRetry={retry}>
            Could not load history: {error}
          </StatusMessage>
        )}
        {!loading && !error && history.length === 0 && (
          <StatusMessage>No reviews yet. Run one from the Run Review tab.</StatusMessage>
        )}
        {history.map((r) => (
          <button
            key={r.review_id}
            onClick={() => loadReview(r.review_id)}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '10px 16px',
              background: selectedReview === r.review_id ? 'var(--bg-surface-2)' : 'transparent',
              border: 'none',
              borderLeft: selectedReview === r.review_id ? '2px solid var(--accent)' : '2px solid transparent',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                #{r.pr_number}
              </span>
              <span style={{ fontSize: 10, color: STATUS_COLORS[r.status] || 'var(--warning)' }}>
                {r.status}
              </span>
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
                marginBottom: 3,
                lineHeight: 1.4,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {r.pr_title}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
              <span>{r.finding_count} findings</span>
              <span>{timeAgo(r.created_at)}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="p-4 md:p-6" style={{ overflowY: 'auto' }}>
        {!selectedReview && history.length > 0 && (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, paddingTop: 48, textAlign: 'center' }}>
            Select a review to see its findings
          </div>
        )}
        {loadingReview && (
          <div
            style={{
              color: 'var(--text-muted)',
              fontSize: 13,
              fontFamily: 'var(--font-mono)',
              paddingTop: 48,
              textAlign: 'center',
            }}
          >
            Loading...
          </div>
        )}
        {reviewError && (
          <StatusMessage tone="error" onRetry={() => loadReview(selectedReview)}>
            Could not load this review: {reviewError}
          </StatusMessage>
        )}
        {reviewData && !loadingReview && (
          <>
            <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>
                {reviewData.findings.length} findings
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {reviewData.model}
              </div>
            </div>
            {reviewData.findings.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', paddingTop: 32 }}>
                No issues found in this review.
              </div>
            ) : (
              reviewData.findings.map((f, i) => <FindingCard key={i} finding={f} />)
            )}
          </>
        )}
      </div>
    </div>
  );
}
