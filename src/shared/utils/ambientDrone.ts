// shared/utils/ambientDrone.ts
// ═══════════════════════════════════════════════════════════════════════
// JARVIS PRESENCE · Ambient Sound Layer
//
// Almost imperceptible background drone that changes with emotion:
//   cold     → silence
//   cooling  → silence
//   engaged  → 55Hz hum at volume 0.015 (threshold of perception)
//   proud    → 65Hz hum + soft harmonic at 0.02
//   onFire   → 75Hz ascending drone with 2nd harmonic at 0.025
//
// The drone is SUB-PERCEPTUAL — you feel it more than hear it.
// On speakers it's nearly silent. On headphones it adds depth.
// Respects mute preference from spatialAudio.
// ═══════════════════════════════════════════════════════════════════════
import type { EmotionState } from '@/shared/components/EmotionAwareUI';
import { omicronAudio } from '@/shared/utils/spatialAudio';

const CONFIGS: Record<EmotionState, { freq: number; volume: number; harmonic: number } | null> = {
  cold: null,
  cooling: null,
  engaged: { freq: 55, volume: 0.015, harmonic: 0 },
  proud: { freq: 65, volume: 0.02, harmonic: 0.008 },
  onFire: { freq: 75, volume: 0.025, harmonic: 0.012 },
};

class AmbientDrone {
  private ctx: AudioContext | null = null;
  private osc: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  private gain2: GainNode | null = null;
  private active = false;
  private currentEmotion: EmotionState = 'engaged';

  private init(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      this.ctx = new AudioContext();
      return this.ctx;
    } catch { return null; }
  }

  setEmotion(emotion: EmotionState): void {
    if (emotion === this.currentEmotion) return;
    this.currentEmotion = emotion;

    if (omicronAudio.isMuted) { this.stop(); return; }

    const config = CONFIGS[emotion];
    if (!config) { this.stop(); return; }

    const ctx = this.init();
    if (!ctx) return;

    if (!this.active) {
      this.start(ctx, config);
    } else {
      this.morph(ctx, config);
    }
  }

  private start(ctx: AudioContext, config: { freq: number; volume: number; harmonic: number }): void {
    // Primary oscillator
    this.osc = ctx.createOscillator();
    this.gain = ctx.createGain();
    this.osc.type = 'sine';
    this.osc.frequency.setValueAtTime(config.freq, ctx.currentTime);
    this.gain.gain.setValueAtTime(0, ctx.currentTime);
    this.gain.gain.linearRampToValueAtTime(config.volume, ctx.currentTime + 2); // 2s fade in
    this.osc.connect(this.gain).connect(ctx.destination);
    this.osc.start();

    // Second harmonic (if present)
    if (config.harmonic > 0) {
      this.osc2 = ctx.createOscillator();
      this.gain2 = ctx.createGain();
      this.osc2.type = 'sine';
      this.osc2.frequency.setValueAtTime(config.freq * 1.5, ctx.currentTime);
      this.gain2.gain.setValueAtTime(0, ctx.currentTime);
      this.gain2.gain.linearRampToValueAtTime(config.harmonic, ctx.currentTime + 2);
      this.osc2.connect(this.gain2).connect(ctx.destination);
      this.osc2.start();
    }

    this.active = true;
  }

  private morph(ctx: AudioContext, config: { freq: number; volume: number; harmonic: number }): void {
    if (this.osc && this.gain) {
      this.osc.frequency.linearRampToValueAtTime(config.freq, ctx.currentTime + 2.5);
      this.gain.gain.linearRampToValueAtTime(config.volume, ctx.currentTime + 2.5);
    }
    if (this.osc2 && this.gain2) {
      this.osc2.frequency.linearRampToValueAtTime(config.freq * 1.5, ctx.currentTime + 2.5);
      this.gain2.gain.linearRampToValueAtTime(config.harmonic, ctx.currentTime + 2.5);
    } else if (config.harmonic > 0 && !this.osc2) {
      // Start 2nd harmonic if newly needed
      this.osc2 = ctx.createOscillator();
      this.gain2 = ctx.createGain();
      this.osc2.type = 'sine';
      this.osc2.frequency.setValueAtTime(config.freq * 1.5, ctx.currentTime);
      this.gain2.gain.setValueAtTime(0, ctx.currentTime);
      this.gain2.gain.linearRampToValueAtTime(config.harmonic, ctx.currentTime + 2.5);
      this.osc2.connect(this.gain2).connect(ctx.destination);
      this.osc2.start();
    }
  }

  private stop(): void {
    if (!this.active) return;
    const ctx = this.ctx;
    if (ctx && this.gain) {
      this.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
    }
    if (ctx && this.gain2) {
      this.gain2.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
    }
    // Cleanup after fade
    setTimeout(() => {
      this.osc?.stop(); this.osc = null; this.gain = null;
      this.osc2?.stop(); this.osc2 = null; this.gain2 = null;
    }, 1600);
    this.active = false;
  }

  destroy(): void {
    this.stop();
    this.ctx?.close();
    this.ctx = null;
  }
}

export const ambientDrone = new AmbientDrone();
