// components/shared/IniciacionGemelo.tsx
// ═══════════════════════════════════════════════════════════════════════
// ÓMICRON · GÉNESIS DEL GEMELO — entrada premium estilo "Holo-Gemelo".
// Look & feel: negro-azulado premium (tipo Apple), paleta sky/indigo/teal,
// glass con blur, orbe-avatar que HABLA con ondas, HUD en las esquinas.
// Secuencia (una vez por dispositivo):
//   1) BOOT     · el Núcleo se inicializa (Ω flotante + typing).
//   2) DESPIERTA · pide el CV para alimentar al Gemelo (glass + textarea).
//   3) REVELADO · el Núcleo 3D real (HoloNucleo3D) se materializa.
//   4) ORÁCULO  · el orbe TE HABLA (voz + subtítulo + ondas) con tu contexto.
// Reutiliza el store del Gemelo y el Núcleo 3D. Todo defensivo.
// ═══════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from 'react';
import { Upload, ArrowRight, FileCheck2 } from 'lucide-react';
import { HoloNucleo3D } from '../HoloNucleo3D';
import { ErrorBoundary } from './ErrorBoundary';
import {
  getProfile, subscribe, gemeloActions, bestNextStep, tierFor,
  type GemeloProfile,
} from '../../lib/gemeloProfile';
import { speak, stopSpeaking } from '../../lib/voiceEngine';

const KEY = 'omicron_iniciacion_v1';

// ── Paleta premium del Holo-Gemelo ───────────────────────────────────
const P = {
  sky: '#5cc8ff', indigo: '#5e5ce6', teal: '#3fd0c9', gold: '#ffb02e',
  ink: '#eaf0fb', mut: '#6b7590',
  glass: 'rgba(255,255,255,0.045)', glass2: 'rgba(255,255,255,0.08)',
  line: 'rgba(150,180,255,0.14)',
  font: '-apple-system,BlinkMacSystemFont,"SF Pro Display","Inter",system-ui,sans-serif',
  mono: 'ui-monospace,"SF Mono","JetBrains Mono",Menlo,monospace',
};

/** Debe mostrarse la iniciación (una sola vez por dispositivo). */
export function shouldShowIniciacion(): boolean {
  try { return !localStorage.getItem(KEY); } catch { return false; }
}

type Act = 'boot' | 'cv' | 'reveal' | 'oraculo';

// Inyecta los keyframes locales del Holo-Gemelo (una sola vez).
function useHoloKeyframes() {
  useEffect(() => {
    const id = 'holo-gemelo-kf';
    if (document.getElementById(id)) return;
    const s = document.createElement('style');
    s.id = id;
    s.textContent = `
      @keyframes hg-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
      @keyframes hg-grid{0%{background-position:0 0}100%{background-position:38px 76px}}
      @keyframes hg-scan{0%{transform:translateY(-180px)}100%{transform:translateY(140vh)}}
      @keyframes hg-wave{0%,100%{height:6px;opacity:.6}50%{height:19px;opacity:1}}
      @keyframes hg-blink{0%,100%{opacity:.7}50%{opacity:0}}
      @keyframes hg-in{0%{opacity:0;transform:translateY(10px)}100%{opacity:1;transform:translateY(0)}}
    `;
    document.head.appendChild(s);
  }, []);
}

export function IniciacionGemelo({ userName, onClose }: { userName?: string; onClose: () => void }) {
  useHoloKeyframes();
  const [act, setAct] = useState<Act>('boot');
  const [profile, setProfile] = useState<GemeloProfile>(() => getProfile());
  const [cvName, setCvName] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [bootText, setBootText] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const timers = useRef<number[]>([]);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => subscribe(() => setProfile(getProfile())), []);

  useEffect(() => {
    const bag = timers.current;
    return () => {
      bag.forEach((id) => { window.clearTimeout(id); window.clearInterval(id); });
      stopSpeaking();
    };
  }, []);

  // ACTO 1 · BOOT
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

  // ACTO 4 · ORÁCULO
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

    speak(
      speech,
      () => setSpeaking(true),
      () => setSpeaking(false)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [act]);

  function finish() {
    try { localStorage.setItem(KEY, '1'); } catch { /* noop */ }
    stopSpeaking();
    onClose();
  }

  const tier = tierFor(profile.pe);
  const showNucleo = act === 'reveal' || act === 'oraculo';

  return (
    <div style={S.overlay} role="dialog" aria-modal="true" aria-label="Iniciación del Gemelo Digital">
      {/* Capas de sistema: rejilla + escaneo + viñeta + HUD */}
      <div style={S.grid} />
      <div style={S.scan} />
      <div style={S.vig} />
      <div style={S.hud}>
        <b style={{ ...S.hb, top: 12, left: 12, borderRight: 'none', borderBottom: 'none' }} />
        <b style={{ ...S.hb, top: 12, right: 12, borderLeft: 'none', borderBottom: 'none' }} />
        <b style={{ ...S.hb, bottom: 12, left: 12, borderRight: 'none', borderTop: 'none' }} />
        <b style={{ ...S.hb, bottom: 12, right: 12, borderLeft: 'none', borderTop: 'none' }} />
      </div>

      <button style={S.skip} onClick={finish} aria-label="Saltar iniciación">Saltar ✕</button>

      {act === 'boot' && (
        <div style={S.center}>
          <div style={S.omega}><span style={S.omegaGlyph}>Ω</span></div>
          <div style={S.bootLine}>{bootText}<span style={S.caret}>▋</span></div>
        </div>
      )}

      {act === 'cv' && (
        <div style={{ ...S.center, animation: 'hg-in .5s ease both' }}>
          <div style={{ ...S.omega, width: 78, height: 78, borderRadius: 24 }}>
            <span style={{ ...S.omegaGlyph, fontSize: 40 }}>Ω</span>
          </div>
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
        <div style={{ ...S.center, animation: 'hg-in .6s ease both' }}>
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
            <Metric label="NODO" value={tier.name.replace('Nodo ', '')} color={P.sky} />
            <Metric label="REPUTACIÓN" value={String(profile.rep)} color={P.gold} />
            <Metric label="PE" value={profile.pe.toLocaleString()} color={P.teal} />
          </div>

          {act === 'oraculo' && (
            <div style={S.oracle}>
              <div style={S.oTop}>
                <div style={{ ...S.oOrb, ...(speaking ? S.oOrbSpeaking : null) }}>
                  {speaking && (
                    <div style={S.wave}>
                      {[0, 1, 2, 3, 4].map((i) => (
                        <span key={i} style={{ ...S.waveBar, animationDelay: `${i * 0.12}s` }} />
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <div style={S.oName}>EL ORÁCULO</div>
                  <p style={S.caption}>{caption}<span style={S.caret}>▋</span></p>
                </div>
              </div>
              <button style={S.enter} onClick={finish}>
                Entrar a Ómicron <ArrowRight size={18} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={S.metric}>
      <div style={{ fontFamily: P.font, fontWeight: 800, fontSize: 24, color, lineHeight: 1, letterSpacing: -0.5 }}>{value}</div>
      <div style={{ fontFamily: P.mono, fontSize: 9, letterSpacing: 1.2, color: P.mut, marginTop: 4, textTransform: 'uppercase' }}>{label}</div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 70, overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 22,
    fontFamily: P.font, color: P.ink,
    background: 'radial-gradient(130% 95% at 50% 28%, #050813 0%, #02030a 46%, #000003 100%)',
  },
  grid: {
    position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
    backgroundImage:
      'linear-gradient(rgba(92,140,255,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(92,140,255,.045) 1px,transparent 1px)',
    backgroundSize: '38px 38px',
    maskImage: 'radial-gradient(100% 80% at 50% 42%,#000 0%,transparent 78%)',
    WebkitMaskImage: 'radial-gradient(100% 80% at 50% 42%,#000 0%,transparent 78%)',
    animation: 'hg-grid 22s linear infinite',
  },
  scan: {
    position: 'absolute', left: 0, right: 0, top: 0, height: 180, zIndex: 0, pointerEvents: 'none', opacity: 0.6,
    background: 'linear-gradient(rgba(120,190,255,0) 0%,rgba(120,190,255,.05) 50%,rgba(120,190,255,0) 100%)',
    animation: 'hg-scan 7s linear infinite',
  },
  vig: { position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', boxShadow: 'inset 0 0 200px 40px rgba(0,1,4,.9)' },
  hud: { position: 'absolute', inset: 0, zIndex: 6, pointerEvents: 'none' },
  hb: { position: 'absolute', width: 20, height: 20, border: '1.5px solid rgba(120,180,255,.3)' },
  skip: {
    position: 'absolute', top: 16, right: 18, zIndex: 8, background: 'none', border: 'none',
    color: P.mut, fontFamily: P.mono, fontSize: 11, letterSpacing: 1, cursor: 'pointer',
  },
  center: {
    position: 'relative', zIndex: 2, width: '100%', maxWidth: 420,
    display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 4,
  },
  omega: {
    width: 100, height: 100, borderRadius: 30, marginBottom: 18,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: `linear-gradient(140deg, ${P.sky}, ${P.indigo})`,
    boxShadow: '0 22px 66px rgba(94,92,230,.55)',
    animation: 'hg-float 4s ease-in-out infinite',
  },
  omegaGlyph: { fontFamily: P.font, fontWeight: 700, fontSize: 52, color: '#fff' },
  bootLine: { fontFamily: P.mono, fontSize: 13, letterSpacing: 2, color: P.sky, textTransform: 'uppercase' },
  caret: { animation: 'hg-blink 1s steps(2) infinite' },
  tag: { fontFamily: P.mono, fontSize: 10, letterSpacing: 2.5, fontWeight: 700, color: P.sky },
  title: { fontFamily: P.font, fontWeight: 700, fontSize: 28, color: P.ink, margin: '6px 0 10px', letterSpacing: -0.3 },
  sub: { fontFamily: P.font, fontSize: 14.5, lineHeight: 1.6, color: P.mut, margin: '0 0 24px', maxWidth: 340 },
  cta: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9,
    padding: '15px 30px', width: '100%', maxWidth: 320, borderRadius: 17, cursor: 'pointer', border: 'none',
    background: `linear-gradient(135deg, ${P.sky}, ${P.indigo})`, color: '#fff',
    fontFamily: P.font, fontWeight: 600, fontSize: 16, boxShadow: '0 14px 38px rgba(10,132,255,.5)',
  },
  ghost: { marginTop: 14, background: 'none', border: 'none', cursor: 'pointer', color: P.mut, fontFamily: P.mono, fontSize: 12, letterSpacing: 0.5 },
  cvBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 10,
    padding: '6px 13px', borderRadius: 20, border: `1px solid ${P.line}`,
    background: P.glass, color: P.teal, fontFamily: P.mono, fontSize: 11,
    maxWidth: 280, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
  },
  nucleoWrap: { width: '100%', maxWidth: 340 },
  metrics: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 6 },
  metric: {
    textAlign: 'center', minWidth: 88, padding: '10px 8px', borderRadius: 16,
    border: `1px solid ${P.line}`, background: P.glass, backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
  },
  oracle: {
    marginTop: 18, width: '100%', borderRadius: 24, padding: '13px 14px 14px',
    background: 'linear-gradient(180deg,rgba(11,14,26,.9),rgba(3,5,12,.95))',
    border: `1px solid ${P.line}`, backdropFilter: 'blur(30px) saturate(150%)', WebkitBackdropFilter: 'blur(30px) saturate(150%)',
    boxShadow: '0 -10px 40px rgba(0,0,0,.6), inset 0 1px 0 rgba(140,180,255,.1)',
  },
  oTop: { display: 'flex', gap: 12, alignItems: 'center' },
  oOrb: {
    position: 'relative', flex: '0 0 auto', width: 44, height: 44, borderRadius: '50%',
    background: `radial-gradient(circle at 38% 32%,#eaf3ff,${P.sky} 55%,${P.indigo})`,
    boxShadow: '0 0 20px rgba(92,200,255,.55)',
  },
  oOrbSpeaking: { boxShadow: '0 0 30px rgba(92,200,255,.8)' },
  wave: { position: 'absolute', inset: -6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2.5 },
  waveBar: { width: 2.5, height: 8, borderRadius: 2, background: '#eaf3ff', animation: 'hg-wave .7s ease-in-out infinite' },
  oName: { fontFamily: P.mono, fontSize: 9.5, fontWeight: 600, letterSpacing: 1, color: P.sky, textTransform: 'uppercase' },
  caption: { fontFamily: P.font, fontSize: 13.5, lineHeight: 1.45, color: P.ink, margin: '2px 0 0', minHeight: 48 },
  enter: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 12,
    padding: '14px 28px', width: '100%', borderRadius: 15, cursor: 'pointer', border: 'none',
    background: `linear-gradient(135deg, #ffd27a, ${P.gold})`, color: '#05060f',
    fontFamily: P.font, fontWeight: 700, fontSize: 15,
    boxShadow: '0 12px 30px rgba(255,176,46,.35)',
  },
};
