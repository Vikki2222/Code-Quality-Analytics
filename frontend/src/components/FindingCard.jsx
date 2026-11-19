import { useState } from 'react';
import { Link } from 'react-router';
import { CategoryTag, SeverityBadge } from './ui/Badge';
import { FingerprintGlyph } from './Fingerprint';

/**
 * A single finding from a review. `tag` is an optional label rendered next
 * to the title (e.g. "New" / "Seen 3×").
 */
export default function FindingCard({ finding, base, tag }) {
  const [open, setOpen] = useState(false);
  const fileHref = `${base}/file?path=${encodeURIComponent(finding.file_path)}`;

  return (
    <article className="rounded-lg border border-line bg-surface">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2"
      >
        {finding.fingerprint_id && (
          <FingerprintGlyph
            seed={finding.fingerprint_id}
            occurrences={finding.occurrence_count || 1}
            severity={finding.severity}
            size={24}
          />
        )}
        <SeverityBadge severity={finding.severity} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-medium text-fg">{finding.title}</span>
            {tag}
          </div>
          <div className="mt-0.5 flex flex-wrap gap-x-3 font-mono text-[11px] text-fg-2">
            <span className="truncate">
              {finding.file_path}
              {finding.line_number ? `:${finding.line_number}` : ''}
            </span>
            <CategoryTag category={finding.category} />
          </div>
        </div>
        <span className={`mt-1 text-xs text-muted transition-transform ${open ? 'rotate-90' : ''}`} aria-hidden="true">
          ›
        </span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-line px-4 py-3 text-[13px]">
          <p className="text-fg-2">{finding.description}</p>
          {finding.recommendation && (
            <div className="rounded-md border-l-2 border-accent bg-accent/5 px-3 py-2">
              <div className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-accent">Recommendation</div>
              <p className="text-fg-2">{finding.recommendation}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-4 text-xs">
            <Link to={fileHref} className="text-accent hover:underline">
              File history →
            </Link>
            {finding.fingerprint_id && (
              <Link to={`${base}/issues/${finding.fingerprint_id}`} className="text-accent hover:underline">
                Issue timeline →
              </Link>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
