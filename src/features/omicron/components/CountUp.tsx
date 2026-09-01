// features/omicron/components/CountUp.tsx
// ═══════════════════════════════════════════════════════════════════════
// COUNT-UP — Primitiva presentacional reutilizable (DOM/React only).
//
// Tween numérico basado en requestAnimationFrame con ease-out (decelera al
// llegar). Redondea a entero en cada frame y TERMINA EXACTO en el valor
// objetivo. Respeta prefers-reduced-motion: si está activo (o `enabled` es
// false), muestra el valor final al instante, sin rAF ni tween.
//
// No agrega dependencias. No toca Supabase ni el flujo de actos: es solo
// contenido de texto (por eso animar un número por rAF es seguro aquí).
// ═══════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

interface UseCountUpOptions {
  /** Duración del tween en milisegundos. Default 900. */
  durationMs?: number;
  /** Retardo antes de arrancar el tween (para escalonar). Default 0. */
  delayMs?: number;
  /**
   * Cuando es false (o hay reduced-motion), muestra el valor final al
   * instante sin animar. Sirve para disparar el conteo solo al montar el
   * acto correspondiente. Default true.
   */
  enabled?: boolean;
  /** Callback disparado una sola vez cuando el conteo aterriza en `to`. */
  onLanded?: () => void;
}

// Ease-out cúbico: 1 - (1 - t)^3. Decelera hacia el valor final.
function easeOutCubic(t: number): number {
  const inv = 1 - t;
  return 1 - inv * inv * inv;
}

/**
 * Devuelve un entero que sube desde 0 hasta `to` con ease-out.
 * Limpia el rAF al desmontar y cuando `to`/`enabled`/`delayMs` cambian.
 */
export function useCountUp(to: number, options: UseCountUpOptions = {}): number {
  const { durationMs = 900, delayMs = 0, enabled = true } = options;
  const reduceMotion = useReducedMotion();
  const [value, setValue] = useState<number>(() => (enabled && !reduceMotion ? 0 : to));

  // Ref al onLanded más reciente: evita que un callback inline inestable
  // reinicie el efecto o quede capturado desactualizado.
  const onLandedRef = useRef(options.onLanded);
  useEffect(() => { onLandedRef.current = options.onLanded; }, [options.onLanded]);

  useEffect(() => {
    // Reduced motion o deshabilitado: valor final instantáneo, sin rAF.
    if (reduceMotion || !enabled) {
      setValue(to);
      onLandedRef.current?.();
      return;
    }

    let rafId = 0;
    let delayId: ReturnType<typeof setTimeout> | null = null;
    let startTs = 0;

    const tick = (ts: number) => {
      if (startTs === 0) startTs = ts;
      const elapsed = ts - startTs;
      const t = durationMs <= 0 ? 1 : Math.min(1, elapsed / durationMs);
      if (t >= 1) {
        setValue(to); // Termina EXACTO en el objetivo (sin drift).
        onLandedRef.current?.();
        return;
      }
      setValue(Math.round(to * easeOutCubic(t)));
      rafId = requestAnimationFrame(tick);
    };

    const startTween = () => {
      setValue(0);
      rafId = requestAnimationFrame(tick);
    };

    if (delayMs > 0) {
      setValue(0);
      delayId = setTimeout(startTween, delayMs);
    } else {
      startTween();
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (delayId) clearTimeout(delayId);
    };
  }, [to, durationMs, delayMs, enabled, reduceMotion]);

  return value;
}

interface CountUpProps extends UseCountUpOptions {
  /** Valor final (real) al que sube el contador. */
  to: number;
}

/**
 * Renderiza el entero que sube desde 0 hasta `to`. El sufijo de escala
 * (p.ej. "/100") debe envolverse afuera para preservar el markup exacto.
 */
export function CountUp({ to, ...options }: CountUpProps) {
  const value = useCountUp(to, options);
  return <>{value}</>;
}
