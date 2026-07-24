// src/lib/orbNotify.ts
// Bus de notificaciones para la orbe del home. Cualquier parte de la app puede
// disparar un aviso que la orbe muestra como una "carga de datos" holográfica.
//
// Uso:
//   import { notifyOrb } from '../lib/orbNotify';
//   notifyOrb('Se acreditaron 5.000 tokens', 'success');
//
// La orbe (OrbDataStream) escucha con useOrbNotice() y anima la entrada de datos.
// Además guardamos el último aviso unos segundos: si se disparó fuera del home
// (p. ej. en la Billetera) y el usuario vuelve al home enseguida, la orbe lo
// muestra igual ("replay reciente").
import { useEffect, useState } from 'react';

export type OrbTone = 'info' | 'success' | 'alert' | 'gold';

export interface OrbNotice {
  id: number;
  text: string;
  tone: OrbTone;
}

const EVENT = 'omicron:orb-notify';
const REPLAY_MS = 8000;
let seq = 0;
let latest: (OrbNotice & { ts: number }) | null = null;

/** Dispara una notificación visual en la orbe. Seguro en SSR/no-window. */
export function notifyOrb(text: string, tone: OrbTone = 'info'): void {
  if (typeof window === 'undefined' || !text) return;
  const detail: OrbNotice = { id: ++seq, text, tone };
  latest = { ...detail, ts: Date.now() };
  window.dispatchEvent(new CustomEvent<OrbNotice>(EVENT, { detail }));
}

/** Hook que devuelve la última notificación (con replay reciente al montar). */
export function useOrbNotice(): OrbNotice | null {
  const [notice, setNotice] = useState<OrbNotice | null>(() =>
    latest && Date.now() - latest.ts < REPLAY_MS ? { id: latest.id, text: latest.text, tone: latest.tone } : null,
  );
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<OrbNotice>).detail;
      if (detail?.text) setNotice(detail);
    };
    window.addEventListener(EVENT, handler as EventListener);
    return () => window.removeEventListener(EVENT, handler as EventListener);
  }, []);
  return notice;
}
