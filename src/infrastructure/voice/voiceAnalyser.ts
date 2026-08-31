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
let freqData: Uint8Array<ArrayBuffer> | null = null;
let smoothed = 0;
// Bandas de frecuencia suavizadas (ecualizador esférico — Inc 2).
let smoothedBass = 0;
let smoothedMid = 0;
let smoothedTreble = 0;

// Detección de señal "muerta" (CORS-tainted → todo en cero) para fallback.
let flatSinceTs = 0;
let usingFallback = false;
let fallbackPhase = 0;
// Contador de frames para sondear periódicamente si el fallback puede
// auto-recuperarse (señal real viva). Se reinicia en start/stop.
let frameCounter = 0;

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

// Emite las bandas de frecuencia (0..1) para el ecualizador esférico.
function dispatchSpectrum(bass: number, mid: number, treble: number): void {
  if (!hasWindow()) return;
  window.dispatchEvent(
    new CustomEvent('oracle:spectrum', { detail: { bass, mid, treble } }),
  );
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

// Bandas sintéticas (bass/mid/treble) derivadas de la misma oscilación de
// fallback, con desfases distintos para que el ecualizador se mueva vivo aun
// sin datos reales de Web Audio. Se mantienen en un rango discreto ~0.1..0.7.
function synthesizedBands(): { bass: number; mid: number; treble: number } {
  const clamp = (v: number) => Math.max(0.1, Math.min(0.7, v));
  const bass = clamp(0.35 + Math.sin(fallbackPhase * 0.9) * 0.3);
  const mid = clamp(0.35 + Math.sin(fallbackPhase * 1.7 + 2.1) * 0.3);
  const treble = clamp(0.3 + Math.sin(fallbackPhase * 2.6 + 4.2) * 0.28);
  return { bass, mid, treble };
}

// ── Loop de análisis ─────────────────────────────────────────────────
function tick(): void {
  if (!activeEl) return;

  frameCounter++;

  // Auto-recuperación del fallback: si estamos en fallback pero hay un analyser
  // real disponible, sondear la señal cada ~30 frames (~500ms). Si el RMS real
  // ya está vivo (> 0.01), volver a leer datos reales en vez del sintético.
  if (usingFallback && activeAnalyser && timeData) {
    if (frameCounter % 30 === 0) {
      activeAnalyser.getByteTimeDomainData(timeData);
      let probeSumSq = 0;
      for (let i = 0; i < timeData.length; i++) {
        const v = (timeData[i] - 128) / 128;
        probeSumSq += v * v;
      }
      const probeRms = Math.sqrt(probeSumSq / timeData.length);
      if (probeRms > 0.01) {
        usingFallback = false;
        flatSinceTs = 0;
      }
    }
  }

  let level = 0;
  let bass = 0;
  let mid = 0;
  let treble = 0;

  if (usingFallback) {
    level = synthesizedLevel();
    const bands = synthesizedBands();
    bass = bands.bass;
    mid = bands.mid;
    treble = bands.treble;
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

    // Bandas de frecuencia: repartir los bins en tercios (grave/medio/agudo).
    if (freqData) {
      activeAnalyser.getByteFrequencyData(freqData);
      const bins = freqData.length; // = analyser.frequencyBinCount
      const third = Math.max(1, Math.floor(bins / 3));
      let sumBass = 0;
      let sumMid = 0;
      let sumTreble = 0;
      for (let i = 0; i < bins; i++) {
        const v = freqData[i];
        if (i < third) sumBass += v;
        else if (i < third * 2) sumMid += v;
        else sumTreble += v;
      }
      const midCount = third;
      const trebleCount = bins - third * 2;
      bass = sumBass / third / 255;
      mid = sumMid / midCount / 255;
      treble = sumTreble / Math.max(1, trebleCount) / 255;
      // Noise-gate suave: silencio real asienta plano en vez de titilar.
      // Solo sobre bandas REALES (no aplica al fallback, que debe seguir vivo).
      if (bass < 0.06) bass = 0;
      if (mid < 0.06) mid = 0;
      if (treble < 0.06) treble = 0;
    }

    // Detectar señal plana (CORS-tainted) mientras el elemento suena.
    const playing = !activeEl.paused && !activeEl.ended;
    if (playing && rms < 0.004) {
      const now = hasWindow() ? performance.now() : Date.now();
      if (flatSinceTs === 0) flatSinceTs = now;
      else if (now - flatSinceTs > 300) {
        usingFallback = true;
        level = synthesizedLevel();
        const bands = synthesizedBands();
        bass = bands.bass;
        mid = bands.mid;
        treble = bands.treble;
      }
    } else {
      flatSinceTs = 0;
    }
  }

  // Suavizado exponencial para que module en vez de saltar.
  smoothed += (level - smoothed) * 0.35;
  dispatchLevel(smoothed);

  // Mismas constantes de suavizado para las bandas del ecualizador.
  smoothedBass += (bass - smoothedBass) * 0.35;
  smoothedMid += (mid - smoothedMid) * 0.35;
  smoothedTreble += (treble - smoothedTreble) * 0.35;
  dispatchSpectrum(smoothedBass, smoothedMid, smoothedTreble);

  rafId = requestAnimationFrame(tick);
}

// ── API pública ──────────────────────────────────────────────────────

/**
 * Inicia el análisis de amplitud sobre el <audio> dado. Idempotente: si ya
 * había un loop activo (nueva reproducción interrumpiendo la anterior) lo
 * detiene primero. Inserta source→analyser→destination para NO cortar el
 * sonido. Cae a fallback sintético si Web Audio no puede leer los datos.
 */
export async function startVoiceAnalysis(
  audio: HTMLAudioElement,
): Promise<void> {
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
  freqData = null;
  smoothed = 0;
  smoothedBass = 0;
  smoothedMid = 0;
  smoothedTreble = 0;
  flatSinceTs = 0;
  usingFallback = false;
  frameCounter = 0;

  const ctx = ensureContext();
  if (!ctx) {
    // Sin Web Audio: usar fallback sintético directamente.
    usingFallback = true;
    rafId = requestAnimationFrame(tick);
    return;
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
      freqData = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
    }
  } catch {
    usingFallback = true;
  }

  // Un AudioContext suspendido (típico hasta que hay gesto del usuario)
  // entrega bytes de silencio (128) y el detector de señal plana latcharía el
  // fallback sintético en ~300ms antes de que llegue audio real. Por eso, si
  // está suspendido, ESPERAMOS a que reanude (con timeout > 1s) ANTES de
  // arrancar el rAF. Si reanuda a tiempo, el loop lee datos reales; si no,
  // caemos a fallback (auto-recuperable dentro de tick()).
  if (ctx.state === 'suspended') {
    let resumed = false;
    try {
      await Promise.race([
        ctx.resume().then(() => {
          resumed = true;
        }),
        new Promise<void>((resolve) => {
          window.setTimeout(resolve, 1000);
        }),
      ]);
    } catch {
      resumed = false;
    }
    if (!resumed || ctx.state !== 'running') {
      usingFallback = true;
    }
  }

  // Guard de arranque obsoleto: durante el await pudo dispararse un nuevo
  // startVoiceAnalysis (otro elemento) o un stopVoiceAnalysis. Solo arrancamos
  // el loop si este sigue siendo el elemento activo.
  if (activeEl !== audio) return;

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
  freqData = null;
  smoothed = 0;
  smoothedBass = 0;
  smoothedMid = 0;
  smoothedTreble = 0;
  flatSinceTs = 0;
  usingFallback = false;
  frameCounter = 0;
  dispatchLevel(0);
  // Simetría con dispatchLevel(0): limpiar cualquier espectro obsoleto al parar.
  dispatchSpectrum(0, 0, 0);
}
