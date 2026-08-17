// components/shared/Onboarding.tsx
// Onboarding de primer ingreso (se muestra una sola vez por dispositivo).
// Presenta el concepto del Gemelo Digital, los hubs y cómo empezar.
import { useEffect, useState } from 'react';
import { Fingerprint, Radar, Compass, Rocket } from 'lucide-react';

const KEY = 'omicron_onboarded_v1';

export function shouldShowOnboarding(): boolean {
  try { return !localStorage.getItem(KEY); } catch { return false; }
}

interface Step { icon: React.ReactNode; tag: string; title: string; body: string; accent: string; }

const STEPS: Step[] = [
  {
    icon: <Fingerprint size={34} />,
    tag: 'BIENVENIDO A LA RED',
    title: 'Sistema Ómicron',
    body: 'Un marketplace de capital intelectual de la Industria 5.0. Aquí tu conocimiento es un activo: lo aprendes, lo validas y lo monetizas. Confianza cero, mérito verificable.',
    accent: '#5cc8ff',
  },
  {
    icon: <Radar size={34} />,
    tag: 'TU IDENTIDAD',
    title: 'El Gemelo Digital',
    body: 'Tu reputación verificable, calculada con 4 ejes: Ejecución, Calidad, Trascendencia y Fundamento. No es una opinión: se construye con cada nodo validado, contrato y aporte real.',
    accent: '#3fd0c9',
  },
  {
    icon: <Compass size={34} />,
    tag: 'CÓMO NAVEGAR',
    title: '5 hubs, una misión',
    body: 'APRENDER (árbol + academia), MERCADO (servicios + bóveda), EMPLEOS, GOBERNANZA (disputas + staking) y tu PERFIL. Usa las sub-pestañas superiores para moverte dentro de cada hub.',
    accent: '#5cc8ff',
  },
  {
    icon: <Rocket size={34} />,
    tag: 'EMPIEZA AHORA',
    title: 'Valida tu primer nodo',
    body: 'Ve a APRENDER → Árbol de Habilidades, elige un nodo disponible y supera el Simulador para ganar PE y subir tu Fundamento. Cada reto fortalece tu Gemelo Digital.',
    accent: '#ffb02e',
  },
];

export function Onboarding({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  const finish = () => {
    try { localStorage.setItem(KEY, '1'); } catch { /* ignore */ }
    onClose();
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') finish(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={S.overlay} role="dialog" aria-modal="true" aria-label="Bienvenida a Sistema Ómicron">
      <div style={{ ...S.card, borderColor: `${step.accent}55`, boxShadow: `0 0 40px ${step.accent}33, inset 0 1px 1px rgba(255,255,255,0.05)` }}>
        <button style={S.skip} onClick={finish} aria-label="Saltar introducción">Saltar</button>

        <div style={{ ...S.iconRing, borderColor: `${step.accent}88`, color: step.accent, boxShadow: `0 0 24px ${step.accent}55` }}>
          {step.icon}
        </div>

        <div style={{ ...S.tag, color: step.accent }}>{step.tag}</div>
        <div style={S.title}>{step.title}</div>
        <p style={S.body}>{step.body}</p>

        <div style={S.dots}>
          {STEPS.map((_, k) => (
            <span key={k} style={{ ...S.dot, width: k === i ? 22 : 7, background: k === i ? step.accent : 'rgba(255,255,255,0.2)' }} />
          ))}
        </div>

        <div style={S.btnRow}>
          {i > 0 && <button style={S.btnGhost} onClick={() => setI(i - 1)}>Atrás</button>}
          <button
            style={{ ...S.btnPrimary, background: `linear-gradient(90deg, ${step.accent}, ${step.accent}aa)`, boxShadow: `0 0 18px ${step.accent}55` }}
            onClick={() => (last ? finish() : setI(i + 1))}
          >
            {last ? '🚀 Comenzar' : 'Siguiente'}
          </button>
        </div>
      </div>
    </div>
  );
}

const MONO = "'SF Mono', monospace";
const RAJ = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif";

const S: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 60,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 22,
    background: 'rgba(2,6,19,0.78)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
  },
  card: {
    position: 'relative', width: '100%', maxWidth: 360, textAlign: 'center',
    padding: '34px 24px 24px', borderRadius: 18, border: '1px solid',
    background: 'linear-gradient(160deg, rgba(8,16,38,0.92), rgba(2,6,19,0.96))',
  },
  skip: {
    position: 'absolute', top: 12, right: 14, background: 'none', border: 'none',
    color: 'rgba(159,179,204,0.6)', fontFamily: MONO, fontSize: 11, cursor: 'pointer', letterSpacing: 1,
  },
  iconRing: {
    width: 78, height: 78, borderRadius: '50%', margin: '0 auto 18px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '1px solid', background: 'rgba(92, 200, 255,0.04)', animation: 'floatY 5s ease-in-out infinite',
  },
  tag: { fontFamily: MONO, fontSize: 10, letterSpacing: 2.5, fontWeight: 700 },
  title: { fontFamily: RAJ, fontWeight: 700, fontSize: 26, color: '#eaf0fb', margin: '6px 0 12px', letterSpacing: 0.5 },
  body: { fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14, lineHeight: 1.6, color: '#9fb3cc', margin: '0 0 22px' },
  dots: { display: 'flex', justifyContent: 'center', gap: 7, marginBottom: 22 },
  dot: { height: 7, borderRadius: 4, transition: 'all .25s ease' },
  btnRow: { display: 'flex', gap: 10 },
  btnGhost: {
    flex: '0 0 auto', padding: '12px 20px', borderRadius: 10, cursor: 'pointer',
    background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#9fb3cc',
    fontFamily: RAJ, fontWeight: 700, fontSize: 14,
  },
  btnPrimary: {
    flex: 1, padding: '12px 0', borderRadius: 10, cursor: 'pointer', border: 'none',
    color: '#000206', fontFamily: RAJ, fontWeight: 700, fontSize: 15, letterSpacing: 0.5,
  },
};
