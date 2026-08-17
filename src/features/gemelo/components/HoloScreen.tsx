// components/shared/HoloGemeloScreen.tsx
// Experiencia inmersiva Holo-Gemelo montada DENTRO de la app real.
// Reutiliza el prototipo probado (/prototipos/holo-gemelo.html) a pantalla
// completa. Como app y prototipo comparten origen, comparten localStorage:
// el prototipo hidrata tu Gemelo REAL (clave 'omicron_gemelo') → unificado.
import { useEffect } from 'react';
import { X } from 'lucide-react';

export function HoloGemeloScreen({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 120, background: '#000206' }}>
      <iframe
        src="/prototipos/holo-gemelo.html"
        title="Holo-Gemelo"
        allow="microphone; autoplay"
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
      />
      <button
        onClick={onClose}
        aria-label="Cerrar Holo-Gemelo"
        style={{
          position: 'absolute', top: 'max(env(safe-area-inset-top), 10px)', right: 10, zIndex: 2,
          width: 38, height: 38, borderRadius: 13, cursor: 'pointer',
          background: 'rgba(9,12,22,0.72)', border: '1px solid rgba(150,180,255,0.22)',
          color: '#eaf0fb', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <X size={18} />
      </button>
    </div>
  );
}
