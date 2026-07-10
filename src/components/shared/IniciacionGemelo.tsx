// components/shared/IniciacionGemelo.tsx
// ═══════════════════════════════════════════════════════════════════════
// ÓMICRON · GÉNESIS DEL GEMELO — primera interacción cinematográfica.
// Secuencia de 3 actos que se muestra UNA vez por dispositivo:
//   1) BOOT     · el Núcleo se inicializa.
//   2) CV       · se pide alimentar al Gemelo con el CV.
//   3) REVELADO · el Núcleo 3D se materializa al centro con tus métricas.
//   4) ORÁCULO  · el Oráculo TE HABLA (voz + subtítulo) con tu contexto real
//                 (Nodo, reputación, PE y tu siguiente mejor paso).
// Reutiliza el Núcleo 3D real (HoloNucleo3D) y el store del Gemelo. Todo es
// defensivo: si no hay voz o falla el canvas, la experiencia sigue.
// ═══════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from 'react';
import { Upload, ArrowRight, FileCheck2, Sparkles } from 'lucide-react';
import { C, FONT } from '../../theme';
import { HoloNucleo3D } from '../HoloNucleo3D';
import { ErrorBoundary } from './ErrorBoundary';
import {
  getProfile, subscribe, gemeloActions, bestNextStep, tierFor,
  type GemeloProfile,
} from '../../lib/gemeloProfile';

const KEY = 'omicron_iniciacion_v1';

/** Debe mostrarse la iniciación (una sola vez por dispositivo). */
export function shouldShowIniciacion(): boolean {
  try { return !localStorage.getItem(KEY); } catch { return false; }
}

type Act = 'boot' | 'cv' | 'reveal' | 'oraculo';

export function IniciacionGemelo({ userName, onClose }: { userName?: string; onClose: () => void }) {
  const [act, setAct] = useState<Act>('boot');
  const [profile, setProfile] = useState<GemeloProfile>(() => getProfile());
  const [cvName, setCvName] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [bootText, setBootText] = useState('');
  const timers = useRef<number[]>([]);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Mantener el perfil del Gemelo en vivo (por si cambia al convalidar el CV).
  useEffect(() => subscribe(() => setProfile(getProfile())), []);

  // Limpieza global de timers + voz al desmontar.
  useEffect(() => {
    const bag = timers.current;
    return () => {
      bag.forEach((id) => { window.clearTimeout(id); window.clearInterval(id); });
      try { window.speechSynthesis?.cancel(); } catch { /* noop */ }
    };
  }, []);

  // ACTO 1 · BOOT: teclea una línea y avanza a la carga del CV.
  useEffect(() => {
    const full = 'INICIALIZANDO NÚCLEO ÓMICRON';
    let i = 0;
    const type = window.setInterval(() => {
      i += 1; setBootText(full.slice(0, i));
      if (i >= full.length) window.clearInterval(type);
    }, 55);
    timers.current.push(type);
    const go = window.setTimeout(() => setAct('cv'), 2400);
    timers.current.push(go);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toReveal() {
    setAct('reveal');
    const t = window.setTimeout(() => setAct('oraculo'), 2600);
    timers.current.push(t);
  }

  function handleFile(f: File | null) {
    if (f) { setCvName(f.name); gemeloActions.addCV(); }
    toReveal();
  }

  // ACTO 4 · ORÁCULO: habla (voz) y teclea el subtítulo con tu contexto real.
  useEffect(() => {
    if (act !== 'oraculo') return;
    const p = getProfile();
    const tier = tierFor(p.pe);
    const ns = bestNextStep(p);
    const name = userName && userName.trim() ? userName.trim() : 'operador';
    const speech =
      `Bienvenido, ${name}. Soy el Oráculo de Ómicron. ` +
      `Tu Gemelo Digital ya está vivo: eres ${tier.name}, con reputación ${p.rep} y ${p.pe} puntos de experiencia. ` +
      (ns ? `Tu siguiente mejor paso es: ${ns.label}. ` : '') +
      `Estoy contigo en cada nodo del ecosistema.`;

    let idx = 0;
    const type = window.setInterval(() => {
      idx += 2; setCaption(speech.slice(0, idx));
      if (idx >= speech.length) { setCaption(speech); window.clearInterval(type); }
    }, 26);
    timers.current.push(type);

    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(speech);
        u.lang = 'es-ES'; u.rate = 1.02; u.pitch = 1.0;
        window.speechSynthesis.speak(u);
      }
    } catch { /* voz no disponible: queda el subtítulo */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [act]);

  function finish() {
    try { localStorage.setItem(KEY, '1'); } catch { /* noop */ }
    try { window.speechSynthesis?.cancel(); } catch { /* noop */ }
    onClose();
  }

  const tier = tierFor(profile.pe);
  const showNucleo = act === 'reveal' || act === 'oraculo';

  return (
    <div style={S.overlay} role="dialog" aria-modal="true" aria-label="Iniciación del Gemelo Digital">
      <div style={S.grid} />
      <div style={S.neb} />
      <button style={S.skip} onClick={finish} aria-label="Saltar iniciación">Saltar ✕</button>

      {act === 'boot' && (
        <div style={S.center}>
          <div style={S.omega}><span style={S.omegaGlyph}>Ω</span></div>
          <div style={S.bootLine}>{bootText}<span style={S.caret}>▋</span></div>
        </div>
      )}

      {act === 'cv' && (
        <div style={S.center}>
          <div style={{ ...S.omega, opacity: 0.55 }}><span style={S.omegaGlyph}>Ω</span></div>
          <div style={S.tag}>GÉNESIS · PASO 1</div>
          <h1 style={S.title}>Despierta a tu Gemelo</h1>
          <p style={S.sub}>
            Tu Gemelo Digital está latente. Aliméntalo con tu historia profesional
            y verás nacer tu Núcleo.
          </p>
          <input
            ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt,image/*"
            style={{ display: 'none' }}
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
          <button style={S.cta} onClick={() => fileRef.current?.click()}>
            <Upload size={18} /> Cargar mi CV
          </button>
          <button style={S.ghost} onClick={toReveal}>Omitir por ahora</button>
        </div>
      )}

      {showNucleo && (
        <div style={S.center}>
          {cvName && (
            <div style={S.cvBadge}><FileCheck2 size={14} /> {cvName}</div>
          )}
          <div style={S.nucleoWrap}>
            <ErrorBoundary section="NucleoIniciacion">
              <HoloNucleo3D
                variant="identity" orbState="idle" orbSize="lg" height={320}
                reputation={profile.rep} axes={profile.axes}
                ariaLabel="Tu Gemelo Digital"
              />
            </ErrorBoundary>
          </div>

          <div style={S.metrics}>
            <Metric label="NODO" value={tier.name.replace('Nodo ', '')} color={C.cyan} />
            <Metric label="REPUTACIÓN" value={String(profile.rep)} color={C.gold} />
            <Metric label="PE" value={profile.pe.toLocaleString()} color={C.green} />
          </div>

          {act === 'oraculo' && (
            <>
              <div style={S.oraculoRow}>
                <span style={S.oraculoDot}><Sparkles size={15} /></span>
                <span style={S.oraculoLabel}>EL ORÁCULO</span>
              </div>
              <p style={S.caption}>{caption}<span style={S.caret}>▋</span></p>
              <button style={S.enter} onClick={finish}>
                Entrar a Ómicron <ArrowRight size={18} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 74 }}>
      <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 22, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1.5, color: 'rgba(234,242,255,0.5)', marginTop: 4 }}>{label}</div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 70, overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    background: 'radial-gradient(circle at 50% 40%, #04122b, #01040d 70%)',
  },
  grid: {
    position: 'absolute', inset: 0, pointerEvents: 'none',
    backgroundImage:
      'linear-gradient(rgba(0,214,230,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,214,230,0.05) 1px, transparent 1px)',
    backgroundSize: '44px 44px',
    maskImage: 'radial-gradient(circle at 50% 45%, #000 30%, transparent 78%)',
    WebkitMaskImage: 'radial-gradient(circle at 50% 45%, #000 30%, transparent 78%)',
  },
  neb: {
    position: 'absolute', inset: 0, pointerEvents: 'none',
    background: 'radial-gradient(40% 40% at 50% 42%, rgba(0,214,230,0.14), transparent 70%)',
  },
  skip: {
    position: 'absolute', top: 16, right: 18, zIndex: 3, background: 'none', border: 'none',
    color: 'rgba(159,179,204,0.6)', fontFamily: FONT.mono, fontSize: 11, letterSpacing: 1, cursor: 'pointer',
  },
  center: {
    position: 'relative', zIndex: 2, width: '100%', maxWidth: 420,
    display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 4,
  },
  omega: {
    width: 92, height: 92, borderRadius: 24, marginBottom: 18,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg, rgba(125,249,255,0.18), rgba(0,214,230,0.06))',
    border: '1px solid rgba(0,214,230,0.4)',
    boxShadow: '0 0 42px rgba(0,214,230,0.4), inset 0 0 28px rgba(0,95,115,0.2)',
    animation: 'floatY 5s ease-in-out infinite',
  },
  omegaGlyph: {
    fontFamily: FONT.display, fontWeight: 700, fontSize: 50,
    background: 'linear-gradient(135deg, #7df9ff, #00D6E6)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
    filter: 'drop-shadow(0 0 10px rgba(0,214,230,0.6))',
  },
  bootLine: {
    fontFamily: FONT.mono, fontSize: 13, letterSpacing: 2, color: C.cyan, textTransform: 'uppercase',
  },
  caret: { opacity: 0.7, animation: 'floatY 1s steps(2) infinite' },
  tag: { fontFamily: FONT.mono, fontSize: 10, letterSpacing: 2.5, fontWeight: 700, color: C.cyan },
  title: {
    fontFamily: FONT.display, fontWeight: 700, fontSize: 30, color: '#eaf2ff',
    margin: '6px 0 10px', letterSpacing: 0.5,
  },
  sub: {
    fontFamily: FONT.body, fontSize: 15, lineHeight: 1.6, color: '#9fb3cc',
    margin: '0 0 24px', maxWidth: 360,
  },
  cta: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9,
    padding: '13px 26px', borderRadius: 12, cursor: 'pointer', border: 'none',
    background: 'linear-gradient(90deg, #7df9ff, #00D6E6)', color: '#020613',
    fontFamily: FONT.display, fontWeight: 700, fontSize: 16, letterSpacing: 0.4,
    boxShadow: '0 0 22px rgba(0,214,230,0.5)',
  },
  ghost: {
    marginTop: 12, background: 'none', border: 'none', cursor: 'pointer',
    color: 'rgba(159,179,204,0.7)', fontFamily: FONT.mono, fontSize: 11, letterSpacing: 1,
  },
  cvBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 8,
    padding: '5px 12px', borderRadius: 20, border: `1px solid ${C.greenDim}`,
    background: C.greenFaint, color: C.green, fontFamily: FONT.mono, fontSize: 11,
    maxWidth: 280, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
  },
  nucleoWrap: { width: '100%', maxWidth: 340, transition: 'opacity .6s ease, transform .6s ease' },
  metrics: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22, marginTop: 6,
  },
  oraculoRow: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 20 },
  oraculoDot: {
    width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,214,230,0.12)', border: `1px solid ${C.cyanDim}`, color: C.cyan,
    boxShadow: '0 0 16px rgba(0,214,230,0.4)', animation: 'floatY 3s ease-in-out infinite',
  },
  oraculoLabel: { fontFamily: FONT.mono, fontSize: 10, letterSpacing: 2.5, color: C.cyan, fontWeight: 700 },
  caption: {
    fontFamily: FONT.body, fontSize: 15, lineHeight: 1.6, color: '#eaf2ff',
    margin: '10px 0 22px', maxWidth: 380, minHeight: 72,
  },
  enter: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9,
    padding: '13px 28px', borderRadius: 12, cursor: 'pointer', border: 'none',
    background: 'linear-gradient(90deg, #E08A00, #f0a020)', color: '#020613',
    fontFamily: FONT.display, fontWeight: 700, fontSize: 16, letterSpacing: 0.4,
    boxShadow: '0 0 22px rgba(224,138,0,0.45)',
  },
};
