export function Card({ className = '', children, ...props }) {
  return (
    <div className={`rounded-[var(--radius-card)] border border-line bg-surface ${className}`} {...props}>
      {children}
    </div>
  );
}

/** Card with a titled header row; `action` sits on the right of the header. */
export function Panel({ title, subtitle, action, className = '', bodyClassName = 'p-4', children }) {
  return (
    <Card className={`flex flex-col ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <h2 className="font-display text-[13px] font-bold text-fg">{title}</h2>
          {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className={`flex-1 ${bodyClassName}`}>{children}</div>
    </Card>
  );
}

/** Big number with a label - scores and counts. */
export function Stat({ label, value, tone = 'text-fg', hint }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-muted">{label}</div>
      <div className={`mt-1 font-mono text-2xl font-semibold leading-none ${tone}`}>{value}</div>
      {hint && <div className="mt-1.5 text-xs text-muted">{hint}</div>}
    </div>
  );
}
