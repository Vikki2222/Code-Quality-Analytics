import { SCORE_TEXT, SCORE_VAR, scoreTone } from '../lib/format';

/** Health score number, coloured by band. */
export function ScoreValue({ score, className = 'text-3xl' }) {
  return (
    <span className={`font-mono font-semibold leading-none ${SCORE_TEXT[scoreTone(score)]} ${className}`}>
      {score ?? '—'}
    </span>
  );
}

/** "▲ 6 this week" chip; neutral text when there's no week-old history. */
export function ScoreDelta({ delta }) {
  if (delta === null || delta === undefined) {
    return <span className="text-xs text-muted">No weekly history yet</span>;
  }
  if (delta === 0) return <span className="font-mono text-xs text-muted">± 0 this week</span>;
  const up = delta > 0;
  return (
    <span className={`font-mono text-xs ${up ? 'text-good' : 'text-bad'}`}>
      {up ? '▲' : '▼'} {Math.abs(delta)} <span className="font-sans text-muted">this week</span>
    </span>
  );
}

/**
 * Health history as a waveform of light streaks - the landing hero's
 * signature, carrying real data. One streak per review, taller = healthier
 * (0-100 fixed scale, so two repos are comparable), newest on the right and
 * brightest. Plain SVG - no chart library on the Portfolio.
 */
export function Sparkline({ points, width = 120, height = 32 }) {
  if (!points || points.length < 2) {
    return (
      <div style={{ width, height }} className="flex items-center text-[11px] text-muted">
        Not enough history
      </div>
    );
  }
  const STEP = 5;
  const shown = points.slice(-Math.floor(width / STEP));
  const last = shown[shown.length - 1].score;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Health trend, latest ${last}`}>
      {shown.map((p, i) => {
        const h = Math.max(3, (p.score / 100) * height);
        const newest = i === shown.length - 1;
        return (
          <rect
            key={i}
            x={i * STEP}
            y={(height - h) / 2}
            width={newest ? 3 : 2}
            height={h}
            rx="1"
            fill={SCORE_VAR[scoreTone(p.score)]}
            opacity={newest ? 1 : 0.3 + 0.5 * (i / shown.length)}
          />
        );
      })}
    </svg>
  );
}
