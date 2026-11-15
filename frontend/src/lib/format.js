export function timeAgo(value) {
  if (!value) return '—';
  const seconds = Math.max(0, (Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function capitalize(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

export function plural(count, word, pluralWord = `${word}s`) {
  return `${count} ${count === 1 ? word : pluralWord}`;
}

/** Health score band, shared by every place that colours a score. */
export function scoreTone(score) {
  if (score === null || score === undefined) return 'muted';
  if (score >= 80) return 'good';
  if (score >= 50) return 'warn';
  return 'bad';
}

export const SCORE_TEXT = { good: 'text-good', warn: 'text-warn', bad: 'text-bad', muted: 'text-muted' };
export const SCORE_VAR = {
  good: 'var(--color-good)',
  warn: 'var(--color-warn)',
  bad: 'var(--color-bad)',
  muted: 'var(--color-muted)',
};

export const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low'];

// Fixed order so a category keeps the same colour on every chart.
export const CATEGORIES = ['security', 'reliability', 'performance', 'maintainability', 'testing', 'scalability'];
export const CATEGORY_COLORS = {
  security: '#f2564d',
  reliability: '#ef7d38',
  performance: '#d6a02b',
  maintainability: '#5b9dff',
  testing: '#3fb950',
  scalability: '#b98cff',
};
