// lib/voiceEngine.ts
// ═══════════════════════════════════════════════════════════════════════
// ÓMICRON · Motor de Voz — ElevenLabs (ultra-realista) + fallback Web Speech
//
// Prioridad:
//   1. ElevenLabs (via Edge Function 'tts') — voz humana real
//   2. Web Speech API (fallback) — si ElevenLabs no está configurado
//
// La app NO necesita saber cuál se usa: solo llama speak("texto").
// ═══════════════════════════════════════════════════════════════════════
import { supabase } from './supabase';

// ── Cache de audio para no repetir llamadas a ElevenLabs ─────────────
const audioCache = new Map<string, string>(); // text hash → blob URL
let currentAudio: HTMLAudioElement | null = null;
let elevenLabsAvailable: boolean | null = null; // null = no probado aún

// ── Web Speech API config (fallback) ─────────────────────────────────
const FALLBACK_CONFIG = {
  pitch: 1.0,
  rate: 0.92,
  volume: 1.0,
} as const;

/**
 * Limpia texto para locución (quita markdown, normaliza espacios).
 */
function cleanForSpeech(text: string): string {
  return text
    .replace(/\*\*/g, '')
    .replace(/[*_`#>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Genera un hash simple del texto para cache.
 */
function textHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(36);
}

// ═══════════════════════════════════════════════════════════════════════
// ELEVENLABS TTS (prioridad 1)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Intenta sintetizar voz con ElevenLabs via la Edge Function 'tts'.
 * Retorna true si funcionó, false si no (y debe usar fallback).
 */
async function speakElevenLabs(
  text: string,
  onStart?: () => void,
  onEnd?: () => void,
): Promise<boolean> {
  try {
    const clean = cleanForSpeech(text);
    if (!clean) return false;

    // Truncate at 500 chars for cost control
    const truncated = clean.length > 500 ? clean.slice(0, 497) + '...' : clean;

    // Check cache first
    const hash = textHash(truncated);
    let blobUrl = audioCache.get(hash);

    if (!blobUrl) {
      // Call Edge Function
      const { data, error } = await supabase.functions.invoke('tts', {
        body: { text: truncated },
      });

      if (error || !data) {
        // ElevenLabs not available — mark and fallback
        elevenLabsAvailable = false;
        return false;
      }

      // data is an ArrayBuffer (audio/mpeg) from the Edge Function
      const blob = new Blob([data], { type: 'audio/mpeg' });
      blobUrl = URL.createObjectURL(blob);

      // Cache (keep max 20 entries)
      if (audioCache.size > 20) {
        const firstKey = audioCache.keys().next().value;
        if (firstKey) {
          URL.revokeObjectURL(audioCache.get(firstKey)!);
          audioCache.delete(firstKey);
        }
      }
      audioCache.set(hash, blobUrl);
    }

    // Mark as available
    elevenLabsAvailable = true;

    // Stop previous audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }

    // Play audio
    const audio = new Audio(blobUrl);
    currentAudio = audio;

    audio.onplay = () => { onStart?.(); };
    audio.onended = () => { currentAudio = null; onEnd?.(); };
    audio.onerror = () => { currentAudio = null; onEnd?.(); };

    await audio.play();
    return true;
  } catch (err) {
    console.warn('[voiceEngine] ElevenLabs failed, using fallback:', err);
    elevenLabsAvailable = false;
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// WEB SPEECH API (fallback)
// ═══════════════════════════════════════════════════════════════════════

function selectBestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  const premiumNames = [
    'Google español', 'es-ES-Standard-A', 'es-ES-Wavenet-C', 'es-ES-Neural2-A',
    'Microsoft Helena - Spanish (Spain)', 'es-ES-ElviraNeural',
    'Mónica', 'Paulina', 'Jorge', 'Spanish Spain', 'es-ES',
  ];

  for (const name of premiumNames) {
    const match = voices.find((v) =>
      v.name.toLowerCase().includes(name.toLowerCase()) ||
      v.lang.toLowerCase().startsWith(name.toLowerCase())
    );
    if (match) return match;
  }

  const anySpanish = voices.find((v) => v.lang.toLowerCase().startsWith('es'));
  return anySpanish || voices[0] || null;
}

function speakWebSpeech(
  text: string,
  onStart?: () => void,
  onEnd?: () => void,
): boolean {
  try {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;

    window.speechSynthesis.cancel();
    const clean = cleanForSpeech(text);
    if (!clean) return false;

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.pitch = FALLBACK_CONFIG.pitch;
    utterance.rate = FALLBACK_CONFIG.rate;
    utterance.volume = FALLBACK_CONFIG.volume;

    const voices = window.speechSynthesis.getVoices();
    const bestVoice = selectBestVoice(voices);
    if (bestVoice) {
      utterance.voice = bestVoice;
      utterance.lang = bestVoice.lang;
    } else {
      utterance.lang = 'es-ES';
    }

    if (onStart) utterance.onstart = () => onStart();
    if (onEnd) {
      utterance.onend = () => onEnd();
      utterance.onerror = () => onEnd();
    }

    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// PUBLIC API (la app solo llama estas funciones)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Habla el texto con la mejor voz disponible.
 * Intenta ElevenLabs primero. Si no está configurado/falla, usa Web Speech.
 */
export function speak(
  text: string,
  onStart?: () => void,
  onEnd?: () => void,
): boolean {
  if (!text || text.trim().length === 0) return false;

  // If we already know ElevenLabs is not available, go straight to fallback
  if (elevenLabsAvailable === false) {
    return speakWebSpeech(text, onStart, onEnd);
  }

  // Try ElevenLabs (async) — fire and don't block
  speakElevenLabs(text, onStart, onEnd).then((success) => {
    if (!success) {
      // Fallback to Web Speech
      speakWebSpeech(text, onStart, onEnd);
    }
  });

  return true; // Optimistic: something will play
}

/**
 * Cancela cualquier síntesis de voz en curso.
 */
export function stopSpeaking(): void {
  try {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  } catch { /* silent */ }
}

/**
 * Verifica si el navegador soporta alguna forma de voz.
 */
export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * Pre-carga voces del navegador (necesario en Chrome).
 */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    try {
      if (!isSpeechSupported()) { resolve([]); return; }
      const synth = window.speechSynthesis;
      let voices = synth.getVoices();
      if (voices.length > 0) { resolve(voices); return; }
      synth.onvoiceschanged = () => { resolve(synth.getVoices()); };
    } catch { resolve([]); }
  });
}
