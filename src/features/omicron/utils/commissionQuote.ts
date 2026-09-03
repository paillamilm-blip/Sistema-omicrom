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
 * BENEFICIO PIONERO (decisión del fundador): quien es usuario fundador paga
 * SIEMPRE la tasa más baja de la red — 50 bps = 0.5 % — de por vida, sin
 * importar su banda de nivel. Es un piso, no un extra: se aplica como
 * min(tasa de banda, PIONEER_BPS), así que si en el futuro alguna banda
 * bajara de 0.5 % el Pionero conserva la más conveniente para él.
 *
 * (Sustituye al texto viejo "Comisión 10 % de por vida", que venía del modelo
 * anterior de tramos por PE 15/10/5 y en el modelo real —máximo 1 %— habría
 * sido un castigo, no un beneficio.)
 */
export const PIONEER_BPS = 50;

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
  /** true si la tasa aplicada es la del beneficio Pionero (0.5 % de por vida). */
  pioneer: boolean;
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
 * @param opts        `pioneer: true` aplica el piso del beneficio Pionero
 *                    (0.5 %). Opcional: omitirlo mantiene el comportamiento
 *                    anterior exacto (tasa por banda), por lo que las llamadas
 *                    ya existentes no cambian de resultado.
 */
export function commissionQuote(
  amount: number,
  reputation: number,
  opts?: { pioneer?: boolean },
): CommissionQuote {
  const band = levelBandFor(reputation);
  // El Pionero paga la tasa más baja de la red: piso de 0.5 % vía min().
  const pioneer = opts?.pioneer === true;
  const bps = pioneer ? Math.min(COMMISSION_BPS[band], PIONEER_BPS) : COMMISSION_BPS[band];
  const ratePct = bps / 100;
  const safeAmount = Number.isFinite(amount) && amount > 0 ? amount : 0;
  const commission = Math.floor((safeAmount * bps) / 10000);
  const net = safeAmount - commission;
  return { bps, ratePct, commission, net, band, pioneer };
}
