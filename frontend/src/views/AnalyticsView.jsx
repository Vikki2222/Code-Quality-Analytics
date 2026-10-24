import { useState, useEffect } from 'react';
import { api } from '../api';
import HealthBar from '../components/HealthBar';
import TrendChart from '../components/TrendChart';
import Hotspots from '../components/Hotspots';
import RecurringIssues from '../components/RecurringIssues';
import StatusMessage from '../components/StatusMessage';

function Panel({ title, children, className }) {
  return (
    <div
      className={className}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>{title}</span>
      </div>
      <div style={{ padding: '12px 16px' }}>{children}</div>
    </div>
  );
}

export default function AnalyticsView({ owner, repo }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
      .getDashboard(owner, repo)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [owner, repo, reloadKey]);

  if (loading) return <StatusMessage>Loading analytics...</StatusMessage>;

  if (error) {
    return (
      <StatusMessage tone="error" onRetry={retry}>
        Could not load analytics: {error}
      </StatusMessage>
    );
  }

  if (!data) return null;

  // No findings ever recorded (never reviewed, or every review was clean):
  // a 100 health score and empty charts would read as a broken page.
  if (data.trends.length === 0 && data.hotspots.length === 0) {
    return (
      <StatusMessage>
        No findings recorded for this repository yet. Run a review to start tracking quality.
      </StatusMessage>
    );
  }

  return (
    <div>
      <HealthBar health={data.health} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 md:p-5">
        <Panel title="Issue trends" className="lg:col-span-2">
          <TrendChart trends={data.trends} />
        </Panel>
        <Panel title="Code hotspots">
          <Hotspots hotspots={data.hotspots} />
        </Panel>
        <Panel title="Recurring issues">
          <RecurringIssues issues={data.recurringIssues} />
        </Panel>
      </div>
    </div>
  );
}
