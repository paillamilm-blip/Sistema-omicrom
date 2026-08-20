// shared/motion/TextReveal.tsx
// ═══════════════════════════════════════════════════════════════════════
// Text that reveals character by character with variable speed.
// Use for: AI responses, coach guidance, greetings, quotes.
// Taste: speed adapts to punctuation (pause on '.', ',' — feels human).
// Anti-slop: no cursor blink after complete (that's a 2005 pattern).
// Impeccable: shows full text instantly in reduced motion.
// ═══════════════════════════════════════════════════════════════════════
import { useState, useEffect, useRef, type CSSProperties } from 'react';
import { useReducedMotion } from './useReducedMotion';

interface Props {
  /** Text to reveal */
  text: string;
  /** Base speed in ms per character (default 28) */
  speed?: number;
  /** Delay before starting (ms) */
  delay?: number;
  /** Show cursor during typing */
  cursor?: boolean;
  /** Callback when reveal is complete */
  onComplete?: () => void;
  style?: CSSProperties;
  className?: string;
}

function charDelay(char: string, baseSpeed: number): number {
  if (char === '.' || char === '!' || char === '?') return baseSpeed * 6;
  if (char === ',') return baseSpeed * 3;
  if (char === ':' || char === ';') return baseSpeed * 4;
  if (char === ' ') return baseSpeed * 0.5;
  return baseSpeed;
}

export function TextReveal({
  text, speed = 28, delay = 0, cursor = true, onComplete, style, className,
}: Props) {
  const reduced = useReducedMotion();
  const [revealed, setRevealed] = useState(reduced ? text.length : 0);
  const [typing, setTyping] = useState(!reduced);
  const timeoutRef = useRef<number>(0);

  useEffect(() => {
    if (reduced) {
      setRevealed(text.length);
      setTyping(false);
      onComplete?.();
      return;
    }

    setRevealed(0);
    setTyping(true);

    let idx = 0;
    function next() {
      if (idx >= text.length) {
        setTyping(false);
        onComplete?.();
        return;
      }
      const char = text[idx];
      const ms = idx === 0 ? delay : charDelay(char, speed);
      timeoutRef.current = window.setTimeout(() => {
        idx++;
        setRevealed(idx);
        next();
      }, ms);
    }

    next();
    return () => clearTimeout(timeoutRef.current);
  }, [text, speed, delay, reduced, onComplete]);

  const displayText = text.slice(0, revealed);

  return (
    <span style={style} className={className}>
      {displayText}
      {cursor && typing && (
        <span
          style={{
            display: 'inline-block',
            width: 2, height: '1em',
            background: 'currentColor',
            marginLeft: 1,
            opacity: 0.7,
            animation: 'cp-breathe 1s ease-in-out infinite',
            verticalAlign: 'text-bottom',
          }}
          aria-hidden="true"
        />
      )}
    </span>
  );
}
