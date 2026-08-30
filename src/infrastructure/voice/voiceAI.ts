// src/lib/voiceAI.ts
// ═══════════════════════════════════════════════════════════════════════
// VOICE AI — TTS inteligente.
// - speakAI(text): usa proxy-tts Edge Function (key SOLO server-side)
// - speakLocal(text): usa Web Speech API (gratis, infinito) — para textos fijos
// Ambas emiten eventos 'omicron:speaking' para vibrar el orbe.
//
// SEGURIDAD: La OPENROUTER_KEY NUNCA llega al browser. El frontend
// invoca supabase.functions.invoke('proxy-tts') → la Edge Function
// llama a OpenRouter con la key protegida server-side.
// ═══════════════════════════════════════════════════════════════════════

import { speak } from '@/infrastructure/voice/engine';
import { supabase } from '@/infrastructure/supabase/client';
import { startVoiceAnalysis, stopVoiceAnalysis } from '@/infrastructure/voice/voiceAnalyser';

// Voces disponibles (deben coincidir con proxy-tts)
const VOICES = {
  default: 'default',
  male: 'male',
  warm: 'default',
} as const;

// Cache de audio
const audioCache = new Map<string, string>();
const MAX_CACHE = 30;

// Control de reproducción — identity check para evitar stale handlers
let currentAudio: HTMLAudioElement | null = null;
let speakGeneration = 0; // Incrementa cada llamada para detectar stale callbacks

// Abort controller para cancelar fetch en vuelo
let inFlightController: AbortController | null = null;

// ── Autoplay Unlock ─────────────────────────────────────────────────
let audioUnlocked = false;

function unlockAudio(): void {
  if (audioUnlocked) return;
  audioUnlocked = true;
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
    ctx.close().catch(() => {});
  } catch { /* ignore */ }
  // Desbloquear Web Speech en iOS
  try {
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance('');
      u.volume = 0;
      window.speechSynthesis.speak(u);
    }
  } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent('omicron:audio-unlocked'));
}

export function isAudioUnlocked(): boolean {
  return audioUnlocked;
}

// Registrar unlock — remover listeners ANTES de ejecutar (evitar double-tap)
if (typeof window !== 'undefined') {
  const events = ['click', 'touchstart', 'keydown'];
  const handler = () => {
    events.forEach(e => window.removeEventListener(e, handler));
    unlockAudio();
  };
  events.forEach(e => window.addEventListener(e, handler, { once: false, passive: true }));
}

// ── Helpers ──────────────────────────────────────────────────────────
function emitSpeaking(active: boolean): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('omicron:speaking', { detail: { active } }));
  }
}

/**
 * Fallback: Web Speech API. Emite speaking events correctamente.
 */
function fallbackToWebSpeech(text: string): void {
  const started = speak(text, undefined, () => emitSpeaking(false));
  if (started) {
    emitSpeaking(true);
  } else {
    // speak() falló (no hay voces, no soportado) — no dejar orbe vibrando
    emitSpeaking(false);
  }
}

// ── Main TTS Function ────────────────────────────────────────────────

/**
 * Genera y reproduce voz con IA via proxy-tts Edge Function.
 * La API key vive SOLO server-side (nunca en el bundle del browser).
 * Si falla → cae directo a Web Speech API.
 * Thread-safe: cancela llamadas anteriores automáticamente.
 */
export async function speakAI(text: string, voice: keyof typeof VOICES = 'default'): Promise<void> {
  if (!text.trim()) return;

  // Incrementar generación para detectar stale callbacks
  const gen = ++speakGeneration;

  const input = text.slice(0, 500);

  // Cancelar fetch anterior en vuelo (evitar race conditions)
  if (inFlightController) {
    inFlightController.abort();
    inFlightController = null;
  }

  // Detener audio anterior
  stopAI();

  // Check cache
  const cacheKey = `${voice}:${input}`;
  if (audioCache.has(cacheKey)) {
    playFromURL(audioCache.get(cacheKey)!, gen);
    return;
  }

  // Call proxy-tts Edge Function (key protegida server-side)
  const controller = new AbortController();
  inFlightController = controller;
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const { data, error } = await supabase.functions.invoke('proxy-tts', {
      body: { text: input, voice: VOICES[voice], format: 'mp3' },
    });

    clearTimeout(timeout);
    inFlightController = null;

    // Si esta llamada ya fue superada por otra, no hacer nada
    if (gen !== speakGeneration) return;

    if (error) {
      console.warn('[voiceAI] proxy-tts error:', error);
      fallbackToWebSpeech(text);
      return;
    }

    // Si el server devolvió JSON con fallback: true → usar Web Speech
    if (data && typeof data === 'object' && 'fallback' in data) {
      fallbackToWebSpeech(text);
      return;
    }

    // data es un Blob (audio)
    const blob = data instanceof Blob ? data : new Blob([data], { type: 'audio/mpeg' });
    if (blob.size < 100) {
      fallbackToWebSpeech(text);
      return;
    }

    // Si ya fue superada, no reproducir
    if (gen !== speakGeneration) return;

    const url = URL.createObjectURL(blob);
    cacheAudio(cacheKey, url);
    playFromURL(url, gen);
  } catch {
    clearTimeout(timeout);
    inFlightController = null;
    // AbortError es esperado (timeout o cancel) — silencio
    if (gen === speakGeneration) {
      fallbackToWebSpeech(text);
    }
  }
}

// ── Audio Playback ───────────────────────────────────────────────────

function playFromURL(url: string, _gen: number): void {
  const audio = new Audio(url);
  // Necesario para que Web Audio pueda leer audio cross-origin cuando el
  // servidor lo permite; inofensivo si no (el fallback cubre el caso no-CORS).
  audio.crossOrigin = 'anonymous';
  audio.volume = 0.85;
  currentAudio = audio;
  emitSpeaking(true);

  audio.play()
    .then(() => {
      // Solo analizar si ESTE audio sigue siendo el actual.
      if (currentAudio === audio) startVoiceAnalysis(audio);
    })
    .catch(() => {
      // Autoplay blocked
      if (currentAudio === audio) currentAudio = null;
      stopVoiceAnalysis();
      emitSpeaking(false);
    });

  audio.onended = () => {
    // Identity check: solo emitir si ESTE audio sigue siendo el actual
    if (currentAudio === audio) {
      currentAudio = null;
      stopVoiceAnalysis();
      emitSpeaking(false);
    }
  };

  audio.onerror = () => {
    if (currentAudio === audio) {
      currentAudio = null;
      stopVoiceAnalysis();
      emitSpeaking(false);
    }
  };
}

// ── Stop / Status ────────────────────────────────────────────────────

export function stopAI(): void {
  // Cancelar fetch en vuelo
  if (inFlightController) {
    inFlightController.abort();
    inFlightController = null;
  }
  if (currentAudio) {
    const src = currentAudio.src;
    currentAudio.onended = null; // Evitar stale handler
    currentAudio.onerror = null;
    currentAudio.pause();
    currentAudio = null;
    // Revocar URL si no está en cache
    if (src?.startsWith('blob:')) {
      let inCache = false;
      for (const url of audioCache.values()) {
        if (url === src) { inCache = true; break; }
      }
      if (!inCache) URL.revokeObjectURL(src);
    }
  }
  // Detener análisis de amplitud y asentar el orbe
  stopVoiceAnalysis();
  // Detener Web Speech
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  emitSpeaking(false);
}

export function isSpeakingAI(): boolean {
  if (currentAudio && !currentAudio.paused) return true;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    return window.speechSynthesis.speaking;
  }
  return false;
}

// ── Cache ────────────────────────────────────────────────────────────

function cacheAudio(key: string, url: string): void {
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

export function clearVoiceCache(): void {
  for (const url of audioCache.values()) {
    URL.revokeObjectURL(url);
  }
  audioCache.clear();
}

export function isVoiceAIAvailable(): boolean {
  // Siempre disponible — la key está server-side en la Edge Function.
  // Si la Edge Function no tiene la key, retorna fallback: true y se usa Web Speech.
  return true;
}


/**
 * Habla texto usando Web Speech API del browser (GRATIS, sin gastar API).
 * Usar para textos fijos/offline: navegación, datos del perfil, saludos.
 * Emite eventos omicron:speaking para vibrar el orbe.
 */
export function speakLocal(text: string): void {
  if (!text.trim()) return;
  stopAI(); // Detener cualquier audio previo
  const started = speak(text, undefined, () => emitSpeaking(false));
  if (started) {
    emitSpeaking(true);
  }
}
