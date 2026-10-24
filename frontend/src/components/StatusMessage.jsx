// Shared loading / empty / error message so every view handles those
// states the same way. Pass onRetry to show a Retry button.
export default function StatusMessage({ children, tone = 'muted', onRetry }) {
  const isError = tone === 'error';
  return (
    <div
      role={isError ? 'alert' : 'status'}
      style={{
        padding: '40px 16px',
        textAlign: 'center',
        color: isError ? 'var(--danger)' : 'var(--text-muted)',
        fontSize: 13,
        fontFamily: isError ? 'var(--font-ui)' : 'var(--font-mono)',
      }}
    >
      <div>{children}</div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            marginTop: 12,
            padding: '6px 14px',
            background: 'transparent',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            borderRadius: 6,
            fontSize: 12,
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}
