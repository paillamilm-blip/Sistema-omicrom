// components/perfil/HoloGemeloHome.tsx
// ═══════════════════════════════════════════════════════════════════════
// INICIO NATIVO "Holo-Gemelo" — port en React del prototipo, con DATOS REALES.
// Reutiliza el orbe real (HoloNucleo3D), tu Gemelo real (useGemeloProfile) y
// la navegación real del ecosistema. El Oráculo te habla y el sistema te
// posiciona. Estética premium tomada del tema (theme.ts).
// ═══════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from 'react';
import { Radar, GraduationCap, Wallet, Store, Vault, Briefcase, Boxes, ArrowRight, UserCircle } from 'lucide-react';
import { HoloNucleo3D } from '../HoloNucleo3D';
import { ErrorBoundary } from '../shared/ErrorBoundary';
import { useGemeloProfile } from '../../hooks/useGemeloProfile';
import { useApp } from '../../store/AppContext';
import { C, FONT, RADIUS } from '../../theme';
import type { TabId } from '../../types';

const HUBS: { tab: TabId; label: string; Icon: typeof Radar; color: string }[] = [
  { tab: 'empleos',   label: 'Empleos',     Icon: Briefcase,     color: C.gold },
  { tab: 'academia',  label: 'Academia',    Icon: GraduationCap, color: C.cyan },
  { tab: 'maxskill',  label: 'Habilidades', Icon: Boxes,         color: C.purple },
  { tab: 'market',    label: 'Servicios',   Icon: Store,         color: C.green },
  { tab: 'vault',     label: 'Bóveda',      Icon: Vault,         color: C.cyan },
  { tab: 'wallet',    label: 'Billetera',   Icon: Wallet,        color: C.gold },
];

export function HoloGemeloHome({ onOpenPerfil }: { onOpenPerfil: () => void }) {
  const { profile, tier, next, streak } = useGemeloProfile();
  const { setActiveTab, profile: sb } = useApp();
  const [caption, setCaption] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const spoke = useRef(false);

  // Keyframe de la onda del Oráculo (idempotente).
  useEffect(() => {
    const id = 'holo-gemelo-kf';
    if (document.getElementById(id)) return;
    const s = document.createElement('style');
    s.id = id;
    s.textContent = '@keyframes hg-wave{0%,100%{height:6px;opacity:.6}50%{height:19px;opacity:1}}';
    document.head.appendChild(s);
  }, []);

  const name = sb?.full_name || sb?.username || 'operador';
  const tierName = tier.name.replace('Nodo ', '');

  // El Oráculo saluda una vez (voz + subtítulo tecleado).
  useEffect(() => {
    if (spoke.current) return;
    spoke.current = true;
    const speech =
      `Hola ${name}. Eres ${tierName}, con reputación ${profile.rep} y ${profile.pe.toLocaleString()} puntos de experiencia. ` +
      (next ? `El sistema te posiciona: tu mejor próximo paso es ${next.label}.` : 'El sistema está conectando tu ecosistema.');
    let i = 0;
    const id = window.setInterval(() => {
      i += 2; setCaption(speech.slice(0, i));
      if (i >= speech.length) { setCaption(speech); window.clearInterval(id); }
    }, 24);
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(speech);
        u.lang = 'es-ES'; u.rate = 1.02;
        u.onstart = () => setSpeaking(true);
        u.onend = () => setSpeaking(false);
        window.speechSynthesis.speak(u);
      }
    } catch { /* voz no disponible */ }
    return () => { window.clearInterval(id); try { window.speechSynthesis?.cancel(); } catch { /* noop */ } };
  }, [name, tierName, profile.rep, profile.pe, next]);

  return (
    <div style={S.wrap}>
      {/* Identidad */}
      <div style={S.idRow}>
        <div style={S.omega}><span style={S.omegaGlyph}>Ω</span></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={S.hello}>Tu Gemelo Digital</div>
          <div style={S.sys}>El sistema te posiciona · Nodo {tierName}{streak > 0 ? ` · racha ${streak}d` : ''}</div>
        </div>
        <button style={S.perfilBtn} onClick={onOpenPerfil} aria-label="Perfil completo">
          <UserCircle size={15} /> Perfil
        </button>
      </div>

      {/* Orbe vivo (real) */}
      <div style={S.stage}>
        <ErrorBoundary section="NucleoHome">
          <HoloNucleo3D
            variant="identity" orbState="idle" orbSize="lg" height={300}
            reputation={profile.rep} axes={profile.axes}
            ariaLabel="Tu Gemelo Digital vivo"
          />
        </ErrorBoundary>
      </div>

      {/* Métricas reales */}
      <div style={S.metrics}>
        <Metric label="REPUTACIÓN" value={String(profile.rep)} color={C.gold} />
        <Metric label="PE" value={profile.pe.toLocaleString()} color={C.cyan} />
        <Metric label="NODO" value={tierName} color={C.purple} />
      </div>

      {/* Oráculo */}
      <div style={S.oracle}>
        <div style={{ ...S.oOrb, ...(speaking ? { boxShadow: '0 0 28px rgba(92,200,255,0.85)' } : null) }}>
          {speaking && (
            <div style={S.wave}>
              {[0, 1, 2, 3, 4].map((i) => <span key={i} style={{ ...S.waveBar, animationDelay: `${i * 0.12}s` }} />)}
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={S.oName}>EL ORÁCULO</div>
          <p style={S.caption}>{caption}</p>
        </div>
      </div>

      {/* El trabajo te busca */}
      <button style={S.opCta} onClick={() => setActiveTab('empleos')}>
        <Radar size={18} />
        <span style={{ flex: 1, textAlign: 'left' }}>
          <b style={{ display: 'block', fontSize: 15 }}>El trabajo te busca</b>
          <span style={{ fontSize: 11.5, opacity: 0.85, fontFamily: FONT.mono }}>Tus oportunidades con mayor tasa de éxito</span>
        </span>
        <ArrowRight size={18} />
      </button>

      {/* Ecosistema */}
      <div style={S.sectionLabel}>Tu ecosistema</div>
      <div style={S.grid}>
        {HUBS.map(({ tab, label, Icon, color }) => (
          <button key={tab} style={S.tile} onClick={() => setActiveTab(tab)}>
            <span style={{ ...S.tileIcon, color, borderColor: `${color}44`, background: `${color}14` }}><Icon size={20} /></span>
            <span style={S.tileLabel}>{label}</span>
          </button>
        ))}
      </div>

      {next && (
        <button style={S.nextStep} onClick={onOpenPerfil}>
          <span style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: 1, color: C.cyan, textTransform: 'uppercase' }}>▲ Siguiente paso</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{next.label}</span>
          <span style={{ fontFamily: FONT.mono, fontSize: 11, color: C.green }}>+{Math.max(0, Math.round(next.dRep))} rep · +{Math.max(0, Math.round(next.dPe))} PE</span>
        </button>
      )}

      <div style={{ height: 24 }} />
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={S.metric}>
      <div style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: 22, color, lineHeight: 1, letterSpacing: -0.4 }}>{value}</div>
      <div style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1.2, color: C.mut, marginTop: 4, textTransform: 'uppercase' }}>{label}</div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  wrap: { flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '14px 16px 0', display: 'flex', flexDirection: 'column', gap: 14 },
  idRow: { display: 'flex', alignItems: 'center', gap: 12 },
  omega: { width: 46, height: 46, borderRadius: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(140deg, #5cc8ff, #5e5ce6)', boxShadow: '0 8px 22px rgba(94,92,230,0.5)', flexShrink: 0 },
  omegaGlyph: { fontFamily: FONT.display, fontWeight: 700, fontSize: 24, color: '#fff' },
  hello: { fontFamily: FONT.display, fontWeight: 700, fontSize: 18, color: C.ink, letterSpacing: -0.2 },
  sys: { fontFamily: FONT.mono, fontSize: 10.5, color: C.cyan, marginTop: 2, letterSpacing: 0.3 },
  perfilBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: RADIUS.lg, cursor: 'pointer', background: C.glass, border: `1px solid ${C.line}`, color: C.ink, fontFamily: FONT.mono, fontSize: 11.5, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' },
  stage: { width: '100%', borderRadius: RADIUS.xl, overflow: 'hidden', border: `1px solid ${C.line}`, background: 'rgba(255,255,255,0.02)' },
  metrics: { display: 'flex', gap: 10 },
  metric: { flex: 1, textAlign: 'center', padding: '11px 6px', borderRadius: RADIUS.lg, border: `1px solid ${C.line}`, background: C.glass, backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' },
  oracle: { display: 'flex', gap: 12, alignItems: 'center', padding: 13, borderRadius: RADIUS.xl, background: 'linear-gradient(180deg,rgba(11,14,26,0.9),rgba(3,5,12,0.95))', border: `1px solid ${C.line}`, backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' },
  oOrb: { position: 'relative', flex: '0 0 auto', width: 42, height: 42, borderRadius: '50%', background: 'radial-gradient(circle at 38% 32%,#eaf3ff,#5cc8ff 55%,#5e5ce6)', boxShadow: '0 0 18px rgba(92,200,255,0.5)' },
  wave: { position: 'absolute', inset: -6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2.5 },
  waveBar: { width: 2.5, height: 8, borderRadius: 2, background: '#eaf3ff', animation: 'hg-wave .7s ease-in-out infinite' },
  oName: { fontFamily: FONT.mono, fontSize: 9.5, fontWeight: 600, letterSpacing: 1, color: C.cyan, textTransform: 'uppercase' },
  caption: { fontFamily: FONT.display, fontSize: 13.5, lineHeight: 1.45, color: C.ink, margin: '2px 0 0', minHeight: 40 },
  opCta: { display: 'flex', alignItems: 'center', gap: 12, padding: '15px 16px', borderRadius: RADIUS.xl, cursor: 'pointer', border: 'none', color: '#04121f', background: 'linear-gradient(135deg,#ffd27a,#ffb02e)', fontFamily: FONT.display, boxShadow: '0 12px 30px rgba(255,176,46,0.32)' },
  sectionLabel: { fontFamily: FONT.mono, fontSize: 10, letterSpacing: 1.5, color: C.mut, textTransform: 'uppercase', marginTop: 2 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 },
  tile: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '15px 6px', borderRadius: RADIUS.lg, cursor: 'pointer', background: C.glass, border: `1px solid ${C.line}`, color: C.ink, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' },
  tileIcon: { width: 42, height: 42, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid' },
  tileLabel: { fontFamily: FONT.mono, fontSize: 10.5, color: C.ink, letterSpacing: 0.3 },
  nextStep: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3, padding: '13px 15px', borderRadius: RADIUS.xl, cursor: 'pointer', background: C.cyanGhost, border: `1px solid ${C.cyanDim}`, textAlign: 'left' },
};
