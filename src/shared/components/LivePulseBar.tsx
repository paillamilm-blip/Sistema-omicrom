// shared/components/LivePulseBar.tsx
// ═══════════════════════════════════════════════════════════════════════
// JARVIS PRESENCE · Live Pulse Bar
//
// 2px bar at the very top of the app that shows Ómicron is ALIVE.
// It's the system's heartbeat — always visible, never invasive.
//
// States:
//   calm    → slow breathing glow (default when nothing happens)
//   active  → cyan pulse (network activity, others online)
//   user    → gold flash (YOUR action registered)
//   alert   → red subtle pulse (dispute, warning)
//   success → green flash (achievement, level up)
//
// The bar transitions between states with smooth gradient morphing.
// Respects prefers-reduced-motion (static dim line instead).
// ═══════════════════════════════════════════════════════════════════════
import { useEffect, useState, useRef } from 'react';
import { C } from '@/theme';

export type PulseState = 'calm' | 'active' | 'user' | 'alert' | 'success';

interface Props {
  /** Current state — change this to trigger visual transitions */
  state?: PulseState;
  /** Auto-return to calm after ms (default 3000). Set 0 to stay. */
  returnDelay?: number;
}

const GRADIENTS: Record<PulseState, string> = {
  calm:    `linear-gradient(90deg, transparent, ${C.cyan}33, ${C.purple}22, transparent)`,
  active:  `linear-gradient(90deg, transparent, ${C.cyan}, ${C.purple}, ${C.cyan}, transparent)`,
  user:    `linear-gradient(90deg, transparent, ${C.gold}, ${C.cyan}, ${C.gold}, transparent)`,
  alert:   `linear-gradient(90deg, transparent, ${C.red}cc, ${C.gold}88, ${C.red}cc, transparent)`,
  success: `linear-gradient(90deg, transparent, ${C.green}, ${C.cyan}, ${C.green}, transparent)`,
};

const ANIMATIONS: Record<PulseState, string> = {
  calm:    'livePulseBreath 4s ease-in-out infinite',
  active:  'livePulseFlow 2s linear infinite',
  user:    'livePulseFlash 0.6s ease both',
  alert:   'livePulseAlert 1.5s ease-in-out infinite',
  success: 'livePulseFlash 0.8s ease both',
};

// Inject keyframes once
function injectStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById('live-pulse-css')) return;
  const s = document.createElement('style');
  s.id = 'live-pulse-css';
  s.textContent = `
    @keyframes livePulseBreath {
      0%, 100% { opacity: 0.3; background-size: 200% 100%; background-position: 0% 0%; }
      50% { opacity: 0.6; background-size: 200% 100%; background-position: 100% 0%; }
    }
    @keyframes livePulseFlow {
      0% { background-position: -200% 0%; }
      100% { background-position: 200% 0%; }
    }
    @keyframes livePulseFlash {
      0% { opacity: 0.2; }
      30% { opacity: 1; }
      100% { opacity: 0.4; }
    }
    @keyframes livePulseAlert {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 0.9; }
    }
    @media (prefers-reduced-motion: reduce) {
      .live-pulse-bar { animation: none !important; opacity: 0.3 !important; }
    }
  `;
  document.head.appendChild(s);
}

export function LivePulseBar({ state = 'calm', returnDelay = 3000 }: Props) {
  const [current, setCurrent] = useState<PulseState>(state);
  const timeoutRef = useRef<number>(0);

  useEffect(() => { injectStyles(); }, []);

  useEffect(() => {
    setCurrent(state);

    // Auto-return to calm after a burst state
    if (state !== 'calm' && returnDelay > 0) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setCurrent('calm'), returnDelay);
    }

    return () => clearTimeout(timeoutRef.current);
  }, [state, returnDelay]);

  return (
    <div
      className="live-pulse-bar"
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        zIndex: 9999,
        background: GRADIENTS[current],
        backgroundSize: '200% 100%',
        animation: ANIMATIONS[current],
        transition: 'background 0.6s ease',
        pointerEvents: 'none',
      }}
    />
  );
}

// ── Hook para controlar el Pulse Bar desde cualquier parte ────────────
let _setState: ((s: PulseState) => void) | null = null;

export function usePulseBar() {
  const [state, setState] = useState<PulseState>('calm');
  _setState = setState;

  return {
    state,
    pulse: (s: PulseState) => setState(s),
    calm: () => setState('calm'),
    active: () => setState('active'),
    user: () => setState('user'),
    alert: () => setState('alert'),
    success: () => setState('success'),
  };
}

/** Fire-and-forget pulse from anywhere (services, hooks, etc.) */
export function firePulse(s: PulseState): void {
  _setState?.(s);
}
