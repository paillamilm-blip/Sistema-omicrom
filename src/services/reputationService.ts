// services/reputationService.ts
// Lógica centralizada para cálculos de reputación y Gemelo Digital

import { supabase } from '../lib/supabase';
import type { Profile, GemeloDigital, ReputationUpdateInput } from '../types';

/**
 * Calcula el Gemelo Digital a partir del perfil.
 * Retorna un objeto con los 4 ejes y la reputación general.
 */
export function calculateGemeloDigital(profile: Profile): GemeloDigital {
  return {
    execution:        clamp(profile.execution_score),
    quality:          clamp(profile.quality_score),
    transcendence:    clamp(profile.transcendence_score),
    foundation:       clamp(profile.foundation_score),
    overallReputation: clamp(profile.reputation_score),
  };
}

/**
 * Calcula la reputación total basado en la regla 80/20 (modelo canónico).
 * Ver DEFINICION_REPUTACION_OMICROM.md.
 * 20% = historial tradicional (títulos, portafolio → traditional_score)
 * 80% = experiencia demostrada (experience_score = PROMEDIO de los 4 ejes)
 *
 * IMPORTANTE: `experience` debe ser el promedio de los 4 ejes
 * (ejecución, calidad, trascendencia, fundamento), no un acumulador de PE.
 */
export function calculateFinalReputation(
  traditional: number,
  experience: number
): number {
  return clamp(traditional * 0.2 + experience * 0.8);
}

/**
 * Promedia los 4 ejes del Gemelo Digital.
 */
export function calculateGemeloAverage(gemelo: GemeloDigital): number {
  return (gemelo.execution + gemelo.quality + gemelo.transcendence + gemelo.foundation) / 4;
}

/**
 * MOMENTUM POR PE — "lo que puedes conseguir".
 * Bono de reputación por Puntos de Experiencia acumulados: acotado a +15,
 * con rendimientos decrecientes (sqrt). Premia el aprendizaje y el potencial
 * sin permitir inflar la reputación sin límite. Ver DEFINICION_REPUTACION_OMICROM.md.
 */
export function calculatePEMomentum(pePoints: number): number {
  const pe = Math.max(pePoints ?? 0, 0);
  return Math.min(15, Math.sqrt(pe) / 4);
}

/**
 * REPUTACIÓN TOTAL UNIFICADA (modelo canónico, igual que el trigger SQL).
 *   base     = 0.20·tradicional + 0.80·experiencia (promedio de 4 ejes)
 *   momentum = bono acotado por PE
 *   total    = clamp(base + momentum)
 */
export function calculateTotalReputation(
  traditional: number,
  experience: number,
  pePoints: number
): number {
  return clamp(traditional * 0.2 + experience * 0.8 + calculatePEMomentum(pePoints));
}


/**
 * Determina el Node Level basado en reputación.
 * N1: 0-49, N2: 50-79, N3: 80-100
 */
export function determineNodeLevel(reputationScore: number): 1 | 2 | 3 {
  if (reputationScore >= 80) return 3;
  if (reputationScore >= 50) return 2;
  return 1;
}

/**
 * Obtiene el color según reputación.
 */
export function getReputationColor(score: number): string {
  if (score >= 80) return 'text-green-500';
  if (score >= 60) return 'text-blue-500';
  if (score >= 40) return 'text-amber-500';
  return 'text-red-500';
}

/**
 * Calcula PE requeridos para siguiente nivel.
 * N1→N2: 1000 PE, N2→N3: 2500 PE adicionales
 */
export function calculatePEThreshold(currentLevel: number): number {
  if (currentLevel === 1) return 1000;
  if (currentLevel === 2) return 2500;
  return 9999;
}


/**
 * ACTUALIZAR REPUTACIÓN EN SUPABASE.
 * Modifica los scores del perfil y crea un registro histórico.
 */
export async function updateReputationInDatabase(
  input: ReputationUpdateInput
): Promise<boolean> {
  try {
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', input.user_id)
      .single();

    if (fetchError || !profile) {
      console.error('Error fetching profile:', fetchError);
      return false;
    }

    const newExecution     = clamp(profile.execution_score     + (input.execution_delta     ?? 0));
    const newQuality       = clamp(profile.quality_score       + (input.quality_delta       ?? 0));
    const newTranscendence = clamp(profile.transcendence_score + (input.transcendence_delta ?? 0));
    const newFoundation    = clamp(profile.foundation_score    + (input.foundation_delta    ?? 0));

    // experiencia = promedio de los 4 ejes; reputación = base(20/80) + momentum(PE).
    // Nota: el trigger SQL recalcula estos campos server-side; esto es optimista/local.
    const newExperience = (newExecution + newQuality + newTranscendence + newFoundation) / 4;
    const newReputationScore = calculateTotalReputation(
      profile.traditional_score,
      newExperience,
      profile.pe_points,
    );

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        execution_score:     newExecution,
        quality_score:       newQuality,
        transcendence_score: newTranscendence,
        foundation_score:    newFoundation,
        reputation_score:    newReputationScore,
        reputation_updated_at: new Date().toISOString(),
      })
      .eq('id', input.user_id);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return false;
    }


    // Log histórico (no crítico si falla)
    const { error: historyError } = await supabase
      .from('reputation_history')
      .insert({
        user_id:               input.user_id,
        old_reputation:        profile.reputation_score,
        new_reputation:        newReputationScore,
        old_execution_score:   profile.execution_score,
        new_execution_score:   newExecution,
        old_quality_score:     profile.quality_score,
        new_quality_score:     newQuality,
        old_transcendence_score: profile.transcendence_score,
        new_transcendence_score: newTranscendence,
        old_foundation_score:  profile.foundation_score,
        new_foundation_score:  newFoundation,
        reason:                input.reason,
        trigger_event_id:      input.trigger_event_id,
      });

    if (historyError) {
      console.warn('History log error (non-critical):', historyError);
    }

    return true;
  } catch (err) {
    console.error('Unexpected error in updateReputationInDatabase:', err);
    return false;
  }
}


/**
 * ACTUALIZAR SCORES PARCIALES sin recalcular reputación general.
 * Útil para ajustes rápidos antes de un contrato.
 */
export async function updateReputationScores(
  userId: string,
  updates: {
    execution_score?: number;
    quality_score?: number;
    transcendence_score?: number;
    foundation_score?: number;
  }
): Promise<boolean> {
  try {
    const sanitized = Object.entries(updates).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = clamp(value);
      return acc;
    }, {} as Record<string, number>);

    const { error } = await supabase
      .from('profiles')
      .update(sanitized)
      .eq('id', userId);

    return !error;
  } catch (err) {
    console.error('Error in updateReputationScores:', err);
    return false;
  }
}


/**
 * OTORGAR PE (Puntos de Experiencia) — SOLO gamificación / niveles.
 *
 * Modelo canónico (ver DEFINICION_REPUTACION_OMICROM.md):
 *  - Los PE mueven el NIVEL del nodo, NO la reputación directamente.
 *  - `experience_score` es una columna DERIVADA (promedio de los 4 ejes)
 *    que mantiene el servidor; el cliente ya NO la escribe. La formación
 *    impacta la reputación a través del eje Fundamento (nodos validados).
 *
 * Nota: la escritura directa de pe_points/experience_score desde el cliente
 * la revierte el trigger `protect_profile_columns`. El otorgamiento real de
 * PE debe hacerse vía RPC SECURITY DEFINER en el servidor (p. ej. exámenes,
 * skill tests). Esta función queda como utilidad/no-op defensiva.
 */
export async function awardPEPoints(
  userId: string,
  peAmount: number,
  reason: string
): Promise<boolean> {
  // reason está disponible para logging futuro
  void reason;
  void userId;
  void peAmount;

  // Los PE se otorgan server-side (RPC SECURITY DEFINER). experience_score
  // es derivado y no se toca desde el cliente. Ver definición canónica.
  return true;
}


/**
 * OBTENER HISTORIAL DE REPUTACIÓN.
 */
export async function getReputationHistory(userId: string, limit = 10) {
  try {
    const { data, error } = await supabase
      .from('reputation_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching reputation history:', error);
      return [];
    }

    return data ?? [];
  } catch (err) {
    console.error('Error in getReputationHistory:', err);
    return [];
  }
}

/**
 * Determina si la caída de reputación amerita una auditoría automática.
 */
export function shouldTriggerAudit(
  previousReputation: number,
  currentReputation: number,
  threshold = 15
): boolean {
  return previousReputation - currentReputation >= threshold;
}

/**
 * CALCULAR MATCH SCORE para empleos ("el trabajo te busca").
 *
 * Modelo canónico unificado: base (20/80) + momentum por PE. Como
 * experience_score = promedio de los 4 ejes, este match score es IDÉNTICO
 * a reputation_score. Frontend y backend coinciden.
 * Ver DEFINICION_REPUTACION_OMICROM.md §7.
 */
export function calculateMatchScore(profile: Profile): number {
  return calculateTotalReputation(
    profile.traditional_score,
    profile.experience_score,
    profile.pe_points,
  );
}


/**
 * BADGE según reputación.
 */
export function getReputationBadge(score: number): {
  label: string;
  color: string;
  emoji: string;
} {
  if (score >= 90) return { label: 'Elite',       color: 'gold',    emoji: '👑' };
  if (score >= 80) return { label: 'Senior',      color: 'emerald', emoji: '⭐' };
  if (score >= 70) return { label: 'Avanzado',    color: 'blue',    emoji: '📈' };
  if (score >= 50) return { label: 'Intermedio',  color: 'amber',   emoji: '🔄' };
  return               { label: 'Novato',       color: 'slate',   emoji: '🌱' };
}

/**
 * Formatea un score para display (1 decimal).
 */
export function formatScore(score: number): string {
  return score.toFixed(1);
}


/**
 * PROGRESO HACIA SIGUIENTE NIVEL.
 */
export function calculateProgressToNextLevel(
  currentLevel: number,
  currentPE: number
): {
  currentLevelPE: number;
  nextLevelPE: number;
  progressPercentage: number;
} {
  const thresholds: Record<number, number> = { 1: 0, 2: 1000, 3: 3500 };

  const currentThreshold = thresholds[currentLevel] ?? 0;
  const nextThreshold    = thresholds[currentLevel + 1] ?? 9999;

  const progress            = currentPE - currentThreshold;
  const needed              = nextThreshold - currentThreshold;
  const progressPercentage  = Math.min(100, (progress / needed) * 100);

  return { currentLevelPE: progress, nextLevelPE: needed, progressPercentage };
}


// ===== SIMULACIONES (para testing/preview sin tocar la BD) =====

/**
 * Simula el recálculo de reputación tras cambios en los ejes (modelo canónico):
 *   experience_score = promedio de los 4 ejes
 *   reputation_score = clamp( 0.20·tradicional + 0.80·experiencia + momentum(PE) )
 * Espeja exactamente al trigger SQL.
 */
export function simulateReputationUpdate(
  profile: Profile,
  deltas: {
    execution?: number;
    quality?: number;
    transcendence?: number;
    foundation?: number;
  }
): Profile {
  const newExecution     = clamp(profile.execution_score     + (deltas.execution     ?? 0));
  const newQuality       = clamp(profile.quality_score       + (deltas.quality       ?? 0));
  const newTranscendence = clamp(profile.transcendence_score + (deltas.transcendence ?? 0));
  const newFoundation    = clamp(profile.foundation_score    + (deltas.foundation    ?? 0));

  const newExperience = (newExecution + newQuality + newTranscendence + newFoundation) / 4;

  return {
    ...profile,
    execution_score:     newExecution,
    quality_score:       newQuality,
    transcendence_score: newTranscendence,
    foundation_score:    newFoundation,
    experience_score:    newExperience,
    reputation_score: calculateTotalReputation(
      profile.traditional_score,
      newExperience,
      profile.pe_points,
    ),
  };
}

// ===== UTILIDADES INTERNAS =====

/** Asegura que un número esté en el rango [0, 100]. */
function clamp(value: number): number {
  return Math.min(100, Math.max(0, value));
}
