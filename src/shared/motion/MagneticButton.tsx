// shared/motion/MagneticButton.tsx
// ═══════════════════════════════════════════════════════════════════════
// Button that subtly attracts toward the cursor/finger.
// Taste: max displacement = 4px (more is gimmicky, less is invisible).
// On mobile: uses touch position. On desktop: uses mousemove.
// Impeccable: smooth spring return to center on leave.
// ═══════════════════════════════════════════════════════════════════════
import { useRef, useCallback, type ReactNode, type CSSProperties } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';
import { useReducedMotion } from './useReducedMotion';

interface Props {
  children: ReactNode;
  /** Max displacement in px (default 4, max 6) */
  strength?: number;
  onClick?: () => void;
  style?: CSSProperties;
  className?: string;
  disabled?: boolean;
}

export function MagneticButton({ children, strength = 4, onClick, style, className, disabled }: Props) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLButtonElement>(null);
  const maxD = Math.min(6, Math.max(2, strength));

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 20 });
  const springY = useSpring(y, { stiffness: 300, damping: 20 });

  const handleMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (reduced || disabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    let px: number, py: number;
    if ('touches' in e) {
      px = e.touches[0].clientX;
      py = e.touches[0].clientY;
    } else {
      px = e.clientX;
      py = e.clientY;
    }

    const dx = (px - cx) / (rect.width / 2);
    const dy = (py - cy) / (rect.height / 2);
    x.set(dx * maxD);
    y.set(dy * maxD);
  }, [reduced, disabled, maxD, x, y]);

  const handleLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  if (reduced) {
    return (
      <button onClick={onClick} disabled={disabled} style={style} className={className}>
        {children}
      </button>
    );
  }

  return (
    <motion.button
      ref={ref}
      onClick={onClick}
      disabled={disabled}
      onMouseMove={handleMove}
      onTouchMove={handleMove}
      onMouseLeave={handleLeave}
      onTouchEnd={handleLeave}
      style={{ x: springX, y: springY, ...style }}
      className={className}
    >
      {children}
    </motion.button>
  );
}
