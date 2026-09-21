export default function Hotspots({ hotspots }) {
  if (!hotspots?.length) return null;
  const max = Math.max(...hotspots.map((h) => h.findingCount));

  return (
    <div>
      {hotspots.map((h, i) => (
        <div
          key={h.filePath}
          style={{
            padding: '10px 0',
            borderBottom: i < hotspots.length - 1 ? '1px solid var(--border)' : 'none',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 6,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--text-secondary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '70%',
              }}
            >
              {h.filePath}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--text-muted)',
                flexShrink: 0,
              }}
            >
              {h.findingCount} · {h.prCount} PRs
            </span>
          </div>
          <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${(h.findingCount / max) * 100}%`,
                background: i === 0 ? 'var(--danger)' : i === 1 ? 'var(--warning)' : 'var(--accent)',
                borderRadius: 2,
                transition: 'width 0.6s ease',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
