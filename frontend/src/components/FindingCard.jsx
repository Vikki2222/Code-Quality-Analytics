const SEVERITY_COLOR = {
  critical: 'var(--severity-critical)',
  high: 'var(--severity-high)',
  medium: 'var(--severity-medium)',
  low: 'var(--severity-low)',
};

export default function FindingCard({ finding }) {
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${SEVERITY_COLOR[finding.severity] || 'var(--border)'}`,
        borderRadius: '0 6px 6px 0',
        padding: '12px 16px',
        marginBottom: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            padding: '2px 6px',
            borderRadius: 4,
            background: `${SEVERITY_COLOR[finding.severity]}22`,
            color: SEVERITY_COLOR[finding.severity] || 'var(--text-muted)',
            border: `1px solid ${SEVERITY_COLOR[finding.severity]}44`,
            textTransform: 'none',
          }}
        >
          {finding.severity}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{finding.category}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)' }}>
          {finding.file_path || finding.file}
          {finding.line_number ? `:${finding.line_number}` : ''}
        </span>
        {finding.occurrence_count > 1 && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: 4,
              background: 'rgba(188,140,255,0.12)',
              color: 'var(--purple)',
              border: '1px solid rgba(188,140,255,0.3)',
            }}
          >
            {finding.occurrence_count}× recurring
          </span>
        )}
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--text-primary)',
          marginBottom: 6,
          lineHeight: 1.4,
        }}
      >
        {finding.title}
      </div>
      <div
        style={{
          fontSize: 12,
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
          marginBottom: finding.recommendation ? 8 : 0,
        }}
      >
        {finding.description}
      </div>
      {finding.recommendation && (
        <div
          style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            lineHeight: 1.6,
            paddingTop: 8,
            borderTop: '1px solid var(--border)',
          }}
        >
          <span style={{ color: 'var(--success)', fontWeight: 500 }}>Fix: </span>
          {finding.recommendation}
        </div>
      )}
    </div>
  );
}
