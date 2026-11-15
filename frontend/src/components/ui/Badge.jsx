import { capitalize } from '../../lib/format';

const SEVERITY = {
  critical: 'text-sev-critical bg-sev-critical/10 ring-sev-critical/30',
  high: 'text-sev-high bg-sev-high/10 ring-sev-high/30',
  medium: 'text-sev-medium bg-sev-medium/10 ring-sev-medium/30',
  low: 'text-sev-low bg-sev-low/10 ring-sev-low/30',
};

const STATUS = {
  open: 'text-fg-2 bg-surface-3 ring-line-strong',
  recurring: 'text-recurring bg-recurring/10 ring-recurring/30',
  resolved: 'text-good bg-good/10 ring-good/30',
  completed: 'text-good bg-good/10 ring-good/30',
  failed: 'text-bad bg-bad/10 ring-bad/30',
  running: 'text-accent bg-accent/10 ring-accent/30',
  queued: 'text-accent bg-accent/10 ring-accent/30',
};

const BASE = 'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset whitespace-nowrap';

export function SeverityBadge({ severity }) {
  if (!severity) return null;
  return <span className={`${BASE} ${SEVERITY[severity] || SEVERITY.low}`}>{capitalize(severity)}</span>;
}

export function StatusBadge({ status }) {
  if (!status) return null;
  const live = status === 'running' || status === 'queued';
  return (
    <span className={`${BASE} ${STATUS[status] || STATUS.open}`}>
      {live && <span className="size-1.5 animate-pulse rounded-full bg-current" aria-hidden="true" />}
      {capitalize(status)}
    </span>
  );
}

export function CategoryTag({ category }) {
  if (!category) return null;
  return <span className="font-mono text-[11px] text-muted">{category}</span>;
}
