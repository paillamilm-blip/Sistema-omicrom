// components/omicron/ParticleOrbFallback.tsx
// ═══════════════════════════════════════════════════════════════════════
// Fallback SVG liviano que se muestra mientras ParticleOrb (Three.js ~400KB)
// se carga. Simula el orbe con un gradiente radial animado puro CSS.
// Tamaño: < 1KB. Cero dependencias. Cero JS extra.
// ═══════════════════════════════════════════════════════════════════════

export function ParticleOrbFallback() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <div
        style={{
          width: '60%',
          maxWidth: 200,
          aspectRatio: '1',
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 35%, rgba(92,200,255,0.3), rgba(94,92,230,0.15) 50%, rgba(0,0,0,0.8) 100%)',
          boxShadow: '0 0 60px rgba(92,200,255,0.15), inset 0 0 40px rgba(94,92,230,0.1)',
          animation: 'orbPulse 3s ease-in-out infinite',
        }}
      />
      <style>{`
        @keyframes orbPulse {
          0%, 100% { transform: scale(1); opacity: 0.85; }
          50% { transform: scale(1.04); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
