import { Link } from 'react-router';

const VARIANTS = {
  primary: 'bg-accent text-[var(--color-base)] font-semibold hover:bg-accent-strong border-transparent',
  secondary: 'bg-surface-2 text-fg-2 hover:text-fg hover:bg-surface-3 border-line',
  ghost: 'bg-transparent text-fg-2 hover:text-fg hover:bg-surface-2 border-transparent',
  danger: 'bg-transparent text-bad hover:bg-bad/10 border-bad/40',
};

const SIZES = {
  sm: 'h-7 px-2.5 text-xs gap-1.5',
  md: 'h-9 px-3.5 text-[13px] gap-2',
  lg: 'h-11 px-5 text-sm gap-2.5',
};

function classes(variant, size, className) {
  return [
    'inline-flex items-center justify-center rounded-full border font-medium whitespace-nowrap',
    'transition-colors disabled:opacity-50 disabled:pointer-events-none',
    VARIANTS[variant],
    SIZES[size],
    className,
  ].join(' ');
}

export function Button({ variant = 'primary', size = 'md', className = '', type = 'button', ...props }) {
  return <button type={type} className={classes(variant, size, className)} {...props} />;
}

export function ButtonLink({ variant = 'secondary', size = 'md', className = '', ...props }) {
  return <Link className={classes(variant, size, className)} {...props} />;
}
