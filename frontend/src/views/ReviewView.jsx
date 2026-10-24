import { useState, useEffect } from 'react';
import { api } from '../api';
import FindingCard from '../components/FindingCard';

export default function ReviewView({ owner, repo }) {
  const [pullRequests, setPullRequests] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedPR, setSelectedPR] = useState(null);
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [listError, setListError] = useState(null);

  useEffect(() => {
    api.getPullRequests(owner, repo)
      .then((data) => {
        setPullRequests(data.pullRequests);
        setListError(null);
      })
      .catch((err) => setListError(err.message))
      .finally(() => setLoaded(true));
  }, [owner, repo]);

  async function runReview(pr) {
    setSelectedPR(pr);
    setReview(null);
    setError(null);
    setLoading(true);
    try {
      const { reviewId } = await api.createReview(owner, repo, pr.number);
      // ~3 min: covers a failed first attempt + 30s retry backoff + second attempt.
      let finished = false;
      for (let i = 0; i < 90; i++) {
        const result = await api.getReview(reviewId);
        if (result.status === 'completed') {
          setReview(result);
          finished = true;
          break;
        }
        if (result.status === 'failed') {
          setError(result.errorMessage || 'Review failed');
          finished = true;
          break;
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
      if (!finished) {
        setError('Review is still running. Check the History tab in a few minutes.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', height: '100%', minHeight: 'calc(100vh - 1px)' }}>
      <div style={{ borderRight: '1px solid var(--border)', padding: '16px 0', overflowY: 'auto' }}>
        <div style={{ padding: '4px 16px 10px', fontSize: 11, color: 'var(--text-muted)' }}>Pull requests</div>
        {listError && (
          <div style={{ padding: '8px 16px', fontSize: 13, color: 'var(--danger)' }}>
            Could not load pull requests: {listError}
          </div>
        )}
        {pullRequests.length === 0 && loaded && !listError && (
          <div style={{ padding: '8px 16px', fontSize: 13, color: 'var(--text-muted)' }}>
            No pull requests found.
          </div>
        )}
        {pullRequests.map((pr) => (
          <button
            key={pr.githubId}
            onClick={() => runReview(pr)}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '8px 16px',
              background: selectedPR?.githubId === pr.githubId ? 'var(--bg-surface-2)' : 'transparent',
              border: 'none',
              borderLeft: selectedPR?.githubId === pr.githubId ? '2px solid var(--accent)' : '2px solid transparent',
              color: selectedPR?.githubId === pr.githubId ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>
              #{pr.number}
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.4 }}>{pr.title}</div>
          </button>
        ))}
      </div>

      <div style={{ padding: 24, overflowY: 'auto' }}>
        {!selectedPR && (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, paddingTop: 48, textAlign: 'center' }}>
            Select a pull request to run a review
          </div>
        )}
        {loading && (
          <div
            style={{
              color: 'var(--text-muted)',
              fontSize: 13,
              fontFamily: 'var(--font-mono)',
              paddingTop: 48,
              textAlign: 'center',
            }}
          >
            Analyzing PR#{selectedPR?.number}...
          </div>
        )}
        {error && (
          <div
            style={{
              color: 'var(--danger)',
              fontSize: 13,
              padding: '12px 16px',
              background: 'rgba(248,81,73,0.08)',
              borderRadius: 6,
              border: '1px solid rgba(248,81,73,0.2)',
            }}
          >
            {error}
          </div>
        )}
        {review && (
          <>
            <div
              style={{
                marginBottom: 16,
                paddingBottom: 16,
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>
                  PR#{selectedPR?.number} · {review.findings.length} findings
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {review.model} · {review.partialAnalysis ? 'partial analysis' : 'full analysis'}
                </div>
              </div>
              <div
                style={{
                  fontSize: 11,
                  padding: '3px 8px',
                  borderRadius: 4,
                  background: 'rgba(63,185,80,0.1)',
                  color: 'var(--success)',
                  border: '1px solid rgba(63,185,80,0.2)',
                }}
              >
                completed
              </div>
            </div>
            {review.findings.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', paddingTop: 32 }}>
                No issues found in this pull request.
              </div>
            ) : (
              review.findings.map((f, i) => <FindingCard key={i} finding={f} />)
            )}
          </>
        )}
      </div>
    </div>
  );
}
