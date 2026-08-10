// src/lib/voiceAI.ts
// ═══════════════════════════════════════════════════════════════════════
// VOICE AI — TTS con IA natural via OpenRouter (Kokoro 82M).
// Voces ESPAÑOLAS reales (ef_dora, em_alex, em_santa).
// Fallback automático a Web Speech API (voiceEngine.ts) si la API falla.
// ═══════════════════════════════════════════════════════════════════════

import { speak } from './voiceEngine';

const OR_KEY = import.meta.env.VITE_OPENROUTER_KEY ?? '';
const TTS_URL = 'https://openrouter.ai/api/v1/audio/speech';

// Modelos TTS disponibles en OpenRouter (ordenados por preferencia)
const TTS_MODELS = [
  'hexgrad/kokoro-82m',             // Gratis, 82M params, español
  'google/gemini-2.5-flash-tts',    // Fallback si Kokoro no disponible
];

// Voces ESPAÑOLAS de Kokoro (prefijo "e" = español)
// ef_dora = femenina española (la mejor calidad)
// em_alex = masculino español
// em_santa = masculino español alternativo
const VOICES = {
  default: 'ef_dora',     // Femenina española — clara, natural
  male: 'em_alex',        // Masculino español
  warm: 'ef_dora',        // Misma femenina (es la de mayor calidad)
} as const;

// Cache de audio para no regenerar frases repetidas
const audioCache = new Map<string, string>(); // text → objectURL
const MAX_CACHE = 30; // Máximo entradas en cache

// Control de reproducción actual
let currentAudio: HTMLAudioElement | null = null;

// Unlock de autoplay: el browser necesita al menos 1 interacción del usuario
let audioUnlocked = false;

function unlockAudio(): void {
  if (audioUnlocked) return;
  // Crear y reproducir un audio silencioso para desbloquear autoplay
  const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  const buf = ctx.createBuffer(1, 1, 22050);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  src.start(0);
  audioUnlocked = true;
  ctx.close().catch(() => { /* ignore */ });
  // Emitir evento para que OrbShell sepa que puede hablar libremente
  window.dispatchEvent(new CustomEvent('omicron:audio-unlocked'));
}

/**
 * ¿El audio está desbloqueado? (el usuario ya tocó/clickeó al menos una vez)
 */
export function isAudioUnlocked(): boolean {
  return audioUnlocked;
}

// Registrar unlock en primera interacción del usuario
if (typeof window !== 'undefined') {
  const events = ['click', 'touchstart', 'keydown'];
  const handler = () => {
    unlockAudio();
    // También desbloquear Web Speech API en iOS/Safari
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance('');
      u.volume = 0;
      window.speechSynthesis.speak(u);
    }
    events.forEach(e => window.removeEventListener(e, handler));
  };
  events.forEach(e => window.addEventListener(e, handler, { once: false, passive: true }));
}

/**
 * Fallback: usa Web Speech API del navegador.
 * Emite evento speaking para vibracion del orbe.
 */
function fallbackToWebSpeech(text: string): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('omicron:speaking', { detail: { active: true } }));
  }
  speak(text, undefined, () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('omicron:speaking', { detail: { active: false } }));
    }
  });
}

/**
 * Genera y reproduce voz con IA (OpenRouter Kokoro TTS).
 * Si falla → cae a Web Speech API (siempre suena algo).
 * Emite evento 'omicron:speaking' para que el orbe vibre.
 */
export async function speakAI(text: string, voice: keyof typeof VOICES = 'default'): Promise<void> {
  if (!text.trim()) return;

  // Emitir evento para que el orbe vibre mientras habla
  const emitSpeaking = (active: boolean) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('omicron:speaking', { detail: { active } }));
    }
  };

  // Si no hay key → usar Web Speech API directamente
  if (!OR_KEY) {
    emitSpeaking(true);
    speak(text, undefined, () => emitSpeaking(false));
    return;
  }

  // Truncar texto largo (TTS tiene límite ~500 chars para buena calidad)
  const input = text.slice(0, 500);

  // Detener audio anterior si está sonando
  stopAI();

  // Check cache
  const cacheKey = `${voice}:${input}`;
  if (audioCache.has(cacheKey)) {
    playFromURL(audioCache.get(cacheKey)!);
    return;
  }

  // Timeout: si la API no responde en 5s, fallback inmediato
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

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
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      console.warn(`[voiceAI] Kokoro falló (${resp.status}), intentando fallback…`);
      // Intentar segundo modelo
      const resp2 = await tryFallbackModel(input, voice);
      if (resp2) return;
      // Si ambos fallan → Web Speech API
      fallbackToWebSpeech(text);
      return;
    }

    // Verificar que la respuesta sea audio
    const contentType = resp.headers.get('content-type') ?? '';
    if (!contentType.includes('audio') && !contentType.includes('octet-stream')) {
      console.warn('[voiceAI] Respuesta no es audio:', contentType);
      fallbackToWebSpeech(text);
      return;
    }

    // Convertir response a audio blob y reproducir
    const blob = await resp.blob();
    if (blob.size < 100) {
      // Blob vacío o corrupto
      console.warn('[voiceAI] Audio vacío, fallback a Web Speech');
      fallbackToWebSpeech(text);
      return;
    }

    const url = URL.createObjectURL(blob);
    cacheAudio(cacheKey, url);
    playFromURL(url);
  } catch (err) {
    clearTimeout(timeout);
    console.warn('[voiceAI] Error de red:', err);
    fallbackToWebSpeech(text);
  }
}

/**
 * Intentar con el modelo de fallback (Gemini TTS).
 */
async function tryFallbackModel(input: string, voice: keyof typeof VOICES): Promise<boolean> {
  if (TTS_MODELS.length < 2) return false;

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
        model: TTS_MODELS[1],
        input,
        voice: VOICES[voice],
      }),
    });

    if (!resp.ok) return false;

    const blob = await resp.blob();
    if (blob.size < 100) return false;

    const url = URL.createObjectURL(blob);
    const cacheKey = `${voice}:${input}`;
    cacheAudio(cacheKey, url);
    playFromURL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Guardar en cache con límite de tamaño.
 */
function cacheAudio(key: string, url: string): void {
  // Evitar que el cache crezca sin límite
  if (audioCache.size >= MAX_CACHE) {
    const firstKey = audioCache.keys().next().value;
    if (firstKey) {
      const oldUrl = audioCache.get(firstKey);
      if (oldUrl) URL.revokeObjectURL(oldUrl);
      audioCache.delete(firstKey);
    }
  }
  audioCache.set(key, url);
}

/**
 * Detener la voz actual (IA o browser).
 */
export function stopAI(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  // También detener Web Speech por si estaba hablando
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

/**
 * ¿Está hablando ahora?
 */
export function isSpeakingAI(): boolean {
  if (currentAudio && !currentAudio.paused) return true;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    return window.speechSynthesis.speaking;
  }
  return false;
}

/**
 * Reproducir desde objectURL.
 */
function playFromURL(url: string): void {
  const audio = new Audio(url);
  audio.volume = 0.85;
  currentAudio = audio;
  // Emitir evento de que está hablando
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('omicron:speaking', { detail: { active: true } }));
  }
  audio.play().catch(() => {
    // Autoplay blocked → intentar Web Speech como último recurso
    currentAudio = null;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('omicron:speaking', { detail: { active: false } }));
    }
  });
  audio.onended = () => {
    currentAudio = null;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('omicron:speaking', { detail: { active: false } }));
    }
  };
  audio.onerror = () => {
    currentAudio = null;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('omicron:speaking', { detail: { active: false } }));
    }
  };
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
