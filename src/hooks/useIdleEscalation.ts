// hooks/useIdleEscalation.ts
// ═══════════════════════════════════════════════════════════════════════
// IDLE ESCALATION — Si el usuario no interactúa, escalamos engagement.
// 10s → chips bounce | 20s → highlight nodo | 30s → "¿Necesitas ayuda?"
// 60s → quiet mode (no molestar más).
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';

export type IdleStage = 'active' | 'chips_bounce' | 'highlight_node' | 'help_offer' | 'quiet';

interface IdleEscalationResult {
  stage: IdleStage;
  helpMessage: string | null;
  resetIdle: () => void;
}

/**
 * Hook que escala el engagement si el usuario no interactúa.
 * Cualquier interacción (input, tap, scroll) resetea el timer.
 */
export function useIdleEscalation(enabled: boolean = true): IdleEscalationResult {
  const [stage, setStage] = useState<IdleStage>('active');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef(Date.now());

  const resetIdle = useCallback(() => {
    setStage('active');
    startTimeRef.current = Date.now();
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Listen for user interactions
    const handleInteraction = () => resetIdle();
    const events = ['touchstart', 'mousedown', 'keydown', 'scroll'];
    events.forEach(e => window.addEventListener(e, handleInteraction, { passive: true }));

    return () => {
      events.forEach(e => window.removeEventListener(e, handleInteraction));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, resetIdle]);

  useEffect(() => {
    if (!enabled || stage === 'quiet') return;

    const tick = () => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;

      if (elapsed >= 60) {
        setStage('quiet');
      } else if (elapsed >= 30) {
        setStage('help_offer');
      } else if (elapsed >= 20) {
        setStage('highlight_node');
      } else if (elapsed >= 10) {
        setStage('chips_bounce');
      }

      if (elapsed < 60) {
        timerRef.current = setTimeout(tick, 2000); // Check every 2s
      }
    };

    timerRef.current = setTimeout(tick, 10000); // First check at 10s

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, stage]);

  const helpMessage = stage === 'help_offer'
    ? '¿Necesitas ayuda? Prueba diciendo "busco trabajo" o toca un chip abajo.'
    : null;

  return { stage, helpMessage, resetIdle };
}
