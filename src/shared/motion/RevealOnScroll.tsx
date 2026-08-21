// shared/motion/RevealOnScroll.tsx
// ═══════════════════════════════════════════════════════════════════════
// IntersectionObserver-powered reveal. Element appears when scrolled into view.
// Anti-slop: triggers once (no re-animate on re-enter), threshold 0.15.
// Uses native IO (no library) — zero bundle cost.
// ═══════════════════════════════════════════════════════════════════════
import { useRef, useState, useEffect, type ReactNode, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion, REDUCED_TRANSITION, MOTION_SPRING_GENTLE } from './useReducedMotion';

interface Props {
  children: ReactNode;
  /** Animation type (default 'slideUp') */
  type?: 'fadeIn' | 'slideUp' | 'scaleIn';
  /** Only animate once (default true) */
  once?: boolean;
  /** IO threshold (default 0.15) */
  threshold?: number;
  delay?: number;
  style?: CSSProperties;
  className?: string;
  /** Set false to disable animation */
  animated?: boolean;
}

const VARIANTS = {
  fadeIn: { hidden: { opacity: 0 }, visible: { opacity: 1 } },
  slideUp: { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } },
  scaleIn: { hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1 } },
};

export function RevealOnScroll({
  children, type = 'slideUp', once = true, threshold = 0.15,
  delay = 0, style, className, animated: enabled = true,
}: Props) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled || !ref.current) return;
    const el = ref.current;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) io.disconnect();
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [enabled, once, threshold]);

  if (!enabled) return <div style={style} className={className}>{children}</div>;

  const variant = VARIANTS[type];

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={visible ? 'visible' : 'hidden'}
      variants={variant}
      transition={reduced
        ? REDUCED_TRANSITION
        : { ...MOTION_SPRING_GENTLE, delay }
      }
      style={style}
      className={className}
    >
      {children}
    </motion.div>
  );
}
