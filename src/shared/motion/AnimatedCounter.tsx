// shared/motion/AnimatedCounter.tsx
// ═══════════════════════════════════════════════════════════════════════
// Number that counts up from 0 to target value on mount.
// Uses requestAnimationFrame with easeOutExpo for premium feel.
// Anti-slop: duration scales with magnitude (small numbers = faster).
// Impeccable: tabular-nums font-variant for no layout shift.
// ═══════════════════════════════════════════════════════════════════════
import { useState, useEffect, useRef, type CSSProperties } from 'react';
import { useReducedMotion } from './useReducedMotion';

interface Props {
  /** Target value to count to */
  value: number;
  /** Duration in ms (default: auto-calculated based on magnitude) */
  duration?: number;
  /** Decimal places (default 0) */
  decimals?: number;
  /** Prefix (e.g. "$", "PE ") */
  prefix?: string;
  /** Suffix (e.g. "%", " pts") */
  suffix?: string;
  style?: CSSProperties;
  className?: string;
}

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function AnimatedCounter({
  value, duration, decimals = 0, prefix = '', suffix = '', style, className,
}: Props) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(reduced ? value : 0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const prevValueRef = useRef(0);

  // Auto-calculate duration: larger numbers take longer (max 1.2s)
  const autoDuration = duration ?? Math.min(1200, Math.max(400, Math.abs(value) * 3));

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      return;
    }

    const from = prevValueRef.current;
    const to = value;
    const delta = to - from;

    if (delta === 0) return;

    const start = performance.now();
    startRef.current = start;

    function tick(now: number) {
      const elapsed = now - startRef.current;
      const progress = Math.min(1, elapsed / autoDuration);
      const eased = easeOutExpo(progress);
      const current = from + delta * eased;
      setDisplay(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(to);
        prevValueRef.current = to;
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, autoDuration, reduced]);

  const formatted = display.toFixed(decimals);

  return (
    <span
      style={{ fontVariantNumeric: 'tabular-nums', ...style }}
      className={className}
    >
      {prefix}{formatted}{suffix}
    </span>
  );
}
