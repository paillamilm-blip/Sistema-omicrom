// shared/motion/SmoothNumber.tsx
// ═══════════════════════════════════════════════════════════════════════
// Number that smoothly morphs between values using spring physics.
// Unlike AnimatedCounter (counts from 0), this TRANSITIONS between changes.
// Use for: live PE balance, reputation score, counters that update.
// Taste: spring overshoot is 0 (numbers shouldn't bounce past target).
// Anti-slop: critically damped spring — arrives exactly at target.
// ═══════════════════════════════════════════════════════════════════════
import { motion, useSpring, useTransform } from 'framer-motion';
import { useEffect, type CSSProperties } from 'react';
import { useReducedMotion } from './useReducedMotion';

interface Props {
  /** Current value */
  value: number;
  /** Decimal places (default 0) */
  decimals?: number;
  /** Prefix (e.g. "PE ") */
  prefix?: string;
  /** Suffix (e.g. " pts") */
  suffix?: string;
  /** Spring stiffness (default 120 — smooth, not jumpy) */
  stiffness?: number;
  style?: CSSProperties;
  className?: string;
}

export function SmoothNumber({
  value, decimals = 0, prefix = '', suffix = '',
  stiffness = 120, style, className,
}: Props) {
  const reduced = useReducedMotion();

  // Critically damped: damping = 2 * sqrt(stiffness)
  const damping = 2 * Math.sqrt(stiffness);
  const spring = useSpring(value, { stiffness, damping, restDelta: 0.01 });
  const display = useTransform(spring, (v) => `${prefix}${v.toFixed(decimals)}${suffix}`);

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  if (reduced) {
    return (
      <span style={{ fontVariantNumeric: 'tabular-nums', ...style }} className={className}>
        {prefix}{value.toFixed(decimals)}{suffix}
      </span>
    );
  }

  return (
    <motion.span
      style={{ fontVariantNumeric: 'tabular-nums', ...style }}
      className={className}
    >
      {display}
    </motion.span>
  );
}
