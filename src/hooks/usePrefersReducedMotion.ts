/**
 * usePrefersReducedMotion — detects the OS-level reduced-motion preference.
 *
 * Returns true when the user has requested reduced motion via their operating
 * system settings (e.g., "Reduce motion" on macOS/iOS, "Show animations" off
 * on Windows). When true, GSAP animations should be disabled (instant state
 * changes) and CSS animations should be suppressed.
 *
 * Listens for changes so the preference is respected if toggled mid-session.
 */

import { useState, useEffect } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(QUERY).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}
