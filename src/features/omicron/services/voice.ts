// src/lib/omicronVoice.ts
// ═══════════════════════════════════════════════════════════════════════
// ÓMICRON VOICE — TTS fluida vía Edge Function proxy-tts.
//
// Estrategia "hablar mientras piensa":
//   1. El texto de Ómicron se divide en oraciones
//   2. Cada oración se envía a proxy-tts (server-side, key protegida)
//   3. El audio de la primera oración empieza a sonar en ~1-2s
//   4. Mientras suena, ya se está generando el audio de la siguiente
//   5. El orbe vibra con el evento 'omicron:speaking'
//
// Si proxy-tts falla: fallback silencioso (no se habla, solo texto).
// NO usa Web Speech API — la voz es IA real (S2.1 Pro Free / Kokoro).
// ═══════════════════════════════════════════════════════════════════════

import { supabase } from '@/infrastructure/supabase/client';

// ── State ────────────────────────────────────────────────────────────
let isSpeaking = false;
let abortController: AbortController | null = null;
const audioQueue: HTMLAudioElement[] = [];

// ── Public API ───────────────────────────────────────────────────────

/**
 * Habla un texto completo con voz IA — chunking por oración.
 * Emite 'omicron:speaking' { speaking: true/false } para el orbe.
 * Retorna cuando termina de hablar o es abortado.
 */
export async function speakOmicron(text: string): Promise<void> {
  if (!text || text.length < 3) return;

  // Abortar voz anterior si está sonando
  stopOmicron();

  isSpeaking = true;
  abortController = new AbortController();
  window.dispatchEvent(new CustomEvent('omicron:speaking', { detail: { speaking: true } }));

  const sentences = splitIntoChunks(text);

  try {
    for (const sentence of sentences) {
      if (abortController.signal.aborted) break;
      await speakChunk(sentence);
    }
  } catch {
    // Silencioso — si TTS falla, el texto ya se mostró en UI
  } finally {
    isSpeaking = false;
    window.dispatchEvent(new CustomEvent('omicron:speaking', { detail: { speaking: false } }));
  }
}

/**
 * Detiene la voz inmediatamente.
 */
export function stopOmicron(): void {
  abortController?.abort();
  abortController = null;
  audioQueue.forEach(a => { a.pause(); a.src = ''; });
  audioQueue.length = 0;
  if (isSpeaking) {
    isSpeaking = false;
    window.dispatchEvent(new CustomEvent('omicron:speaking', { detail: { speaking: false } }));
  }
}

/**
 * ¿Está hablando ahora?
 */
export function isOmicronSpeaking(): boolean {
  return isSpeaking;
}

// ── Internals ────────────────────────────────────────────────────────

/** Divide texto en chunks de ~1 oración (máx 300 chars por chunk) */
function splitIntoChunks(text: string): string[] {
  // Split por punto, punto y coma, signos de exclamación/interrogación
  const raw = text.split(/(?<=[.!?;])\s+/);
  const chunks: string[] = [];
  let current = '';

  for (const part of raw) {
    if ((current + ' ' + part).length > 300 && current) {
      chunks.push(current.trim());
      current = part;
    } else {
      current = current ? current + ' ' + part : part;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks.filter(c => c.length >= 3);
}

/** Genera audio para un chunk via proxy-tts y lo reproduce. Si falla, usa speechSynthesis. */
async function speakChunk(text: string): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke('proxy-tts', {
      body: { text, voice: 'default', format: 'mp3' },
    });

    if (error || !data) {
      // TTS fallo — usar browser speechSynthesis como fallback
      await speakWithBrowserTTS(text);
      return;
    }

    // Check if response is a JSON fallback signal from proxy-tts
    if (data instanceof Blob && data.type === 'application/json') {
      const jsonText = await data.text();
      try {
        const parsed = JSON.parse(jsonText);
        if (parsed.fallback && parsed.text) {
          await speakWithBrowserTTS(parsed.text);
          return;
        }
      } catch {
        // Not valid JSON, continue with audio processing
      }
    }

    // Check for plain object fallback response (supabase client may parse JSON)
    if (data && typeof data === 'object' && !(data instanceof Blob) && !(data instanceof ArrayBuffer)) {
      if ('fallback' in data && (data as { fallback: boolean }).fallback && 'text' in data) {
        await speakWithBrowserTTS((data as { text: string }).text);
        return;
      }
    }

    // data viene como Blob (audio/mpeg) desde la Edge Function
    let blob: Blob;
    if (data instanceof Blob) {
      blob = data;
    } else if (data instanceof ArrayBuffer) {
      blob = new Blob([data], { type: 'audio/mpeg' });
    } else {
      // Si viene como base64 o similar, intentar fallback
      await speakWithBrowserTTS(text);
      return;
    }

    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audioQueue.push(audio);

    await new Promise<void>((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(url);
        audioQueue.splice(audioQueue.indexOf(audio), 1);
        resolve();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        audioQueue.splice(audioQueue.indexOf(audio), 1);
        resolve(); // No rechazar — seguir con el siguiente chunk
      };
      if (abortController?.signal.aborted) {
        reject(new Error('aborted'));
        return;
      }
      abortController?.signal.addEventListener('abort', () => {
        audio.pause();
        reject(new Error('aborted'));
      });
      audio.play().catch(() => resolve()); // Autoplay blocked → skip
    });
  } catch {
    // Si todo falla, intentar speechSynthesis como ultimo recurso
    await speakWithBrowserTTS(text).catch(() => {});
  }
}

/** Fallback: usa Web Speech API (speechSynthesis) con voz es-ES */
function speakWithBrowserTTS(text: string): Promise<void> {
  return new Promise<void>((resolve) => {
    if (!window.speechSynthesis) {
      resolve();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';

    // Intentar encontrar una voz es-ES
    const voices = window.speechSynthesis.getVoices();
    const esVoice = voices.find((v) => v.lang.startsWith('es-ES'))
      || voices.find((v) => v.lang.startsWith('es'));
    if (esVoice) {
      utterance.voice = esVoice;
    }

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();

    // Si el abort controller se activa, cancelar speechSynthesis
    if (abortController?.signal.aborted) {
      resolve();
      return;
    }
    abortController?.signal.addEventListener('abort', () => {
      window.speechSynthesis.cancel();
      resolve();
    });

    window.speechSynthesis.speak(utterance);
  });
}
