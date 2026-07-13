// components/perfil/HoloGemeloHome.tsx
// ═══════════════════════════════════════════════════════════════════════
// INICIO NATIVO "Holo-Gemelo" — EXPERIENCIA 3D COMPLETA con HoloNucleo3D.
// Galaxia interactiva (canvas 3D, rotación, parallax, nodos tocables con
// fichas), Oráculo con voz, panel inferior con recomendaciones y accesos
// al ecosistema. Datos REALES del Gemelo: reputación, ejes, PE, tier.
// ═══════════════════════════════════════════════════════════════════════
import { useState } from 'react';
import { Brain, Briefcase, Lock, Scale, UserCircle, Target, Volume2, Send, Store, Boxes, Wallet, MessageCircle } from 'lucide-react';
import { useGemeloProfile } from '../../hooks/useGemeloProfile';
import { useApp } from '../../store/AppContext';
import { useRealtime } from '../../store/RealtimeContext';
import { HoloNucleo3D } from '../HoloNucleo3D';
import type { NucleoChip } from '../HoloNucleo3D';
import { speak } from '../../lib/voiceEngine';
import { C, FONT } from '../../theme';
import type { TabId } from '../../types';

export function HoloGemeloHome({ onOpenPerfil }: { onOpenPerfil: () => void }) {
  const { profile, tier, next, actions } = useGemeloProfile();
  const { setActiveTab, profile: sb } = useApp();
  const { onlineCount } = useRealtime();
  const [speaking, setSpeaking] = useState(false);
  const [q, setQ] = useState('');

  const rep = profile.rep;
  const pe = profile.pe;
  const ax = profile.axes;
  const level = rep >= 80 ? 3 : rep >= 50 ? 2 : 1;
  const tokens = (sb?.token_balance ?? 0);
  const nodos = onlineCount > 0 ? onlineCount : 1;
  const contratos = profile.cv ? 12 : 0; // placeholder; luego desde el perfil real

  function speakOracle(text: string) {
    speak(text, () => setSpeaking(true), () => setSpeaking(false));
  }

  function askOracle() {
    const base = `Para tu estado actual —${tier.name.replace('Nodo ', '')}, reputación ${rep}— `;
    const rec = next ? `te conviene: ${next.label}. Sube tu match y tu reputación.` : 'te conviene consolidar tus 4 ejes y tomar un contrato.';
    speakOracle(base + rec);
    setQ('');
  }

  // Chips para el Núcleo 3D (métricas flotantes del Gemelo).
  const chips: NucleoChip[] = [
    { label: 'Nodo', value: `N${level} · ${tier.name.replace('Nodo ', '')}`, color: C.purple, x: 0.18, y: 0.22 },
    { label: 'PE', value: String(pe), color: C.gold, x: 0.82, y: 0.22 },
    { label: 'Tokens', value: tokens.toLocaleString(), color: C.cyan, x: 0.18, y: 0.78 },
    { label: 'Contratos', value: String(contratos), color: C.green, x: 0.82, y: 0.78 },
  ];

  return (
    <div style={S.wrap}>
      {/* ── Barra superior ── */}
      <div style={S.top}>
        <div style={S.omega}><span style={S.omegaGlyph}>Ω</span></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={S.brand}>Ómicron</div>
          <div style={S.brandSub}>
            <span style={S.liveDot} />
            {nodos.toLocaleString()} nodos activos · N{level} · REP {rep}
          </div>
        </div>
        <IconBtn onClick={onOpenPerfil} label="Perfil"><UserCircle size={17} /></IconBtn>
        <IconBtn onClick={() => setActiveTab('empleos')} label="Red / oportunidades" color={C.gold}><Target size={17} /></IconBtn>
        <IconBtn
          onClick={() => speakOracle(`Hola. Eres ${tier.name.replace('Nodo ', '')}, reputación ${rep}, ${pe} PE.` + (next ? ` Tu mejor paso: ${next.label}.` : ''))}
          label="Hablar con el Oráculo"
          active={speaking}
        >
          <Volume2 size={17} />
        </IconBtn>
      </div>

      {/* ── GALAXIA 3D INTERACTIVA (HoloNucleo3D) ── */}
      <div style={S.galaxyWrap}>
        <HoloNucleo3D
          reputation={rep}
          axes={ax}
          chips={chips}
          livePeers={Math.max(0, nodos - 1)}
          onNavigate={(tab) => setActiveTab(tab as TabId)}
          height={420}
        />
      </div>

      {/* ── Hoja inferior: recomendaciones + accesos + Oráculo ── */}
      <div style={S.sheet}>
        <div style={S.card}>
          <div style={S.cardTag}><span style={S.tagDot} />MEJORA CONTINUA</div>
          <div style={S.cardRow}>
            <span style={S.cardText}>
              {next ? `${next.label} subiría tu match ~${Math.max(3, Math.round(next.dRep))}%` : 'Consolida tus 4 ejes y toma un contrato'}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={S.btnGold} onClick={() => next && actions.addTitle('Placeholder', 'Universidad', 2023)}>
                {next ? 'Ejecutar' : 'Academia'}
              </button>
              <button style={S.btnGhost} onClick={() => { /* luego */ }}>Luego</button>
            </div>
          </div>
        </div>

        <div style={S.card}>
          <div style={{ ...S.cardTag, color: C.green }}>
            <span style={{ ...S.tagDot, background: C.green, boxShadow: `0 0 8px ${C.green}` }} />
            RED EN VIVO · {nodos.toLocaleString()} NODOS
          </div>
          <div style={S.cardText}>El ecosistema se mueve en tiempo real.</div>
        </div>

        <p style={S.desc}>
          Tu Gemelo Digital crece con cada contrato, curso y aporte. La galaxia refleja tu reputación en tiempo real.
        </p>

        <div style={S.dock}>
          <DockBtn active Icon={Brain} label="Entrena" color={C.gold} onClick={() => setActiveTab('academia')} />
          <DockBtn Icon={Briefcase} label="Ejecuta" color={C.cyan} onClick={() => setActiveTab('empleos')} />
          <DockBtn Icon={Lock} label="Capitaliza" color={C.purple} onClick={() => setActiveTab('vault')} />
          <DockBtn Icon={Scale} label="Gobierna" color={C.green} onClick={() => setActiveTab('gobernanza')} />
        </div>

        {/* Accesos secundarios: todo el ecosistema alcanzable */}
        <div style={S.chips}>
          <Chip Icon={Store} label="Servicios" onClick={() => setActiveTab('market')} />
          <Chip Icon={Boxes} label="Habilidades" onClick={() => setActiveTab('maxskill')} />
          <Chip Icon={Wallet} label="Billetera" onClick={() => setActiveTab('wallet')} />
          <Chip Icon={MessageCircle} label="Mensajes" onClick={() => setActiveTab('chat')} />
        </div>

        <div style={S.inputBar}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') askOracle(); }}
            placeholder="¿Qué me conviene decidir?"
            style={S.input}
          />
          <button
            onClick={askOracle}
            aria-label="Preguntar al Oráculo"
            style={{ ...S.sendBtn, ...(speaking ? { boxShadow: '0 0 22px rgba(92,200,255,0.8)' } : null) }}
          >
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
  wrap: { flex: 1, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 14px 0', background: C.bg },
  top: { display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 },
  omega: { width: 40, height: 40, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(140deg,#5cc8ff,#5e5ce6)', boxShadow: '0 8px 20px rgba(94,92,230,0.5)', flexShrink: 0 },
  omegaGlyph: { fontFamily: FONT.display, fontWeight: 700, fontSize: 21, color: '#fff' },
  brand: { fontFamily: FONT.display, fontWeight: 700, fontSize: 17, color: C.ink, letterSpacing: -0.2 },
  brandSub: { display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT.mono, fontSize: 10, color: C.mut, marginTop: 1 },
  liveDot: { width: 6, height: 6, borderRadius: '50%', background: C.green, boxShadow: `0 0 6px ${C.green}`, animation: 'cp-pulse 1.5s ease-in-out infinite' },
  galaxyWrap: { position: 'relative', width: '100%', flexShrink: 0, minHeight: 360 },
  sheet: { display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 },
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
