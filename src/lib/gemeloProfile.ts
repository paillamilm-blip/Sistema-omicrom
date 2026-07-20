// src/lib/gemeloProfile.ts
// ═══════════════════════════════════════════════════════════════════════
// ÓMICRON · Perfil del Gemelo Digital — FACADE DE SOLO LECTURA
//
// RECTIFICACIÓN PRIORIDAD 1: Este módulo ya NO modifica la reputación
// localmente. Toda mutación de datos convalidados pasa por RPCs de
// Supabase (SECURITY DEFINER) que validan evidencia y disparan triggers.
//
// El store local se conserva ÚNICAMENTE como caché de lectura para:
// - Degradación elegante sin conexión (PWA offline)
// - Sincronización entre pestañas
// - Calcular "siguiente mejor paso" (simulación read-only)
//
// REGLA DE ORO: La reputación se calcula SOLO en el servidor.
// El cliente lee, no escribe.
// ═══════════════════════════════════════════════════════════════════════

import { supabase } from './supabase';
import { calculateTotalReputation } from '../services/reputationService';

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
    axes: { execution: 40, quality: 50, transcendence: 18, foundation: 25 },
  };
}

/** Recalcula PE, ejes y reputación SOLO para simulación/predicción (read-only). */
export function recompute(p: GemeloProfile): GemeloProfile {
  const ax: GemeloAxes = { execution: 40, quality: 50, transcendence: 18, foundation: 25 };
  let pe = 120;
  if (p.cv) { pe += 200; ax.execution += 10; ax.quality += 6; }
  pe += p.titles * 250; ax.foundation += p.titles * 12;
  pe += p.years * 60; ax.execution += p.years * 2; ax.quality += p.years * 2;
  pe += p.vault * 150; ax.transcendence += p.vault * 14;
  (Object.keys(ax) as (keyof GemeloAxes)[]).forEach((k) => (ax[k] = Math.min(100, ax[k])));
  const avg = (ax.execution + ax.quality + ax.transcendence + ax.foundation) / 4;
  const traditional = Math.min(60, (p.cv ? 6 : 0) + p.titles * 5 + p.years * 4);
  const rep = Math.round(calculateTotalReputation(traditional, avg, pe));
  return { ...p, pe, rep, axes: ax };
}

// Tiers por PE
const TIERS = [
  { name: 'Nodo Operativo', min: 0, commission: 15 },
  { name: 'Nodo Core', min: 1000, commission: 10 },
  { name: 'Nodo Arquitecto', min: 3500, commission: 5 },
];

export function tierFor(pe: number) {
  let t = TIERS[0];
  for (const x of TIERS) if (pe >= x.min) t = x;
  const idx = TIERS.indexOf(t);
  const next = TIERS[idx + 1] ?? null;
  const progress = next ? Math.min(100, ((pe - t.min) / (next.min - t.min)) * 100) : 100;
  return { ...t, next, progress };
}

// ── Store de SOLO LECTURA con suscripción ─────────────────────────────
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

function notify() {
  listeners.forEach((l) => l());
}

export function getProfile(): GemeloProfile {
  return current;
}

export function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

// ── Historial de actividad (lectura) ────────────────────────────────────
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

/** Racha de días consecutivos con actividad. */
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

// ── Motor "Siguiente mejor paso" (SOLO SIMULACIÓN — NO muta estado) ────
export type NextAction = 'cv' | 'title' | 'year' | 'vault';
export interface NextStep { action: NextAction; label: string; dRep: number; dPe: number; }

/** Simula cada acción posible y devuelve la de mayor retorno. NO modifica nada. */
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

// ── Ruta al siguiente Nodo (solo simulación) ────────────────────────────
export interface RouteStep { action: NextAction; label: string; }
export interface Route { steps: RouteStep[]; endRep: number; endPe: number; endTier: string; }

function applyAction(p: GemeloProfile, a: NextAction): GemeloProfile {
  if (a === 'cv') return { ...p, cv: true };
  if (a === 'title') return { ...p, titles: p.titles + 1 };
  if (a === 'year') return { ...p, years: p.years + 1 };
  return { ...p, vault: p.vault + 1 };
}

export function routeToNextTier(p: GemeloProfile = current): Route {
  let cur = recompute({ ...p });
  const startTier = tierFor(cur.pe).name;
  const steps: RouteStep[] = [];
  for (let k = 0; k < 6; k++) {
    const ns = bestNextStep(cur);
    if (!ns) break;
    steps.push({ action: ns.action, label: ns.label });
    cur = recompute(applyAction(cur, ns.action));
    if (tierFor(cur.pe).name !== startTier) break;
  }
  return { steps, endRep: cur.rep, endPe: cur.pe, endTier: tierFor(cur.pe).name };
}

// ═══════════════════════════════════════════════════════════════════════
// ACCIONES DE CONVALIDACIÓN — VIA RPC SERVER-SIDE (SECURITY DEFINER)
// Estas funciones llaman a Supabase RPCs que validan evidencia y disparan
// los triggers de recálculo de ejes. El store local se actualiza SOLO
// después de confirmación del servidor.
// ═══════════════════════════════════════════════════════════════════════

function logEvent(label: string) {
  history = [...history, { t: label, d: Date.now() }].slice(-60);
  try { localStorage.setItem(HKEY, JSON.stringify(history)); } catch { /* noop */ }
  notify();
}

/** Actualiza la caché local tras confirmación del servidor. */
function updateLocalCache(patch: Partial<GemeloProfile>) {
  current = recompute({ ...current, ...patch });
  try { localStorage.setItem(KEY, JSON.stringify(current)); } catch { /* noop */ }
  notify();
}

export const gemeloActions = {
  /**
   * Convalida CV via RPC real: public.convalidar_credencial(p_kind text).
   * (Ver supabase/migrations/0048_convalidar_credencial.sql — firma real.)
   * La función es SECURITY DEFINER, usa auth.uid() internamente (no recibe
   * user_id como parámetro) y suma +6 a traditional_score (tope 60).
   * El trigger 0050 recalcula reputation_score automáticamente.
   */
  async addCV(): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('convalidar_credencial', { p_kind: 'cv' });
      if (error) {
        console.error('[gemeloActions.addCV] RPC error:', error.message);
        return false;
      }
      const result = data as { ok: boolean; error?: string } | null;
      if (!result?.ok) {
        console.warn('[gemeloActions.addCV] Rechazado por el servidor:', result?.error);
        return false;
      }
      updateLocalCache({ cv: true });
      logEvent('CV convalidado');
      return true;
    } catch (err) {
      console.error('[gemeloActions.addCV] Error:', err);
      return false;
    }
  },

  /** Convalida un título académico (p_kind: 'title'). */
  async addTitle(): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('convalidar_credencial', { p_kind: 'title' });
      if (error) {
        console.error('[gemeloActions.addTitle] RPC error:', error.message);
        return false;
      }
      const result = data as { ok: boolean; error?: string } | null;
      if (!result?.ok) return false;
      if (current.titles < 10) {
        updateLocalCache({ titles: current.titles + 1 });
        logEvent('Título validado');
      }
      return true;
    } catch (err) {
      console.error('[gemeloActions.addTitle] Error:', err);
      return false;
    }
  },

  /** Acredita 1 año de experiencia (p_kind: 'year'). */
  async addYear(): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('convalidar_credencial', { p_kind: 'year' });
      if (error) {
        console.error('[gemeloActions.addYear] RPC error:', error.message);
        return false;
      }
      const result = data as { ok: boolean; error?: string } | null;
      if (!result?.ok) return false;
      if (current.years < 15) {
        updateLocalCache({ years: current.years + 1 });
        logEvent('Experiencia +1 año');
      }
      return true;
    } catch (err) {
      console.error('[gemeloActions.addYear] Error:', err);
      return false;
    }
  },

  /** Registra un aporte declarado a la Bóveda (p_kind: 'vault'). */
  async addVault(): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('convalidar_credencial', { p_kind: 'vault' });
      if (error) {
        console.error('[gemeloActions.addVault] RPC error:', error.message);
        return false;
      }
      const result = data as { ok: boolean; error?: string } | null;
      if (!result?.ok) return false;
      updateLocalCache({ vault: current.vault + 1 });
      logEvent('Aporte a la Bóveda');
      return true;
    } catch (err) {
      console.error('[gemeloActions.addVault] Error:', err);
      return false;
    }
  },

  /** Ejecuta una acción por su identificador. */
  async run(action: NextAction): Promise<boolean> {
    if (action === 'cv') return this.addCV();
    if (action === 'title') return this.addTitle();
    if (action === 'year') return this.addYear();
    return this.addVault();
  },

  /** Reset solo para desarrollo/testing. */
  reset() {
    current = recompute(base());
    history = [];
    try { localStorage.removeItem(KEY); localStorage.removeItem(HKEY); } catch { /* noop */ }
    notify();
  },
};

// Sincronización entre pestañas.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) { current = load(); notify(); }
  });
}

// ── Sincronización con Supabase (lectura) ───────────────────────────────

/** Hidrata la caché local desde Supabase (si hay sesión y tabla). */
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
    notify();
  } catch { /* sin backend: se ignora */ }
}

/** @deprecated — Las escrituras ahora van via RPCs. Este método se conserva
 * solo para compatibilidad temporal. NO escribe scores de reputación. */
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
