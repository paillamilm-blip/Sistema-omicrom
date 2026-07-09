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

import { supabase } from './supabase';

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
  void pushToSupabase(); // fire-and-forget; se ignora si no hay backend
}

// ── Historial de actividad y racha ──────────────────────────────────────
const HKEY = 'omicron_hist';

export interface GemeloEvent { t: string; d: number; }

function loadHist(): GemeloEvent[] {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(HKEY) : null;
    return raw ? (JSON.parse(raw) as GemeloEvent[]) : [];
  } catch { return []; }
}

let history: GemeloEvent[] = loadHist();

export function getHistory(): GemeloEvent[] { return history; }

function persistHist() {
  try { localStorage.setItem(HKEY, JSON.stringify(history.slice(-60))); } catch { /* noop */ }
  listeners.forEach((l) => l());
}

function logEvent(label: string) {
  history = [...history, { t: label, d: Date.now() }].slice(-60);
  persistHist();
}

/** Racha de días consecutivos con actividad (termina hoy o ayer). */
export function streakDays(): number {
  if (!history.length) return 0;
  const set = new Set(history.map((h) => new Date(h.d).toDateString()));
  const cur = new Date(); cur.setHours(0, 0, 0, 0);
  if (!set.has(cur.toDateString())) {
    cur.setDate(cur.getDate() - 1);
    if (!set.has(cur.toDateString())) return 0;
  }
  let s = 0;
  while (set.has(cur.toDateString())) { s++; cur.setDate(cur.getDate() - 1); }
  return s;
}

// ── Motor "Siguiente mejor paso" (recomendación por retorno) ────────────
export type NextAction = 'cv' | 'title' | 'year' | 'vault';
export interface NextStep { action: NextAction; label: string; dRep: number; dPe: number; }

/** Simula cada acción posible y devuelve la de mayor retorno (reputación + PE). */
export function bestNextStep(p: GemeloProfile = current): NextStep | null {
  const b = recompute(p);
  const opts: NextStep[] = [];
  const trial = (action: NextAction, label: string, fn: (q: GemeloProfile) => GemeloProfile) => {
    const c = recompute(fn({ ...p }));
    opts.push({ action, label, dRep: c.rep - b.rep, dPe: c.pe - b.pe });
  };
  if (!p.cv) trial('cv', 'Sube tu CV', (q) => ({ ...q, cv: true }));
  if (p.titles < 10) trial('title', 'Valida un título', (q) => ({ ...q, titles: q.titles + 1 }));
  if (p.years < 15) trial('year', 'Acredita 1 año de experiencia', (q) => ({ ...q, years: q.years + 1 }));
  trial('vault', 'Aporta a la Bóveda', (q) => ({ ...q, vault: q.vault + 1 }));
  opts.sort((a, z) => (z.dRep * 12 + z.dPe) - (a.dRep * 12 + a.dPe));
  return opts[0] ?? null;
}

export const gemeloActions = {
  addCV() { if (!current.cv) { mutate({ cv: true }); logEvent('CV convalidado'); } },
  addTitle() { if (current.titles < 10) { mutate({ titles: current.titles + 1 }); logEvent('Título validado'); } },
  addYear() { if (current.years < 15) { mutate({ years: current.years + 1 }); logEvent('Experiencia +1 año'); } },
  removeYear() { mutate({ years: Math.max(0, current.years - 1) }); },
  addVault() { mutate({ vault: current.vault + 1 }); logEvent('Aporte a la Bóveda'); },
  /** Ejecuta una acción por su identificador (para el "Siguiente mejor paso"). */
  run(action: NextAction) {
    if (action === 'cv') this.addCV();
    else if (action === 'title') this.addTitle();
    else if (action === 'year') this.addYear();
    else this.addVault();
  },
  reset() {
    current = recompute(base());
    history = [];
    try { localStorage.removeItem(KEY); localStorage.removeItem(HKEY); } catch { /* noop */ }
    persist();
    persistHist();
  },
};

// Sincronización entre pestañas del mismo origen.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) { current = load(); listeners.forEach((l) => l()); }
  });
}

// ── Sincronización con Supabase (degradación elegante) ──────────────────
// Tabla sugerida:
//   create table gemelo_profiles (
//     user_id uuid primary key references auth.users(id),
//     cv boolean, titles int, years int, vault int,
//     pe int, rep int, axes jsonb, updated_at timestamptz default now()
//   );
// RLS: el usuario solo puede leer/escribir su propia fila (auth.uid() = user_id).

/** Hidrata el perfil desde Supabase (si hay sesión y tabla). */
export async function syncFromSupabase(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from('gemelo_profiles').select('*').eq('user_id', user.id).maybeSingle();
    if (error || !data) return;
    current = recompute({
      ...base(),
      cv: !!data.cv, titles: data.titles ?? 0, years: data.years ?? 0, vault: data.vault ?? 0,
    });
    try { localStorage.setItem(KEY, JSON.stringify(current)); } catch { /* noop */ }
    listeners.forEach((l) => l());
  } catch { /* sin backend: se ignora */ }
}

/** Empuja los datos convalidados a Supabase (upsert). */
export async function pushToSupabase(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('gemelo_profiles').upsert({
      user_id: user.id,
      cv: current.cv, titles: current.titles, years: current.years, vault: current.vault,
      pe: current.pe, rep: current.rep, axes: current.axes,
    });
  } catch { /* sin backend/tabla: se ignora */ }
}
