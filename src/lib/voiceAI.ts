// src/lib/voiceAI.ts
// ═══════════════════════════════════════════════════════════════════════
// VOICE AI — TTS con IA natural via OpenRouter (Kokoro 82M).
// Reemplaza Web Speech API robótica con voz generada por IA.
// Usa la MISMA key de OpenRouter que ya tenemos (VITE_OPENROUTER_KEY).
// Fallback a silencio si no hay key o falla la generación.
// ═══════════════════════════════════════════════════════════════════════

const OR_KEY = import.meta.env.VITE_OPENROUTER_KEY ?? '';
const TTS_URL = 'https://openrouter.ai/api/v1/audio/speech';

// Modelos TTS disponibles en OpenRouter (ordenados por preferencia)
const TTS_MODELS = [
  'kokoro/kokoro-82m',              // Gratis, 82M params, rápido
  'google/gemini-2.5-flash-tts',    // Si Kokoro no está disponible
];

// Voces disponibles en Kokoro (español-compatible)
const VOICES = {
  default: 'af_sarah',    // Femenina, clara, natural
  male: 'am_adam',         // Masculina
  warm: 'af_bella',        // Femenina cálida
} as const;

// Cache de audio para no regenerar frases repetidas
const audioCache = new Map<string, string>(); // text → objectURL

// Control de reproducción actual
let currentAudio: HTMLAudioElement | null = null;

/**
 * Genera y reproduce voz con IA (OpenRouter Kokoro TTS).
 * Si falla o no hay key → silencio (no crashea).
 */
export async function speakAI(text: string, voice: keyof typeof VOICES = 'default'): Promise<void> {
  if (!OR_KEY || !text.trim()) return;

  // Truncar texto largo (TTS tiene límite)
  const input = text.slice(0, 500);

  // Detener audio anterior si está sonando
  stopAI();

  // Check cache
  const cacheKey = `${voice}:${input}`;
  if (audioCache.has(cacheKey)) {
    playFromURL(audioCache.get(cacheKey)!);
    return;
  }

  try {
    const resp = await fetch(TTS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OR_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://sistema-omicrom.vercel.app',
        'X-Title': 'Sistema Omicron',
      },
      body: JSON.stringify({
        model: TTS_MODELS[0],
        input,
        voice: VOICES[voice],
      }),
    });

    if (!resp.ok) {
      // Si Kokoro falla, intentar con fallback model
      if (TTS_MODELS.length > 1) {
        const resp2 = await fetch(TTS_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OR_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://sistema-omicrom.vercel.app',
            'X-Title': 'Sistema Omicron',
          },
          body: JSON.stringify({
            model: TTS_MODELS[1],
            input,
            voice: VOICES[voice],
          }),
        });
        if (!resp2.ok) return; // Silencio
        const blob = await resp2.blob();
        const url = URL.createObjectURL(blob);
        audioCache.set(cacheKey, url);
        playFromURL(url);
        return;
      }
      return; // Silencio
    }

    // Convertir response a audio blob y reproducir
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    audioCache.set(cacheKey, url);
    playFromURL(url);
  } catch {
    // Silencio si hay error de red
  }
}

/**
 * Detener la voz actual.
 */
export function stopAI(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
}

/**
 * ¿Está hablando ahora?
 */
export function isSpeakingAI(): boolean {
  return !!currentAudio && !currentAudio.paused;
}

/**
 * Reproducir desde objectURL.
 */
function playFromURL(url: string): void {
  const audio = new Audio(url);
  audio.volume = 0.85;
  currentAudio = audio;
  audio.play().catch(() => {
    // Autoplay blocked — necesita interacción previa del usuario
    currentAudio = null;
  });
  audio.onended = () => { currentAudio = null; };
}

/**
 * Limpiar cache (liberar memoria).
 */
export function clearVoiceCache(): void {
  for (const url of audioCache.values()) {
    URL.revokeObjectURL(url);
  }
  audioCache.clear();
}

/**
 * Verifica si TTS con IA está disponible.
 */
export function isVoiceAIAvailable(): boolean {
  return !!OR_KEY;
}
