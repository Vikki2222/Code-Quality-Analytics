import { Button } from './Button';

/**
 * Shared loading / empty / error states so every screen handles them the
 * same way. `action` is an optional element (e.g. a Button) under the text.
 */
export function StatusMessage({ title, children, tone = 'muted', action, onRetry, compact = false }) {
  const isError = tone === 'error';
  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8' : 'py-16'} px-4`}
    >
      {title && <div className={`text-sm font-medium ${isError ? 'text-bad' : 'text-fg'}`}>{title}</div>}
      {children && <div className="mt-1 max-w-md text-[13px] text-muted">{children}</div>}
      {(action || onRetry) && (
        <div className="mt-4">
          {action}
          {onRetry && (
            <Button variant="secondary" size="sm" onClick={onRetry}>
              Retry
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function ErrorState({ error, what = 'this page', onRetry, compact }) {
  return (
    <StatusMessage tone="error" title={`Couldn't load ${what}`} onRetry={onRetry} compact={compact}>
      {error?.message}
    </StatusMessage>
  );
}

export function Spinner({ className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block size-4 animate-spin rounded-full border-2 border-line-strong border-t-accent ${className}`}
    />
  );
}

export function PageLoading({ label = 'Loading' }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-24 font-mono text-xs text-muted">
      <Spinner /> {label}…
    </div>
  );
}

/** Placeholder block shown while content loads, sized like the real thing. */
export function Skeleton({ className = '' }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-md bg-surface-2 ${className}`} />;
}
