import { useState, useEffect } from 'react';
import { api } from '../api';
import FindingCard from '../components/FindingCard';

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

  useEffect(() => {
    setLoading(true);
    api
      .getRepoHistory(owner, repo)
      .then((d) => setHistory(d.reviews))
      .finally(() => setLoading(false));
  }, [owner, repo]);

  async function loadReview(reviewId) {
    setSelectedReview(reviewId);
    setLoadingReview(true);
    const data = await api.getReview(reviewId);
    setReviewData(data);
    setLoadingReview(false);
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', minHeight: 'calc(100vh - 1px)' }}>
      <div style={{ borderRight: '1px solid var(--border)', padding: '16px 0', overflowY: 'auto' }}>
        <div style={{ padding: '4px 16px 10px', fontSize: 11, color: 'var(--text-muted)' }}>
          {history.length} reviews
        </div>
        {loading && (
          <div style={{ padding: '8px 16px', fontSize: 12, color: 'var(--text-muted)' }}>Loading...</div>
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
              <span style={{ fontSize: 10, color: r.status === 'completed' ? 'var(--success)' : 'var(--danger)' }}>
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

      <div style={{ padding: 24, overflowY: 'auto' }}>
        {!selectedReview && (
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
