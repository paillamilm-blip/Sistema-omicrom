// src/components/perfil/PasaporteGemelo.tsx
// Pasaporte del Gemelo: tarjeta verificable renderizada en canvas que el
// usuario puede DESCARGAR como PNG para compartir. Refleja el perfil real
// (Nodo/Tier, reputación, PE y los 4 ejes).
import { useRef, useState, useEffect, useCallback } from 'react';
import { Download, X, CreditCard } from 'lucide-react';
import { useGemeloProfile } from '../../hooks/useGemeloProfile';
import type { GemeloProfile, GemeloAxes } from '../../lib/gemeloProfile';
import { C, FONT, RADIUS } from '../../theme';

function drawPassport(cv: HTMLCanvasElement, p: GemeloProfile, tierName: string) {
  const x = cv.getContext('2d');
  if (!x) return;
  const W = cv.width, H = cv.height;
  const g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#04122a'); g.addColorStop(0.5, '#02081a'); g.addColorStop(1, '#06122e');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.strokeStyle = 'rgba(0,214,230,0.45)'; x.lineWidth = 3; x.strokeRect(16, 16, W - 32, H - 32);
  x.textAlign = 'center';
  x.fillStyle = '#7df9ff'; x.font = 'bold 96px Georgia, serif'; x.fillText('\u03A9', W / 2, 135);
  x.fillStyle = '#eaf4ff'; x.font = "bold 34px 'Rajdhani', sans-serif"; x.fillText('Sistema Ómicron', W / 2, 182);
  x.fillStyle = 'rgba(0,214,230,0.75)'; x.font = "15px 'Share Tech Mono', monospace"; x.fillText('PASAPORTE · GEMELO DIGITAL', W / 2, 210);
  x.fillStyle = '#E08A00'; x.font = "bold 26px 'Share Tech Mono', monospace"; x.fillText(tierName.toUpperCase(), W / 2, 268);
  x.fillStyle = 'rgba(234,244,255,0.55)'; x.font = "14px 'Share Tech Mono', monospace";
  x.fillText('REPUTACIÓN', W / 2 - 130, 330); x.fillText('PUNTAJE PE', W / 2 + 130, 330);
  x.fillStyle = '#E08A00'; x.font = "bold 74px 'Rajdhani', sans-serif"; x.fillText(String(p.rep), W / 2 - 130, 400);
  x.fillStyle = '#7df9ff'; x.font = "bold 54px 'Rajdhani', sans-serif"; x.fillText(p.pe.toLocaleString('es'), W / 2 + 130, 398);
  const EJ: [string, keyof GemeloAxes, string][] = [
    ['Ejecución', 'execution', '#00D6E6'],
    ['Calidad', 'quality', '#0977a3'],
    ['Trascendencia', 'transcendence', '#E08A00'],
    ['Fundamento', 'foundation', '#2FE014'],
  ];
  let yy = 470;
  x.textAlign = 'left';
  EJ.forEach(([lbl, k, col]) => {
    const v = Math.min(100, p.axes[k] || 0);
    x.fillStyle = 'rgba(234,244,255,0.8)'; x.font = "15px 'Share Tech Mono', monospace"; x.fillText(lbl, 50, yy - 8);
    x.textAlign = 'right'; x.fillStyle = 'rgba(255,255,255,0.4)'; x.font = "13px 'Share Tech Mono', monospace"; x.fillText(v + '/100', W - 50, yy - 8);
    x.textAlign = 'left';
    x.fillStyle = 'rgba(255,255,255,0.1)'; x.fillRect(50, yy, W - 100, 11);
    x.fillStyle = col; x.fillRect(50, yy, ((W - 100) * v) / 100, 11);
    yy += 54;
  });
  x.textAlign = 'center'; x.fillStyle = 'rgba(0,214,230,0.55)'; x.font = "12px 'Share Tech Mono', monospace";
  x.fillText('Verificable en Ómicron · Confianza Cero', W / 2, H - 40);
}

export function PasaporteGemelo() {
  const { profile, tier } = useGemeloProfile();
  const [open, setOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const render = useCallback(() => {
    if (canvasRef.current) drawPassport(canvasRef.current, profile, tier.name);
  }, [profile, tier.name]);

  useEffect(() => { if (open) render(); }, [open, render]);

  const download = () => {
    const c = canvasRef.current;
    if (!c) return;
    const a = document.createElement('a');
    a.href = c.toDataURL('image/png');
    a.download = 'mi-gemelo-omicron.png';
    document.body.appendChild(a); a.click(); a.remove();
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '11px 0', marginBottom: 14, borderRadius: RADIUS.lg, cursor: 'pointer',
          background: 'rgba(0,214,230,0.08)', border: `1px solid ${C.cyanDim}`, color: C.cyan,
          fontFamily: FONT.display, fontWeight: 700, fontSize: 14,
        }}
      >
        <CreditCard size={16} /> Ver mi Pasaporte
      </button>

      {open && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center',
            justifyContent: 'center', padding: 16, background: 'rgba(1,4,13,0.85)', backdropFilter: 'blur(7px)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, maxHeight: '94vh' }}>
            <canvas
              ref={canvasRef}
              width={600}
              height={860}
              style={{ width: 'min(300px, 78vw)', height: 'auto', borderRadius: 18, border: `1px solid ${C.cyanDim}`, boxShadow: '0 30px 80px rgba(0,0,0,0.7)' }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={download}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px', borderRadius: RADIUS.lg,
                  cursor: 'pointer', background: C.gold, border: 'none', color: '#020613',
                  fontFamily: FONT.mono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700,
                }}
              >
                <Download size={15} /> Descargar PNG
              </button>
              <button
                onClick={() => setOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px', borderRadius: RADIUS.lg,
                  cursor: 'pointer', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
                  color: '#eaf2ff', fontFamily: FONT.mono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase',
                }}
              >
                <X size={15} /> Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
