// src/infrastructure/voice/voiceAnalyser.ts
// ═══════════════════════════════════════════════════════════════════════
// VOICE ANALYSER — reactividad de amplitud en tiempo real para el orbe.
//
// Adjunta un AnalyserNode de Web Audio al <audio> que está reproduciendo la
// voz de Ómicrom, calcula un nivel RMS suavizado 0..1 por frame y lo emite
// vía el CustomEvent 'oracle:voice' que OrbShell ya consume. Así el pulso de
// escala del orbe se convierte en un "ecualizador" que rebota con la voz real.
//
// Robustez:
//   • Un ÚNICO AudioContext compartido (nunca uno por reproducción).
//   • WeakMap que garantiza createMediaElementSource() a lo sumo 1 vez por
//     elemento (llamarlo dos veces sobre el mismo <audio> lanza excepción).
//   • Si el audio es cross-origin sin CORS (datos en cero) o si
//     createMediaElementSource lanza, cae a una oscilación sintética viva
//     sobre el MISMO evento, para que el orbe siga leyéndose como reactivo.
//   • Respeta prefers-reduced-motion (sin rAF, un único nivel 0).
//   • SSR/test-safe con guards typeof window / AudioContext.
// ═══════════════════════════════════════════════════════════════════════

type WebkitWindow = Window & {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
};

// ── Estado a nivel de módulo ─────────────────────────────────────────
let sharedCtx: AudioContext | null = null;
const sourceMap = new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>();

let rafId: number | null = null;
let activeEl: HTMLAudioElement | null = null;
let activeAnalyser: AnalyserNode | null = null;
let timeData: Uint8Array<ArrayBuffer> | null = null;
let smoothed = 0;

// Detección de señal "muerta" (CORS-tainted → todo en cero) para fallback.
let flatSinceTs = 0;
let usingFallback = false;
let fallbackPhase = 0;

// ── Helpers de entorno ───────────────────────────────────────────────
function hasWindow(): boolean {
  return typeof window !== 'undefined';
}

function getAudioContextCtor(): typeof AudioContext | null {
  if (!hasWindow()) return null;
  const w = window as WebkitWindow;
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

function prefersReducedMotion(): boolean {
  if (!hasWindow() || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function dispatchLevel(level: number): void {
  if (!hasWindow()) return;
  window.dispatchEvent(new CustomEvent('oracle:voice', { detail: { level } }));
}

function ensureContext(): AudioContext | null {
  if (sharedCtx) return sharedCtx;
  const Ctor = getAudioContextCtor();
  if (!Ctor) return null;
  try {
    sharedCtx = new Ctor();
  } catch {
    sharedCtx = null;
  }
  return sharedCtx;
}

/**
 * Obtiene (o crea una única vez) el MediaElementAudioSourceNode del elemento.
 * createMediaElementSource() solo puede llamarse UNA vez por elemento durante
 * toda su vida; el WeakMap evita la segunda llamada (que lanzaría).
 */
function getOrCreateSource(
  ctx: AudioContext,
  el: HTMLAudioElement,
): MediaElementAudioSourceNode | null {
  const existing = sourceMap.get(el);
  if (existing) return existing;
  try {
    const source = ctx.createMediaElementSource(el);
    sourceMap.set(el, source);
    return source;
  } catch {
    return null;
  }
}

// ── Fallback sintético ───────────────────────────────────────────────
// Oscilación pseudo-ruidosa suave en ~0.15..0.6 combinando senoidales de
// frecuencias incommensurables + algo de aleatoriedad, para que el orbe
// se lea como reactivo incluso cuando Web Audio devuelve ceros (CORS).
function synthesizedLevel(): number {
  fallbackPhase += 0.09;
  const a = Math.sin(fallbackPhase) * 0.5 + 0.5;
  const b = Math.sin(fallbackPhase * 1.7 + 1.3) * 0.5 + 0.5;
  const c = Math.sin(fallbackPhase * 2.63 + 0.6) * 0.5 + 0.5;
  const jitter = Math.random() * 0.12;
  const raw = 0.15 + (a * 0.5 + b * 0.3 + c * 0.2) * 0.35 + jitter * 0.4;
  return Math.max(0.15, Math.min(0.6, raw));
}

// ── Loop de análisis ─────────────────────────────────────────────────
function tick(): void {
  if (!activeEl) return;

  let level = 0;

  if (usingFallback) {
    level = synthesizedLevel();
  } else if (activeAnalyser && timeData) {
    activeAnalyser.getByteTimeDomainData(timeData);
    let sumSq = 0;
    for (let i = 0; i < timeData.length; i++) {
      const v = (timeData[i] - 128) / 128;
      sumSq += v * v;
    }
    const rms = Math.sqrt(sumSq / timeData.length);
    // Normalizar: RMS típico de voz ~0.05..0.35 → escalar a 0..1.
    level = Math.max(0, Math.min(1, rms * 2.6));

    // Detectar señal plana (CORS-tainted) mientras el elemento suena.
    const playing = !activeEl.paused && !activeEl.ended;
    if (playing && rms < 0.004) {
      const now = hasWindow() ? performance.now() : Date.now();
      if (flatSinceTs === 0) flatSinceTs = now;
      else if (now - flatSinceTs > 300) {
        usingFallback = true;
        level = synthesizedLevel();
      }
    } else {
      flatSinceTs = 0;
    }
  }

  // Suavizado exponencial para que module en vez de saltar.
  smoothed += (level - smoothed) * 0.35;
  dispatchLevel(smoothed);

  rafId = requestAnimationFrame(tick);
}

// ── API pública ──────────────────────────────────────────────────────

/**
 * Inicia el análisis de amplitud sobre el <audio> dado. Idempotente: si ya
 * había un loop activo (nueva reproducción interrumpiendo la anterior) lo
 * detiene primero. Inserta source→analyser→destination para NO cortar el
 * sonido. Cae a fallback sintético si Web Audio no puede leer los datos.
 */
export function startVoiceAnalysis(audio: HTMLAudioElement): void {
  if (!hasWindow()) return;

  // Detener cualquier loop previo sin resetear el orbe todavía.
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  // Reduced motion: no animar; un único nivel 0.
  if (prefersReducedMotion()) {
    activeEl = null;
    activeAnalyser = null;
    dispatchLevel(0);
    return;
  }

  activeEl = audio;
  activeAnalyser = null;
  timeData = null;
  smoothed = 0;
  flatSinceTs = 0;
  usingFallback = false;

  const ctx = ensureContext();
  if (!ctx) {
    // Sin Web Audio: usar fallback sintético directamente.
    usingFallback = true;
    rafId = requestAnimationFrame(tick);
    return;
  }

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  try {
    const source = getOrCreateSource(ctx, audio);
    if (!source) {
      // createMediaElementSource lanzó / no disponible → fallback.
      usingFallback = true;
    } else {
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.6;
      // Inserción en línea: el audio sigue llegando a los parlantes.
      source.connect(analyser);
      analyser.connect(ctx.destination);
      activeAnalyser = analyser;
      timeData = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
    }
  } catch {
    usingFallback = true;
  }

  rafId = requestAnimationFrame(tick);
}

/**
 * Detiene el loop de análisis y asienta el orbe (nivel 0). NO cierra el
 * AudioContext compartido ni desconecta el source del elemento (queda ligado
 * al elemento de por vida para permitir reuso sin volver a "sourcear").
 */
export function stopVoiceAnalysis(): void {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  activeEl = null;
  activeAnalyser = null;
  timeData = null;
  smoothed = 0;
  flatSinceTs = 0;
  usingFallback = false;
  dispatchLevel(0);
}
