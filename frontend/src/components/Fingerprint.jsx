const RINGS = 5;
const SEVERITY_VAR = {
  critical: 'var(--color-sev-critical)',
  high: 'var(--color-sev-high)',
  medium: 'var(--color-sev-medium)',
  low: 'var(--color-sev-low)',
};

function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

// mulberry32: small seeded generator, so one issue always draws the same mark.
function seeded(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function arc(r, startDeg, lengthDeg) {
  const point = (deg) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return `${(16 + r * Math.cos(rad)).toFixed(2)} ${(16 + r * Math.sin(rad)).toFixed(2)}`;
  };
  return `M${point(startDeg)} A${r} ${r} 0 ${lengthDeg > 180 ? 1 : 0} 1 ${point(startDeg + lengthDeg)}`;
}

function ridges(seed) {
  const rand = seeded(hash(String(seed)));
  return Array.from({ length: RINGS }, (_, k) => {
    const r = 3.4 + k * 2.6;
    const parts = k === 0 ? 1 : 1 + Math.floor(rand() * 2.4);
    const start = rand() * 360;
    const span = 360 / parts;
    return Array.from({ length: parts }, (_, j) => arc(r, start + j * span, span - (24 + rand() * 46)));
  });
}

/**
 * The mark of one fingerprinted issue: a whorl of ridges drawn from its id,
 * so the same issue looks the same everywhere. One ridge lights up for each
 * time the issue has been seen (innermost first), so a repeat offender is
 * visibly "fuller" than a one-off.
 */
export function FingerprintGlyph({ seed, occurrences = 1, severity, resolved = false, size = 28, className = '' }) {
  const lit = Math.max(1, Math.min(RINGS, occurrences));
  const color = SEVERITY_VAR[severity] || 'var(--color-accent)';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label={`Issue fingerprint, seen ${occurrences} ${occurrences === 1 ? 'time' : 'times'}`}
      className={`shrink-0 ${resolved ? 'opacity-50' : ''} ${className}`}
    >
      <circle cx="16" cy="16" r="1.3" fill={color} />
      {ridges(seed).map((ring, k) =>
        ring.map((d, j) => (
          <path
            key={`${k}-${j}`}
            d={d}
            stroke={k < lit ? color : 'var(--color-line-strong)'}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        ))
      )}
    </svg>
  );
}
