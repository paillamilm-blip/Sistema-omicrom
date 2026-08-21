// shared/utils/spatialAudio.ts
// ═══════════════════════════════════════════════════════════════════════
// JARVIS PRESENCE · Spatial Audio System
//
// Micro sound cues synthesized with Web Audio API (no audio files needed).
// Each sound is 10-80ms — subliminal, not musical. Enhances tactility.
//
// Sounds:
//   tick    → node tap, button press (5ms click, metallic)
//   ping    → message received, notification (crystalline, 60ms)
//   hum     → AI is thinking/processing (low drone, 200ms fade)
//   thud    → error, rejection (low freq, 30ms)
//   ascend  → level up, achievement (3-note chord rising, 400ms)
//   confirm → action registered, saved (soft "pop", 15ms)
//   sweep   → tab change, navigation (whoosh, 80ms)
//
// Rules:
//   - User can mute (persisted in localStorage)
//   - Volume is LOW (0.08-0.15) — feel, don't hear
//   - Respects prefers-reduced-motion (mutes automatically)
//   - AudioContext created on first user gesture (browser policy)
// ═══════════════════════════════════════════════════════════════════════

const STORAGE_KEY = 'omicron_audio_muted';

class OmicronAudio {
  private ctx: AudioContext | null = null;
  private muted: boolean;
  private initialized = false;

  constructor() {
    this.muted = typeof localStorage !== 'undefined'
      ? localStorage.getItem(STORAGE_KEY) === 'true'
      : false;

    // Auto-mute if reduced motion
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.muted = true;
    }
  }

  private init(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      this.ctx = new AudioContext();
      this.initialized = true;
      return this.ctx;
    } catch {
      return null;
    }
  }

  /** Expose the AudioContext for reuse by other audio systems (e.g. ambientDrone) */
  getContext(): AudioContext | null {
    return this.init();
  }
  unlock(): void {
    const ctx = this.init();
    if (ctx?.state === 'suspended') ctx.resume();
  }

  get isMuted(): boolean { return this.muted; }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(muted));
    }
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  // ═══════════════════════════════════════════════════════════════
  // SOUND PRIMITIVES
  // ═══════════════════════════════════════════════════════════════

  /** Metallic click — button/node tap */
  tick(): void {
    if (this.muted) return;
    const ctx = this.init();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain).connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(4200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(2800, ctx.currentTime + 0.005);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.015);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.015);
  }

  /** Crystalline ping — notification/message */
  ping(): void {
    if (this.muted) return;
    const ctx = this.init();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain).connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + 0.04);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
  }

  /** Low hum — AI thinking */
  hum(): void {
    if (this.muted) return;
    const ctx = this.init();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain).connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(90, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
  }

  /** Low thud — error/rejection */
  thud(): void {
    if (this.muted) return;
    const ctx = this.init();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain).connect(ctx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.04);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.06);
  }

  /** Rising 3-note chord — achievement/level up */
  ascend(): void {
    if (this.muted) return;
    const ctx = this.init();
    if (!ctx) return;
    const notes = [523, 659, 784]; // C5, E5, G5 (major triad)
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain).connect(ctx.destination);
      osc.type = 'sine';
      const start = ctx.currentTime + i * 0.1;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.1, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
      osc.start(start);
      osc.stop(start + 0.25);
    });
  }

  /** Soft pop — action confirmed */
  confirm(): void {
    if (this.muted) return;
    const ctx = this.init();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain).connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.01);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.025);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.04);
  }

  /** Whoosh sweep — navigation/tab change */
  sweep(): void {
    if (this.muted) return;
    const ctx = this.init();
    if (!ctx) return;
    // White noise burst shaped as a quick whoosh
    const bufferSize = ctx.sampleRate * 0.06;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize); // fading noise
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3000, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.06);
    filter.Q.setValueAtTime(2, ctx.currentTime);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start(ctx.currentTime);
  }
}

// ── Singleton ─────────────────────────────────────────────────────────
export const omicronAudio = new OmicronAudio();

// ── Convenience exports ───────────────────────────────────────────────
export const audioTick = () => omicronAudio.tick();
export const audioPing = () => omicronAudio.ping();
export const audioHum = () => omicronAudio.hum();
export const audioThud = () => omicronAudio.thud();
export const audioAscend = () => omicronAudio.ascend();
export const audioConfirm = () => omicronAudio.confirm();
export const audioSweep = () => omicronAudio.sweep();
