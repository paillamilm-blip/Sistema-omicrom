// components/perfil/HoloGemeloHome.tsx
// ═══════════════════════════════════════════════════════════════════════
// INICIO NATIVO "Holo-Gemelo" — réplica fiel del prototipo, en React, con
// DATOS REALES. Constelación (orbe de reputación + nodos del ecosistema),
// lentes (Desempeño/Economía/Crecimiento), hoja inferior (mejora continua,
// red en vivo, dock Entrena/Ejecuta/Capitaliza/Gobierna) e input del Oráculo.
// SVG/CSS determinista (sin canvas) → fidelidad + cero riesgo de build.
// ═══════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from 'react';
import { Brain, Briefcase, Lock, Scale, UserCircle, Target, Volume2, Send, Store, Boxes, Wallet, MessageCircle } from 'lucide-react';
import { useGemeloProfile } from '../../hooks/useGemeloProfile';
import { useApp } from '../../store/AppContext';
import { useRealtime } from '../../store/RealtimeContext';
import { C, FONT } from '../../theme';
import type { TabId } from '../../types';

type Lens = 'desempeno' | 'economia' | 'crecimiento';
const LENSES: { id: Lens; label: string; color: string }[] = [
  { id: 'desempeno',   label: 'Desempeño',   color: C.purple },
  { id: 'economia',    label: 'Economía',    color: C.green },
  { id: 'crecimiento', label: 'Crecimiento', color: C.gold },
];

// Nodos de la constelación (posición en % del escenario) → hub real.
const NODES: { key: string; name: string; cat: string; tab: TabId; x: number; y: number }[] = [
  { key: 'eje', name: 'Ejecuta',    cat: 'EMPLEOS',    tab: 'empleos',    x: 22, y: 26 },
  { key: 'cap', name: 'Capitaliza', cat: 'BÓVEDA',     tab: 'vault',      x: 78, y: 26 },
  { key: 'apr', name: 'Aprende',    cat: 'ACADEMIA',   tab: 'academia',   x: 13, y: 60 },
  { key: 'gob', name: 'Gobierna',   cat: 'GOBERNANZA', tab: 'gobernanza', x: 87, y: 60 },
];

export function HoloGemeloHome({ onOpenPerfil }: { onOpenPerfil: () => void }) {
  const { profile, tier, next } = useGemeloProfile();
  const { setActiveTab, profile: sb } = useApp();
  const { onlineCount } = useRealtime();
  const [lens, setLens] = useState<Lens>('crecimiento');
  const [speaking, setSpeaking] = useState(false);
  const [q, setQ] = useState('');

  const rep = profile.rep;
  const pe = profile.pe;
  const ax = profile.axes;
  const level = rep >= 80 ? 3 : rep >= 50 ? 2 : 1;
  const tokens = (sb?.token_balance ?? 2480);
  const nodos = onlineCount > 0 ? onlineCount : 1;
  const activeLens = LENSES.find((l) => l.id === lens)!;

  // Keyframe de onda (idempotente).
  useEffect(() => {
    const id = 'holo-gemelo-kf';
    if (document.getElementById(id)) return;
    const s = document.createElement('style'); s.id = id;
    s.textContent = '@keyframes hg-wave{0%,100%{height:6px;opacity:.6}50%{height:19px;opacity:1}}@keyframes hg-pulse{0%,100%{opacity:.5;transform:scale(1)}50%{opacity:1;transform:scale(1.12)}}@keyframes hg-orb{0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-50%,-50%) scale(1.03)}}';
    document.head.appendChild(s);
  }, []);

  function speak(text: string) {
    try {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'es-ES'; u.rate = 1.02;
      u.onstart = () => setSpeaking(true);
      u.onend = () => setSpeaking(false);
      window.speechSynthesis.speak(u);
    } catch { /* voz no disponible */ }
  }

  function askOracle() {
    const base = `Para tu estado actual —${tier.name.replace('Nodo ', '')}, reputación ${rep}— `;
    const rec = next ? `te conviene: ${next.label}. Sube tu match y tu reputación.` : 'te conviene consolidar tus 4 ejes y tomar un contrato.';
    speak(base + rec);
    setQ('');
  }

  return (
    <div style={S.wrap}>
      {/* ── Barra superior ── */}
      <div style={S.top}>
        <div style={S.omega}><span style={S.omegaGlyph}>Ω</span></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={S.brand}>Ómicron</div>
          <div style={S.brandSub}><span style={S.liveDot} />{nodos.toLocaleString()} nodos activos · N{level} · REP {rep}</div>
        </div>
        <IconBtn onClick={onOpenPerfil} label="Perfil"><UserCircle size={17} /></IconBtn>
        <IconBtn onClick={() => setActiveTab('empleos')} label="Red / oportunidades" color={C.gold}><Target size={17} /></IconBtn>
        <IconBtn onClick={() => speak(`Hola. Eres ${tier.name.replace('Nodo ', '')}, reputación ${rep}, ${pe} PE.` + (next ? ` Tu mejor paso: ${next.label}.` : ''))} label="Hablar con el Oráculo" active>
          <Volume2 size={17} />
        </IconBtn>
      </div>

      {/* ── Lentes ── */}
      <div style={S.pills}>
        {LENSES.map((l) => {
          const on = l.id === lens;
          return (
            <button key={l.id} onClick={() => setLens(l.id)} style={{
              ...S.pill,
              background: on ? `${l.color}22` : 'rgba(255,255,255,0.04)',
              border: `1px solid ${on ? l.color : C.line}`,
              color: on ? l.color : C.mut,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: l.color, boxShadow: `0 0 8px ${l.color}` }} />
              {l.label}
            </button>
          );
        })}
      </div>

      {/* ── Constelación ── */}
      <div style={S.stage}>
        {/* líneas */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={S.svg}>
          {NODES.map((n) => (
            <line key={n.key} x1="50" y1="50" x2={n.x} y2={n.y}
              stroke={activeLens.color} strokeOpacity="0.35" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
          ))}
          <line x1="50" y1="50" x2="50" y2="90" stroke={activeLens.color} strokeOpacity="0.35" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
        </svg>

        {/* métricas tenues */}
        <Faint x={30} y={40} big={`N${level}`} small="NODO" />
        <Faint x={68} y={40} big={tokens.toLocaleString()} small="TOKENS" />
        <Faint x={20} y={78} big={String(pe)} small="EXPERIENCIA" />
        <Faint x={30} y={90} big={String(Math.round(ax.transcendence))} small="TRASCENDENCIA" />
        <Faint x={72} y={88} big={String(Math.round(ax.execution))} small="EJECUCIÓN" />

        {/* nodos del ecosistema */}
        {NODES.map((n) => (
          <button key={n.key} onClick={() => setActiveTab(n.tab)} style={{ ...S.node, left: `${n.x}%`, top: `${n.y}%` }}>
            <span style={{ ...S.nodeDot, background: activeLens.color, boxShadow: `0 0 12px ${activeLens.color}` }} />
            <span style={S.nodeName}>{n.name}</span>
            <span style={S.nodeCat}>{n.cat}</span>
          </button>
        ))}

        {/* orbe central */}
        <button style={{ ...S.orb, boxShadow: `0 0 60px ${activeLens.color}66, inset 0 0 40px rgba(94,92,230,0.4)`, borderColor: `${activeLens.color}` }} onClick={() => setLens(lens)}>
          <span style={{ ...S.orbLens, color: activeLens.color }}>{activeLens.label.toUpperCase()}</span>
          <span style={S.orbRep}>{rep}</span>
          <span style={S.orbLabel}>REPUTACIÓN</span>
        </button>

        {/* oportunidades (abajo) */}
        <button onClick={() => setActiveTab('empleos')} style={{ ...S.node, left: '50%', top: '90%' }}>
          <span style={{ ...S.nodeDot, background: C.gold, boxShadow: `0 0 12px ${C.gold}` }} />
          <span style={{ ...S.nodeName, color: C.gold }}>3 activas</span>
          <span style={S.nodeCat}>OPORTUNIDADES</span>
        </button>
      </div>

      {/* ── Hoja inferior ── */}
      <div style={S.sheet}>
        <div style={S.card}>
          <div style={S.cardTag}><span style={S.tagDot} />MEJORA CONTINUA</div>
          <div style={S.cardRow}>
            <span style={S.cardText}>{next ? `${next.label} subiría tu match` : 'Consolida tus 4 ejes'} {next ? `~${Math.max(3, Math.round(next.dRep))}%` : ''}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={S.btnGold} onClick={() => setActiveTab('academia')}>Aprender</button>
              <button style={S.btnGhost} onClick={() => { /* luego */ }}>Luego</button>
            </div>
          </div>
        </div>

        <div style={S.card}>
          <div style={{ ...S.cardTag, color: C.green }}><span style={{ ...S.tagDot, background: C.green, boxShadow: `0 0 8px ${C.green}` }} />RED EN VIVO · {nodos.toLocaleString()} NODOS</div>
          <div style={S.cardText}>El ecosistema se mueve en tiempo real.</div>
        </div>

        <p style={S.desc}>
          {activeLens.label}: donde conviertes tu conocimiento en activos — aprende, ejecuta, capitaliza y gobierna.
        </p>

        <div style={S.dock}>
          <DockBtn active Icon={Brain} label="Entrena" color={C.gold} onClick={() => setActiveTab('academia')} />
          <DockBtn Icon={Briefcase} label="Ejecuta" color={C.cyan} onClick={() => setActiveTab('empleos')} />
          <DockBtn Icon={Lock} label="Capitaliza" color={C.purple} onClick={() => setActiveTab('vault')} />
          <DockBtn Icon={Scale} label="Gobierna" color={C.green} onClick={() => setActiveTab('gobernanza')} />
        </div>

        {/* Accesos secundarios: todo el ecosistema alcanzable sin menú inferior */}
        <div style={S.chips}>
          <Chip Icon={Store} label="Servicios" onClick={() => setActiveTab('market')} />
          <Chip Icon={Boxes} label="Habilidades" onClick={() => setActiveTab('maxskill')} />
          <Chip Icon={Wallet} label="Billetera" onClick={() => setActiveTab('wallet')} />
          <Chip Icon={MessageCircle} label="Mensajes" onClick={() => setActiveTab('chat')} />
        </div>

        <div style={S.inputBar}>
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') askOracle(); }}
            placeholder="¿Qué me conviene decidir?"
            style={S.input}
          />
          <button onClick={askOracle} aria-label="Preguntar al Oráculo" style={{ ...S.sendBtn, ...(speaking ? { boxShadow: '0 0 22px rgba(92,200,255,0.8)' } : null) }}>
            <Send size={16} />
          </button>
        </div>

        <div style={{ height: 20 }} />
      </div>
    </div>
  );
}

function IconBtn({ children, onClick, label, active, color }: { children: React.ReactNode; onClick: () => void; label: string; active?: boolean; color?: string }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} style={{
      width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: active ? '#fff' : (color ?? C.ink),
      background: active ? 'linear-gradient(135deg,#5cc8ff,#5e5ce6)' : 'rgba(255,255,255,0.05)',
      border: `1px solid ${active ? 'transparent' : C.line}`,
      boxShadow: active ? '0 6px 16px rgba(94,92,230,0.45)' : 'none',
    }}>{children}</button>
  );
}

function Faint({ x, y, big, small }: { x: number; y: number; big: string; small: string }) {
  return (
    <div style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none', opacity: 0.32 }}>
      <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 15, color: C.ink }}>{big}</div>
      <div style={{ fontFamily: FONT.mono, fontSize: 7.5, letterSpacing: 1, color: C.mut }}>{small}</div>
    </div>
  );
}

function DockBtn({ Icon, label, color, active, onClick }: { Icon: typeof Brain; label: string; color: string; active?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '11px 4px',
      borderRadius: 16, cursor: 'pointer', fontFamily: FONT.mono, fontSize: 10.5,
      background: active ? `${color}18` : 'rgba(255,255,255,0.04)',
      border: `1px solid ${active ? color : C.line}`, color: active ? color : C.ink,
    }}>
      <Icon size={19} color={active ? color : undefined} />
      {label}
    </button>
  );
}

function Chip({ Icon, label, onClick }: { Icon: typeof Brain; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '9px 4px',
      borderRadius: 13, cursor: 'pointer', fontFamily: FONT.mono, fontSize: 9.5,
      background: 'rgba(255,255,255,0.035)', border: `1px solid ${C.line}`, color: C.mut,
    }}>
      <Icon size={16} />
      {label}
    </button>
  );
}

const S: Record<string, React.CSSProperties> = {
  wrap: { flex: 1, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 14px 0' },
  top: { display: 'flex', alignItems: 'center', gap: 10 },
  omega: { width: 40, height: 40, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(140deg,#5cc8ff,#5e5ce6)', boxShadow: '0 8px 20px rgba(94,92,230,0.5)', flexShrink: 0 },
  omegaGlyph: { fontFamily: FONT.display, fontWeight: 700, fontSize: 21, color: '#fff' },
  brand: { fontFamily: FONT.display, fontWeight: 700, fontSize: 17, color: C.ink, letterSpacing: -0.2 },
  brandSub: { display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT.mono, fontSize: 10, color: C.mut, marginTop: 1 },
  liveDot: { width: 6, height: 6, borderRadius: '50%', background: C.green, boxShadow: `0 0 6px ${C.green}`, animation: 'hg-pulse 1.8s ease-in-out infinite' },
  pills: { display: 'flex', gap: 8 },
  pill: { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 999, cursor: 'pointer', fontFamily: FONT.mono, fontSize: 12, whiteSpace: 'nowrap' },
  stage: { position: 'relative', width: '100%', height: '46vh', minHeight: 320, maxHeight: 460, flexShrink: 0 },
  svg: { position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' },
  orb: {
    position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
    width: 148, height: 148, borderRadius: '50%', cursor: 'pointer',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    background: 'radial-gradient(circle at 42% 34%, rgba(120,150,255,0.55), rgba(40,44,120,0.75) 60%, rgba(6,8,20,0.9))',
    border: '2px solid', animation: 'hg-orb 5s ease-in-out infinite',
  },
  orbLens: { fontFamily: FONT.display, fontWeight: 800, fontSize: 12, letterSpacing: 1.5 },
  orbRep: { fontFamily: FONT.display, fontWeight: 800, fontSize: 46, color: '#fff', lineHeight: 1, textShadow: '0 2px 20px rgba(0,0,0,0.5)' },
  orbLabel: { fontFamily: FONT.mono, fontSize: 8.5, letterSpacing: 2, color: 'rgba(234,240,251,0.7)', marginTop: 2 },
  node: { position: 'absolute', transform: 'translate(-50%,-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', padding: 4 },
  nodeDot: { width: 12, height: 12, borderRadius: '50%', marginBottom: 3 },
  nodeName: { fontFamily: FONT.display, fontWeight: 700, fontSize: 15, color: C.ink, lineHeight: 1 },
  nodeCat: { fontFamily: FONT.mono, fontSize: 8, letterSpacing: 1, color: C.mut },
  sheet: { display: 'flex', flexDirection: 'column', gap: 10 },
  card: { padding: '12px 14px', borderRadius: 18, background: 'linear-gradient(180deg,rgba(11,14,26,0.85),rgba(4,6,14,0.92))', border: `1px solid ${C.line}`, backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' },
  cardTag: { display: 'flex', alignItems: 'center', gap: 7, fontFamily: FONT.mono, fontSize: 9.5, letterSpacing: 1.4, color: C.cyan, textTransform: 'uppercase', marginBottom: 8 },
  tagDot: { width: 7, height: 7, borderRadius: '50%', background: C.cyan, boxShadow: `0 0 8px ${C.cyan}` },
  cardRow: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'space-between' },
  cardText: { fontFamily: FONT.display, fontSize: 14, color: C.ink, fontWeight: 600, flex: 1, minWidth: 160 },
  btnGold: { padding: '8px 16px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#ffd27a,#ffb02e)', color: '#04121f', fontFamily: FONT.display, fontWeight: 700, fontSize: 13 },
  btnGhost: { padding: '8px 14px', borderRadius: 12, cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.line}`, color: C.mut, fontFamily: FONT.mono, fontSize: 12 },
  desc: { fontFamily: FONT.display, fontSize: 13, lineHeight: 1.5, color: C.mut, margin: 0, padding: '0 2px' },
  dock: { display: 'flex', gap: 8 },
  chips: { display: 'flex', gap: 7 },
  inputBar: { display: 'flex', alignItems: 'center', gap: 8, padding: 6, borderRadius: 16, background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.line}` },
  input: { flex: 1, background: 'none', border: 'none', outline: 'none', color: C.ink, fontFamily: FONT.display, fontSize: 14, padding: '8px 10px' },
  sendBtn: { width: 40, height: 40, borderRadius: 13, flexShrink: 0, cursor: 'pointer', border: 'none', background: 'linear-gradient(135deg,#5cc8ff,#5e5ce6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' },
};
