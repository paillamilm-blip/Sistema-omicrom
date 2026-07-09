// src/lib/gemeloProfile.ts
// ═══════════════════════════════════════════════════════════════════════
// ÓMICRON · Perfil del Gemelo (fuente de verdad del ecosistema)
// Store ligero (sin dependencias) con suscripción, persistido en
// localStorage y sincronizado entre pestañas. La reputación, los PE y los
// 4 ejes se RECALCULAN de forma determinista a partir de los datos
// convalidados (CV, títulos, años, aportes a la Bóveda), de modo que toda
// la app lea exactamente lo mismo.
//
// Supabase-ready: `syncFromSupabase` / `pushToSupabase` son puntos de
// enganche opcionales (degradación elegante: si no hay backend, funciona
// 100% con localStorage).
// ═══════════════════════════════════════════════════════════════════════

export interface GemeloAxes {
  execution: number;
  quality: number;
  transcendence: number;
  foundation: number;
}

export interface GemeloProfile {
  cv: boolean;
  titles: number;
  years: number;
  vault: number;
  pe: number;
  rep: number;
  axes: GemeloAxes;
}

const KEY = 'omicron_gemelo';

function base(): GemeloProfile {
  return {
    cv: false, titles: 0, years: 0, vault: 0,
    pe: 120, rep: 34,
    axes: { execution: 40, quality: 30, transcendence: 18, foundation: 25 },
  };
}

/** Recalcula PE, ejes y reputación a partir de los datos convalidados. */
export function recompute(p: GemeloProfile): GemeloProfile {
  const ax: GemeloAxes = { execution: 40, quality: 30, transcendence: 18, foundation: 25 };
  let pe = 120;
  if (p.cv) { pe += 200; ax.execution += 10; ax.quality += 6; }
  pe += p.titles * 250; ax.foundation += p.titles * 12;
  pe += p.years * 60; ax.execution += p.years * 2; ax.quality += p.years * 2;
  pe += p.vault * 150; ax.transcendence += p.vault * 14;
  (Object.keys(ax) as (keyof GemeloAxes)[]).forEach((k) => (ax[k] = Math.min(100, ax[k])));
  const avg = (ax.execution + ax.quality + ax.transcendence + ax.foundation) / 4;
  const rep = Math.max(0, Math.min(99, Math.round(20 + avg * 0.72 + p.titles * 2 + (p.cv ? 3 : 0))));
  return { ...p, pe, rep, axes: ax };
}

const TIERS = [
  { name: 'Nodo Operativo', min: 0, commission: 15 },
  { name: 'Nodo Core', min: 500, commission: 10 },
  { name: 'Nodo Arquitecto', min: 2000, commission: 5 },
];

export function tierFor(pe: number) {
  let t = TIERS[0];
  for (const x of TIERS) if (pe >= x.min) t = x;
  const idx = TIERS.indexOf(t);
  const next = TIERS[idx + 1] ?? null;
  const progress = next ? Math.min(100, ((pe - t.min) / (next.min - t.min)) * 100) : 100;
  return { ...t, next, progress };
}

// ── Store con suscripción ──────────────────────────────────────────────
function load(): GemeloProfile {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    const p = raw ? { ...base(), ...JSON.parse(raw) } : base();
    return recompute(p);
  } catch {
    return recompute(base());
  }
}

let current: GemeloProfile = load();
const listeners = new Set<() => void>();

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(current)); } catch { /* noop */ }
  listeners.forEach((l) => l());
}

export function getProfile(): GemeloProfile {
  return current;
}

export function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

function mutate(patch: Partial<GemeloProfile>) {
  current = recompute({ ...current, ...patch });
  persist();
}

export const gemeloActions = {
  addCV() { if (!current.cv) mutate({ cv: true }); },
  addTitle() { mutate({ titles: Math.min(10, current.titles + 1) }); },
  addYear() { mutate({ years: Math.min(15, current.years + 1) }); },
  removeYear() { mutate({ years: Math.max(0, current.years - 1) }); },
  addVault() { mutate({ vault: current.vault + 1 }); },
  reset() {
    current = recompute(base());
    try { localStorage.removeItem(KEY); } catch { /* noop */ }
    persist();
  },
};

// Sincronización entre pestañas del mismo origen.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) { current = load(); listeners.forEach((l) => l()); }
  });
}

// ── Enganches opcionales a Supabase (no rompen si no hay backend) ───────
// TODO: hidratar desde una tabla `gemelo_profiles` y empujar cambios.
export async function syncFromSupabase(): Promise<void> { /* opcional */ }
export async function pushToSupabase(): Promise<void> { /* opcional */ }
