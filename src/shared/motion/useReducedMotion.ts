// shared/motion/useReducedMotion.ts
// ═══════════════════════════════════════════════════════════════════════
// Detects user's motion preference. Returns true if reduced motion preferred.
// Used by ALL motion components to provide graceful degradation:
// - Reduced motion ON → gentle opacity fade (150ms) instead of nothing
// - Never kills animation completely — that's lazy, not accessible
// ═══════════════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(QUERY).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return reduced;
}

/** Transition for reduced-motion users — gentle fade, never jarring */
export const REDUCED_TRANSITION = { duration: 0.15, ease: 'easeOut' } as const;

/** Spring that ALL motion components use when motion is allowed */
export const MOTION_SPRING = { type: 'spring' as const, stiffness: 400, damping: 30 } as const;

/** Softer spring for larger elements */
export const MOTION_SPRING_GENTLE = { type: 'spring' as const, stiffness: 260, damping: 26 } as const;
