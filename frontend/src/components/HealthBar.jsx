function Metric({ value, label, color }) {
  return (
    <div
      style={{
        padding: '16px 24px',
        borderRight: '1px solid var(--border)',
        flex: 1,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 32,
          fontWeight: 600,
          color: color || 'var(--text-primary)',
          lineHeight: 1,
          marginBottom: 6,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
    </div>
  );
}

export default function HealthBar({ health }) {
  if (!health) return null;

  const scoreColor =
    health.score >= 80 ? 'var(--success)' : health.score >= 50 ? 'var(--warning)' : 'var(--danger)';

  return (
    <div
      style={{
        display: 'flex',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        borderLeft: `3px solid ${scoreColor}`,
      }}
    >
      <Metric value={health.score} label="Health score" color={scoreColor} />
      <Metric value={health.openCount} label="Open issues" />
      <Metric
        value={health.recurringCount}
        label="Recurring"
        color={health.recurringCount > 0 ? 'var(--purple)' : undefined}
      />
      <Metric
        value={health.resolvedCount}
        label="Resolved"
        color={health.resolvedCount > 0 ? 'var(--success)' : undefined}
      />
    </div>
  );
}
