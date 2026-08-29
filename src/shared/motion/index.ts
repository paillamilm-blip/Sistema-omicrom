// ═══════════════════════════════════════════════════════════════════════
// shared/motion — Ómicrom Motion System
//
// Taste (Anti-Slop): Cada animación tiene PROPÓSITO. No decora — comunica.
// Animate: Spring physics reales, no duraciones inventadas.
// Impeccable: Exit = reversa del enter. Nunca corta.
//
// Reglas:
// 1. Enter siempre más lento que exit (percepción humana)
// 2. Springs sobre duraciones (se sienten naturales)
// 3. Stagger = 40-60ms máximo (más se siente lag)
// 4. Reduced-motion: fade sutil, nunca nada
// 5. Cada componente acepta motion=false para opt-out
// ═══════════════════════════════════════════════════════════════════════

export { FadeIn } from './FadeIn';
export { SlideUp } from './SlideUp';
export { ScaleIn } from './ScaleIn';
export { StaggerChildren } from './StaggerChildren';
export { StaggerList, StaggerItem } from './StaggerList';
export { RevealOnScroll } from './RevealOnScroll';
export { AnimatedCounter } from './AnimatedCounter';
export { MagneticButton } from './MagneticButton';
export { CelebrationBurst } from './CelebrationBurst';
export { GlowCard } from './GlowCard';
export { PulseRing } from './PulseRing';
export { TextReveal } from './TextReveal';
export { SmoothNumber } from './SmoothNumber';
export { useReducedMotion } from './useReducedMotion';
