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
 * Calcula la reputación total basado en la regla 80/20.
 * 20% = historial tradicional (títulos, portafolio)
 * 80% = experiencia interna (desempeño, PE)
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

    // Reputación = promedio de los 4 ejes
    const newReputationScore = (newExecution + newQuality + newTranscendence + newFoundation) / 4;

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
 * OTORGAR PE Y RECALCULAR experience_score AUTOMÁTICAMENTE.
 * Cada 500 PE acumulados = +5 al experience_score.
 */
export async function awardPEPoints(
  userId: string,
  peAmount: number,
  reason: string
): Promise<boolean> {
  // reason está disponible para logging futuro
  void reason;

  try {
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('pe_points, experience_score')
      .eq('id', userId)
      .single();

    if (fetchError || !profile) return false;

    const newPE = profile.pe_points + peAmount;
    const experienceDelta =
      Math.floor(newPE / 500) * 5 - Math.floor(profile.pe_points / 500) * 5;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        pe_points: newPE,
        experience_score: clamp(profile.experience_score + experienceDelta),
      })
      .eq('id', userId);

    return !updateError;
  } catch (err) {
    console.error('Error in awardPEPoints:', err);
    return false;
  }
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
 * CALCULAR MATCH SCORE (regla 80/20) para empleos.
 */
export function calculateMatchScore(profile: Profile): number {
  return clamp(profile.traditional_score * 0.2 + profile.experience_score * 0.8);
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
 * ✅ FIX: reputation_score ahora se recalcula correctamente como promedio de los 4 ejes.
 * Antes quedaba en 0 (comentario incorrecto).
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

  return {
    ...profile,
    execution_score:     newExecution,
    quality_score:       newQuality,
    transcendence_score: newTranscendence,
    foundation_score:    newFoundation,
    // ✅ FIX: reputation_score calculado, no hardcodeado en 0
    reputation_score: (newExecution + newQuality + newTranscendence + newFoundation) / 4,
  };
}

// ===== UTILIDADES INTERNAS =====

/** Asegura que un número esté en el rango [0, 100]. */
function clamp(value: number): number {
  return Math.min(100, Math.max(0, value));
}
