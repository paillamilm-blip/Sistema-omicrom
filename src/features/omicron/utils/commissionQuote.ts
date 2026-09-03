// src/features/omicron/utils/commissionQuote.ts
// ═══════════════════════════════════════════════════════════════════════
// Helper PURO de la COMISIÓN ÓMICROM (Etapa 1, SOLO DISPLAY, no mueve dinero).
//
// Modelo: la red se financia con una comisión sobre lo que la persona GANA
// (liberación de escrow de un contrato + venta de servicio del mercado),
// pagada por quien recibe (el vendedor/profesional) y descontada de su pago.
// La tasa baja al subir de nivel: subir de nivel te hace pagar menos.
//
//   reputación 0-49  (Estudiante)  -> 100 bps = 1.0 %
//   reputación 50-79 (Técnico)     ->  80 bps = 0.8 %
//   reputación 80-100 (Arquitecto) ->  50 bps = 0.5 %
//
// Este módulo ESPEJA la tabla de bps del servidor (omicron_commission_bps,
// Etapa 2) SOLO para mostrar la tasa y el neto ANTES de confirmar. El SERVIDOR
// es la única fuente de verdad: este cliente NUNCA escribe token_balance ni
// reputación (protegido por 0007_protect_profile.sql). Es SOLO LECTURA.
//
// Reusa levelBandFor()/LevelBand de nodeUnlock.ts (una sola fuente de las
// bandas 0/50/80; no re-declara los cortes). No importa React, framer-motion,
// Supabase ni nada que toque window / matchMedia, así se prueba con Vitest sin
// mocks (mismo criterio que nodeUnlock.ts / homeStatus.ts).
// ═══════════════════════════════════════════════════════════════════════

import { levelBandFor, type LevelBand } from './nodeUnlock';

/**
 * Comisión en PUNTOS BÁSICOS (bps; 100 bps = 1.00 %) por banda de nivel.
 * Espeja exactamente la tabla de omicron_commission_bps del servidor (Etapa 2).
 */
export const COMMISSION_BPS: Record<LevelBand, number> = {
  Estudiante: 100,
  Técnico: 80,
  Arquitecto: 50,
};

/**
 * PISO GANADO — 50 bps = 0.5 % PERMANENTE (decisión del fundador).
 *
 * NO es un beneficio de bienvenida: es un PREMIO POR TRAYECTORIA. Se lo gana
 * "una persona que ya subió todos los niveles, lleva tiempo y participa
 * activamente". El servidor lo mide con tres requisitos y, el día que se
 * cumplen los tres, GRABA la fecha en profiles.commission_floor_locked_at:
 *
 *   1. reputación >= 80 (Arquitecto)   -> "subió todos los niveles"
 *   2. antigüedad >= 90 días           -> "lleva tiempo"
 *   3. >= 5 contratos completados      -> "participa activamente"
 *
 * Una vez ganado es PERMANENTE: sigue pagando 0.5 % incluso si su reputación
 * baja después por una penalización. Ganado es ganado.
 *
 * Se aplica como PISO —min(tasa de banda, EARNED_FLOOR_BPS)— así que si alguna
 * banda bajara de 0.5 %, la persona conserva la más conveniente para ella.
 *
 * ⚠️ HISTORIA IMPORTANTE: esto NO se ata a `is_pioneer`. Esa columna es
 * `not null default true` en el esquema, así que TODOS los usuarios son
 * Pioneros y atarle el piso habría regalado 0.5 % a toda la base, dejando las
 * tasas de 1 % y 0.8 % sin efecto. Ver migración 0082.
 */
export const EARNED_FLOOR_BPS = 50;

/** Cotización de comisión para mostrar ANTES de confirmar (solo display). */
export interface CommissionQuote {
  /** Puntos básicos de la comisión (100 | 80 | 50). */
  bps: number;
  /** Tasa en porcentaje para "Comisión Ómicrom: X %" (1 | 0.8 | 0.5). */
  ratePct: number;
  /** Comisión en tokens enteros: Math.floor(amount * bps / 10000). */
  commission: number;
  /** Neto que recibe el vendedor: amount - commission. */
  net: number;
  /** Banda humana del vendedor (Estudiante / Técnico / Arquitecto). */
  band: LevelBand;
  /** true si se aplicó el piso GANADO de 0.5 % permanente (ver EARNED_FLOOR_BPS). */
  floorEarned: boolean;
}

/**
 * Cotiza la comisión Ómicrom para un monto (tokens enteros) según la
 * reputación del VENDEDOR (0..100). Determinista y sin efectos secundarios.
 *
 * Redondeo FLOOR (igual que el SQL de la Etapa 2): siempre a favor del
 * vendedor (se queda la fracción) y garantiza commission <= amount, por lo que
 * el neto mostrado coincide con el pago del servidor para montos enteros. Un
 * monto no finito o negativo se normaliza a 0 (comisión 0, neto 0).
 *
 * @param amount      monto en tokens enteros.
 * @param reputation  reputación real del vendedor, escala completa 0..100.
 * @param opts        `floorEarned: true` aplica el piso GANADO de 0.5 %
 *                    permanente (el servidor lo decide y lo graba en
 *                    profiles.commission_floor_locked_at). Omitirlo mantiene
 *                    la tasa por banda, así que las llamadas que no lo pasan
 *                    no cambian de resultado.
 */
export function commissionQuote(
  amount: number,
  reputation: number,
  opts?: { floorEarned?: boolean },
): CommissionQuote {
  const band = levelBandFor(reputation);
  // Quien ganó el piso nunca paga más de 0.5 %.
  const floorEarned = opts?.floorEarned === true;
  const bps = floorEarned ? Math.min(COMMISSION_BPS[band], EARNED_FLOOR_BPS) : COMMISSION_BPS[band];
  const ratePct = bps / 100;
  const safeAmount = Number.isFinite(amount) && amount > 0 ? amount : 0;
  const commission = Math.floor((safeAmount * bps) / 10000);
  const net = safeAmount - commission;
  return { bps, ratePct, commission, net, band, floorEarned };
}
