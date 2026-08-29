// src/lib/aiPersonalization.ts
// ═══════════════════════════════════════════════════════════════════════
// AI PERSONALIZATION — Perfil de IA que se enriquece con cada interacción.
//
// Aprende del usuario: tono preferido, estilo de aprendizaje, temas
// débiles, horarios pico, longitud de respuesta preferida. Todo esto
// se inyecta al system prompt de omicronBrain para que Ómicrom sea
// cada vez MÁS personal con el tiempo.
// ═══════════════════════════════════════════════════════════════════════

const STORAGE_KEY = 'omicron_ai_profile';

export interface AIProfile {
  /** Tono preferido (detectado por emotionDetector patterns) */
  tonePreference: 'directo' | 'empático' | 'desafiante' | 'neutral';
  /** Estilo de aprendizaje (inferido de respuestas) */
  learningStyle: 'ejemplos' | 'teoría' | 'práctica' | 'mixto';
  /** Skills donde falla más (de exámenes/interacciones) */
  weakTopics: string[];
  /** Horas de mayor actividad (0-23) */
  peakHours: number[];
  /** Prefiere respuestas cortas o largas */
  responseLength: 'short' | 'medium' | 'long';
  /** Cuántas interacciones ha tenido */
  totalInteractions: number;
  /** Última actualización */
  updatedAt: string;
}

function defaultProfile(): AIProfile {
  return {
    tonePreference: 'neutral',
    learningStyle: 'mixto',
    weakTopics: [],
    peakHours: [],
    responseLength: 'medium',
    totalInteractions: 0,
    updatedAt: new Date().toISOString(),
  };
}

/** Lee el perfil de IA del usuario */
export function getAIProfile(): AIProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProfile();
    return { ...defaultProfile(), ...JSON.parse(raw) };
  } catch {
    return defaultProfile();
  }
}

/** Guarda el perfil de IA */
function saveProfile(profile: AIProfile): void {
  profile.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

/**
 * Actualiza el perfil basado en una interacción.
 * Se llama después de cada askOmicron.
 */
export function learnFromInteraction(input: {
  messageLength: number;
  emotion: string;
  hour: number;
  topic?: string;
}): void {
  const profile = getAIProfile();
  profile.totalInteractions++;

  // Aprender tono preferido (de las emociones más frecuentes)
  if (input.emotion === 'rushed') profile.tonePreference = 'directo';
  else if (input.emotion === 'confused') profile.tonePreference = 'empático';
  else if (input.emotion === 'motivated') profile.tonePreference = 'desafiante';

  // Aprender horario pico
  if (!profile.peakHours.includes(input.hour)) {
    profile.peakHours.push(input.hour);
    if (profile.peakHours.length > 5) {
      // Mantener solo las 5 horas más frecuentes
      profile.peakHours = profile.peakHours.slice(-5);
    }
  }

  // Aprender longitud preferida (si escribe corto, quiere respuestas cortas)
  if (input.messageLength < 20) profile.responseLength = 'short';
  else if (input.messageLength > 100) profile.responseLength = 'long';

  saveProfile(profile);
}

/** Registra un tema débil (de un examen fallido o duda repetida) */
export function registerWeakTopic(topic: string): void {
  const profile = getAIProfile();
  const normalized = topic.toLowerCase().trim();
  if (!profile.weakTopics.includes(normalized)) {
    profile.weakTopics.push(normalized);
    if (profile.weakTopics.length > 8) profile.weakTopics = profile.weakTopics.slice(-8);
  }
  saveProfile(profile);
}

/**
 * Genera hint de personalización para el system prompt.
 * Se inyecta en omicronBrain junto con el hint emocional.
 */
export function getPersonalizationHint(): string {
  const p = getAIProfile();
  if (p.totalInteractions < 5) return ''; // No personalizar hasta tener datos

  const hints: string[] = [];

  if (p.tonePreference !== 'neutral') {
    hints.push(`Tono preferido: ${p.tonePreference}`);
  }
  if (p.responseLength === 'short') {
    hints.push('Prefiere respuestas MUY concisas (2-3 oraciones)');
  } else if (p.responseLength === 'long') {
    hints.push('No le molestan respuestas detalladas');
  }
  if (p.weakTopics.length > 0) {
    hints.push(`Temas donde necesita más ayuda: ${p.weakTopics.slice(0, 3).join(', ')}`);
  }

  if (hints.length === 0) return '';
  return '\nPERSONALIZACIÓN (aprendido del usuario): ' + hints.join('. ') + '.';
}
