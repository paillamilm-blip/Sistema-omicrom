// components/omicron/ParticleOrbLazy.tsx
// ═══════════════════════════════════════════════════════════════════════
// LAZY WRAPPER para ParticleOrb.
//
// ParticleOrb importa Three.js (~400-600KB). Este wrapper lo carga bajo
// demanda con React.lazy(), mostrando un fallback SVG liviano mientras tanto.
//
// TODOS los archivos que importen ParticleOrb deberían usar este wrapper
// en lugar del import directo, excepto donde se necesite renderizado
// inmediato sin Suspense boundary (ej: dentro de otro Suspense).
// ═══════════════════════════════════════════════════════════════════════
import { lazy, Suspense } from 'react';
import { ParticleOrbFallback } from './ParticleOrbFallback';
import type { ParticleOrbProps } from './ParticleOrb';

const ParticleOrbInner = lazy(() => import('./ParticleOrb'));

export default function ParticleOrbLazy(props: ParticleOrbProps) {
  return (
    <Suspense fallback={<ParticleOrbFallback />}>
      <ParticleOrbInner {...props} />
    </Suspense>
  );
}

// Re-export types for convenience
export type { ParticleOrbProps, HelixSkill } from './ParticleOrb';
