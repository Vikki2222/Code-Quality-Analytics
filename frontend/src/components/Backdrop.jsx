import { useEffect, useRef } from 'react';
import { initBackdrop } from '../lib/backdropScene';

/** The landing page's moving backdrop, fixed behind a signed-in page. Decorative only. */
export default function Backdrop({ className = '' }) {
  const ref = useRef(null);
  useEffect(() => initBackdrop(ref.current), []);
  return <canvas ref={ref} aria-hidden="true" className={`pointer-events-none fixed inset-0 z-0 h-full w-full ${className}`} />;
}
