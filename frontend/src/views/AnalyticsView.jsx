import { useState, useEffect } from 'react';
import { api } from '../api';
import HealthBar from '../components/HealthBar';
import TrendChart from '../components/TrendChart';
import Hotspots from '../components/Hotspots';
import RecurringIssues from '../components/RecurringIssues';

function Panel({ title, children, style }) {
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        overflow: 'hidden',
        ...style,
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

  useEffect(() => {
    setLoading(true);
    api.getDashboard(owner, repo).then(setData).finally(() => setLoading(false));
  }, [owner, repo]);

  if (loading)
    return (
      <div
        style={{
          padding: 48,
          color: 'var(--text-muted)',
          fontSize: 13,
          fontFamily: 'var(--font-mono)',
        }}
      >
        Loading analytics...
      </div>
    );

  if (!data) return null;

  return (
    <div>
      <HealthBar health={data.health} />
      <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Panel title="Issue trends" style={{ gridColumn: '1 / -1' }}>
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
