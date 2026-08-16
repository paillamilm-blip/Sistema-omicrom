// src/lib/speechRecognition.ts
// ═══════════════════════════════════════════════════════════════════════
// SPEECH RECOGNITION — Utility compartido.
//
// Antes: boilerplate de SpeechRecognition repetido en OrbShell.tsx y
// OrbOnboarding.tsx con 5+ eslint-disable para `as any`.
// Ahora: un solo archivo tipado, sin `any`, reutilizable.
// ═══════════════════════════════════════════════════════════════════════

/** Cross-browser SpeechRecognition constructor (or null if unsupported) */
function getSpeechRecognitionCtor(): (new () => SpeechRecognition) | null {
  if (typeof window === 'undefined') return null;
  // Standard
  if ('SpeechRecognition' in window) {
    return (window as unknown as { SpeechRecognition: new () => SpeechRecognition }).SpeechRecognition;
  }
  // Webkit prefix (Chrome, Edge, Safari)
  if ('webkitSpeechRecognition' in window) {
    return (window as unknown as { webkitSpeechRecognition: new () => SpeechRecognition }).webkitSpeechRecognition;
  }
  return null;
}

/** Whether speech recognition is available in this browser */
export function isSpeechAvailable(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

export interface SpeechOptions {
  /** Language code (default: 'es-CL') */
  lang?: string;
  /** Show interim results while speaking (default: true) */
  interimResults?: boolean;
  /** Called with transcript on each interim/final result */
  onResult: (transcript: string, isFinal: boolean) => void;
  /** Called when recognition ends (natural or error) */
  onEnd?: () => void;
  /** Called on error */
  onError?: (error: string) => void;
}

export interface SpeechHandle {
  /** Abort recognition immediately */
  abort: () => void;
}

/**
 * Starts speech recognition and returns a handle to abort it.
 * Returns null if speech recognition is not available.
 */
export function startSpeechRecognition(options: SpeechOptions): SpeechHandle | null {
  const SR = getSpeechRecognitionCtor();
  if (!SR) return null;

  const { lang = 'es-CL', interimResults = true, onResult, onEnd, onError } = options;

  const recog = new SR();
  recog.lang = lang;
  recog.interimResults = interimResults;
  recog.continuous = false;

  recog.onresult = (e: SpeechRecognitionEvent) => {
    const result = e.results[e.results.length - 1];
    const transcript = result[0].transcript;
    onResult(transcript, result.isFinal);
  };

  recog.onerror = (e: SpeechRecognitionErrorEvent) => {
    onError?.(e.error);
  };

  recog.onend = () => {
    onEnd?.();
  };

  recog.start();

  return {
    abort: () => {
      try { recog.abort(); } catch { /* already stopped */ }
    },
  };
}
