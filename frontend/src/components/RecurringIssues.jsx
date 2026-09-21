function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return '1d ago';
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

const STATUS_COLOR = {
  open: 'var(--warning)',
  recurring: 'var(--danger)',
  resolved: 'var(--success)',
};

export default function RecurringIssues({ issues }) {
  if (!issues?.length)
    return <div style={{ padding: '16px 0', color: 'var(--text-muted)', fontSize: 13 }}>No recurring issues detected yet.</div>;

  return (
    <div>
      {issues.map((issue, i) => (
        <div
          key={issue.id}
          style={{
            padding: '12px 0',
            borderBottom: i < issues.length - 1 ? '1px solid var(--border)' : 'none',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 18,
              fontWeight: 600,
              color: STATUS_COLOR[issue.status] || 'var(--text-muted)',
              lineHeight: 1,
              minWidth: 36,
              paddingTop: 2,
            }}
          >
            {issue.occurrence_count}×
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                color: 'var(--text-primary)',
                marginBottom: 3,
                lineHeight: 1.4,
              }}
            >
              {issue.representative_title}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {issue.file_path}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                {timeAgo(issue.first_detected_at)} → {timeAgo(issue.last_detected_at)}
              </span>
            </div>
          </div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 500,
              padding: '2px 8px',
              borderRadius: 4,
              border: `1px solid ${STATUS_COLOR[issue.status] || 'var(--border)'}`,
              color: STATUS_COLOR[issue.status] || 'var(--text-muted)',
              flexShrink: 0,
              textTransform: 'none',
            }}
          >
            {issue.status}
          </div>
        </div>
      ))}
    </div>
  );
}
