// lib/voiceEngine.ts
// ═══════════════════════════════════════════════════════════════════════
// ÓMICRON · Motor de Voz Premium — síntesis natural y amigable.
// Selecciona voces españolas premium (Google/Microsoft/Apple), ajusta
// pitch alto para calidez, rate pausado para claridad, inserta pausas
// inteligentes en puntos/comas para fluidez natural.
// ═══════════════════════════════════════════════════════════════════════

/** Configuración de voz premium amigable. */
const VOICE_CONFIG = {
  // Pitch levemente alto = cálido sin sonar robótico
  pitch: 1.02,
  // Rate natural (1.0). La puntuación ya da pausas fluidas.
  rate: 1.0,
  // Volume: 100% (1.0) para claridad
  volume: 1.0,
} as const;

/**
 * Limpia el texto para una locución FLUIDA.
 * IMPORTANTE: la Web Speech API NO soporta SSML (<break/>, etc.). Inyectar
 * esas etiquetas hacía que la voz las leyera o perdiera parte del texto
 * (se escuchaba entrecortado/raro). Acá solo removemos markdown y
 * normalizamos espacios; la puntuación da las pausas naturales.
 */
function cleanForSpeech(text: string): string {
  return text
    .replace(/\*\*/g, '')       // negrita markdown
    .replace(/[*_`#>|]/g, ' ')  // otros símbolos markdown
    .replace(/\s+/g, ' ')       // colapsar espacios/saltos
    .trim();
}

/**
 * Selecciona la mejor voz española disponible en el navegador.
 * Prioriza voces premium de Google (es-ES-Standard-A), Microsoft (es-ES-Helena),
 * y Apple (Mónica, Paulina). Si no hay premium, usa cualquier voz española.
 */
function selectBestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  // Voces premium priorizadas (ordenadas por calidad y amigabilidad)
  const premiumNames = [
    // Google Cloud TTS (las mejores — naturales + expresivas)
    'Google español',
    'es-ES-Standard-A', // Femenina estándar (muy natural)
    'es-ES-Wavenet-C',  // Femenina Wavenet (IA — la más natural)
    'es-ES-Neural2-A',  // Femenina neural
    // Microsoft Azure TTS
    'Microsoft Helena - Spanish (Spain)',
    'es-ES-ElviraNeural',
    // Apple macOS/iOS
    'Mónica',           // Española (muy natural en Apple)
    'Paulina',          // Mexicana (muy amigable)
    'Jorge',            // Masculina española
    // Voicepack Windows/Android
    'Spanish Spain',
    'es-ES',
  ];

  // Buscar primera coincidencia premium
  for (const name of premiumNames) {
    const match = voices.find((v) =>
      v.name.toLowerCase().includes(name.toLowerCase()) ||
      v.lang.toLowerCase().startsWith(name.toLowerCase())
    );
    if (match) return match;
  }

  // Fallback: cualquier voz que empiece con "es-" (español)
  const anySpanish = voices.find((v) => v.lang.toLowerCase().startsWith('es'));
  if (anySpanish) return anySpanish;

  // Última opción: primera voz disponible
  return voices[0];
}

/**
 * Habla el texto con voz natural premium amigable.
 * - Cancela cualquier síntesis anterior.
 * - Usa pitch alto (1.08) y rate pausado (0.95) para calidez.
 * - Inserta pausas inteligentes en puntos/comas.
 * - Selecciona automáticamente la mejor voz española disponible.
 * @param text Texto a sintetizar
 * @param onStart Callback opcional al iniciar la síntesis
 * @param onEnd Callback opcional al terminar la síntesis
 * @returns true si se inició la síntesis, false si no está soportado
 */
export function speak(
  text: string,
  onStart?: () => void,
  onEnd?: () => void
): boolean {
  try {
    // Defensivo: verificar soporte del navegador
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return false;
    }

    // Cancelar cualquier síntesis previa
    window.speechSynthesis.cancel();

    // Si el texto está vacío, no hacer nada
    if (!text || text.trim().length === 0) {
      return false;
    }

    // Crear utterance con texto limpio (sin SSML: la Web Speech API no lo soporta)
    const utterance = new SpeechSynthesisUtterance(cleanForSpeech(text));

    // Aplicar configuración premium
    utterance.pitch = VOICE_CONFIG.pitch;
    utterance.rate = VOICE_CONFIG.rate;
    utterance.volume = VOICE_CONFIG.volume;

    // Seleccionar la mejor voz española disponible
    const voices = window.speechSynthesis.getVoices();
    const bestVoice = selectBestVoice(voices);
    if (bestVoice) {
      utterance.voice = bestVoice;
      utterance.lang = bestVoice.lang;
    } else {
      // Fallback: idioma español genérico
      utterance.lang = 'es-ES';
    }

    // Callbacks opcionales
    if (onStart) {
      utterance.onstart = () => onStart();
    }
    if (onEnd) {
      utterance.onend = () => onEnd();
      utterance.onerror = () => onEnd(); // También llamar onEnd en error
    }

    // Iniciar síntesis
    window.speechSynthesis.speak(utterance);
    return true;
  } catch (error) {
    // Silencioso: si falla, no romper la app
    console.warn('[voiceEngine] Error en síntesis de voz:', error);
    return false;
  }
}

/**
 * Cancela cualquier síntesis de voz en curso.
 */
export function stopSpeaking(): void {
  try {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  } catch {
    // Silencioso
  }
}

/**
 * Verifica si el navegador soporta síntesis de voz.
 */
export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * Hook para cargar las voces disponibles (necesario en algunos navegadores).
 * Llama este hook en el mount de tu app principal para pre-cargar las voces.
 */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    try {
      if (!isSpeechSupported()) {
        resolve([]);
        return;
      }

      const synth = window.speechSynthesis;
      let voices = synth.getVoices();

      if (voices.length > 0) {
        resolve(voices);
        return;
      }

      // En algunos navegadores (Chrome), las voces se cargan asíncronamente
      synth.onvoiceschanged = () => {
        voices = synth.getVoices();
        resolve(voices);
      };
    } catch {
      resolve([]);
    }
  });
}
