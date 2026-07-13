// components/perfil/HoloGemeloHome.tsx
// ═══════════════════════════════════════════════════════════════════════
// INICIO NATIVO "Holo-Gemelo" — EXPERIENCIA 3D COMPLETA con HoloNucleo3D.
// Galaxia interactiva (canvas 3D, rotación, parallax, nodos tocables con
// fichas), Oráculo con voz, panel inferior con recomendaciones y accesos
// al ecosistema. Datos REALES del Gemelo: reputación, ejes, PE, tier.
// INTEGRADO CON: CVOnboarding, OpportunitiesSheet, ProfileCard, ProactivePushes.
// ═══════════════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react';
import { Brain, Briefcase, Lock, Scale, UserCircle, Target, Volume2, Send, Store, Boxes, Wallet, MessageCircle } from 'lucide-react';
import { useGemeloProfile } from '../../hooks/useGemeloProfile';
import { useApp } from '../../store/AppContext';
import { useRealtime } from '../../store/RealtimeContext';
import { HoloNucleo3D } from '../HoloNucleo3D';
import type { NucleoChip, OrbEmotion } from '../HoloNucleo3D';
import { speak } from '../../lib/voiceEngine';
import { evaluateProactiveEvents, getDaysSinceLastLogin } from '../../lib/proactiveEngine';
import type { ProactiveEvent } from '../../lib/proactiveEngine';
import { GemeloProactive } from '../GemeloProactive';
import { CVOnboarding } from './CVOnboarding';
import { OpportunitiesSheet } from './OpportunitiesSheet';
import { ProfileCard } from './ProfileCard';
import { ProactivePushes, usePushQueue } from './ProactivePushes';
import { analyzeCV, type AnalyzedProfile } from '../../lib/cvAnalyzer';
import { getTopJobs } from '../../lib/jobMatcher';
import { C, FONT } from '../../theme';
import type { TabId } from '../../types';

export function HoloGemeloHome({ onOpenPerfil }: { onOpenPerfil: () => void }) {
  const { profile, tier, next, actions } = useGemeloProfile();
  const { setActiveTab, profile: sb } = useApp();
  const { onlineCount } = useRealtime();
  const [speaking, setSpeaking] = useState(false);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'desempeno' | 'economia' | 'crecimiento'>('crecimiento');
  
  // ⭐ SISTEMA PROACTIVO: estado emocional + evento proactivo + audio reactivo
  const [emotion, setEmotion] = useState<OrbEmotion>('idle');
  const [audioLevel] = useState(0);
  const [proactiveEvent, setProactiveEvent] = useState<ProactiveEvent | null>(null);
  const [lastOnlineCount, setLastOnlineCount] = useState(onlineCount);

  // ⭐ NUEVAS CARACTERÍSTICAS INTEGRADAS DEL PROTOTIPO
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [analyzedProfile, setAnalyzedProfile] = useState<AnalyzedProfile | null>(null);
  const [showOpportunities, setShowOpportunities] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const { pushes, addPush, dismissPush } = usePushQueue();

  const rep = profile.rep;
  const pe = profile.pe;
  const ax = profile.axes;
  const level = rep >= 80 ? 3 : rep >= 50 ? 2 : 1;
  const tokens = (sb?.token_balance ?? 0);
  const nodos = onlineCount > 0 ? onlineCount : 1;
  const contratos = profile.cv ? 12 : 0;

  // Cargar perfil analizado desde localStorage si existe
  useEffect(() => {
    try {
      const stored = localStorage.getItem('omicron_analyzed_profile');
      if (stored) {
        setAnalyzedProfile(JSON.parse(stored));
      } else {
        // Si no hay perfil, mostrar onboarding
        setShowOnboarding(true);
      }
    } catch (e) {
      console.error('Error loading profile:', e);
    }
  }, []);

  // ⭐ SISTEMA DE PUSHES PROACTIVOS AUTOMÁTICOS
  useEffect(() => {
    if (!analyzedProfile) return;

    // Push inicial: empresa te busca (después de 6s)
    const timer1 = setTimeout(() => {
      const topJob = getTopJobs(analyzedProfile, rep, 1)[0];
      if (topJob) {
        addPush({
          type: 'offer',
          tag: analyzedProfile.arch === 'estudiante' ? 'UNA OPORTUNIDAD TE BUSCA' : 'UNA EMPRESA TE BUSCA',
          title: topJob.job.title,
          subtitle: `${topJob.success}% de afinidad · ${topJob.job.pay} · ${topJob.job.type}`,
          actions: [
            { label: 'Ver', onClick: () => setShowOpportunities(true), primary: true },
            { label: 'Después', onClick: () => {} },
          ],
          duration: 12000,
        });
      }
    }, 6500);

    // Push periódico: actividad de la red (cada 8.5s)
    const timer2 = setInterval(() => {
      const activities = [
        'Un Nodo Core capitalizó su conocimiento',
        'Una empresa publicó 3 contratos nuevos',
        'Un aprendiz validó su primer reto',
        'Un Nodo Arquitecto abrió una mentoría',
        'Nueva credencial verificada en la red',
        'Un contrato se cerró con Escrow',
        'Un nodo evolucionó a Pioneer',
        '2 nodos se conectaron para un proyecto',
      ];
      const randomActivity = activities[Math.floor(Math.random() * activities.length)];
      
      addPush({
        type: 'activity',
        tag: `RED EN VIVO · ${nodos.toLocaleString()} NODOS`,
        title: randomActivity,
        duration: 5200,
      });
    }, 8500);

    // Push periódico: mejora continua (cada 33s)
    const timer3 = setInterval(() => {
      if (analyzedProfile && next) {
        const boost = Math.max(3, Math.round(next.dRep));
        addPush({
          type: 'improvement',
          tag: 'MEJORA CONTINUA',
          title: `${next.label} subiría tu match ~${boost}%`,
          actions: [
            { label: 'Aprender', onClick: () => setActiveTab('academia'), primary: true },
            { label: 'Luego', onClick: () => {} },
          ],
          duration: 9000,
        });
      }
    }, 33000);

    return () => {
      clearTimeout(timer1);
      clearInterval(timer2);
      clearInterval(timer3);
    };
  }, [analyzedProfile, rep, nodos, next, addPush, setActiveTab]);

  // ⭐ EVALUACIÓN PROACTIVA al montar (saludo contextual, milestone, etc)
  useEffect(() => {
    if (!analyzedProfile) return;

    const daysSinceLastLogin = getDaysSinceLastLogin();
    const now = new Date();
    
    const context = {
      currentHour: now.getHours(),
      dayOfWeek: now.getDay(),
      reputation: rep,
      pe,
      onlineCount,
      lastOnlineCount,
      daysSinceLastLogin,
      currentTab: 'perfil',
      userName: sb?.display_name,
    };
    
    // Evaluar eventos proactivos (greeting, milestone, etc)
    const event = evaluateProactiveEvents(context);
    
    if (event) {
      setProactiveEvent(event);
      setEmotion(event.emotion);
      
      // Hablar el mensaje proactivo con voz
      speak(event.message, () => {
        setSpeaking(true);
        setEmotion('thinking');
      }, () => {
        setSpeaking(false);
        setEmotion('idle');
      });
    }
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyzedProfile]); // Re-evaluar cuando cambie el perfil
  
  // ⭐ DETECTAR CAMBIOS EN LA RED (network surge)
  useEffect(() => {
    if (onlineCount !== lastOnlineCount) {
      const surge = onlineCount - lastOnlineCount;
      
      if (surge >= 3) {
        const now = new Date();
        const context = {
          currentHour: now.getHours(),
          dayOfWeek: now.getDay(),
          reputation: rep,
          pe,
          onlineCount,
          lastOnlineCount,
          daysSinceLastLogin: 0,
          currentTab: 'perfil',
          userName: sb?.display_name,
        };
        
        const event = evaluateProactiveEvents(context);
        if (event && event.type === 'network_surge') {
          setProactiveEvent(event);
          setEmotion('excited');
          speak(event.message);
        }
      }
      
      setLastOnlineCount(onlineCount);
    }
  }, [onlineCount, lastOnlineCount, rep, pe, sb?.display_name]);

  function handleOnboardingComplete(newProfile: AnalyzedProfile) {
    setAnalyzedProfile(newProfile);
    setShowOnboarding(false);
    
    // Guardar en localStorage
    localStorage.setItem('omicron_analyzed_profile', JSON.stringify(newProfile));
    
    // Actualizar ejes del Gemelo en el profile global
    profile.axes = newProfile.axes;
    
    // Mensaje de bienvenida
    speak(`¡Bienvenido! Tu Gemelo Digital está activado. Reputación ${rep}, ${newProfile.seniorLabel}.`);
  }

  function handlePostulate(jobId: string) {
    // Simulación: aumentar PE
    profile.pe += 45;
    speak('Postulación enviada. Tu Gemelo respalda la candidatura con tu reputación.');
  }

  function speakOracle(text: string) {
    setEmotion('thinking');
    speak(text, () => setSpeaking(true), () => {
      setSpeaking(false);
      setEmotion('idle');
    });
  }

  function askOracle() {
    const base = `Para tu estado actual —${tier.name.replace('Nodo ', '')}, reputación ${rep}— `;
    const rec = next ? `te conviene: ${next.label}. Sube tu match y tu reputación.` : 'te conviene consolidar tus 4 ejes y tomar un contrato.';
    setEmotion('thinking');
    speakOracle(base + rec);
    setQ('');
    setTimeout(() => setEmotion('idle'), 3000);
  }

  // Chips para el Núcleo 3D (métricas flotantes del Gemelo).
  const chips: NucleoChip[] = [
    { label: 'Nodo', value: `N${level} · ${tier.name.replace('Nodo ', '')}`, color: C.purple, x: 0.18, y: 0.22 },
    { label: 'PE', value: String(pe), color: C.gold, x: 0.82, y: 0.22 },
    { label: 'Tokens', value: tokens.toLocaleString(), color: C.cyan, x: 0.18, y: 0.78 },
    { label: 'Contratos', value: String(contratos), color: C.green, x: 0.82, y: 0.78 },
  ];

  // Si no hay perfil analizado, mostrar onboarding
  if (showOnboarding) {
    return <CVOnboarding onComplete={handleOnboardingComplete} />;
  }

  // Si no hay perfil analizado y no está el onboarding, no renderizar nada
  if (!analyzedProfile) {
    return null;
  }

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
        <IconBtn onClick={() => setShowProfile(true)} label="Perfil"><UserCircle size={17} /></IconBtn>
        <IconBtn onClick={() => setShowOpportunities(true)} label="Red / oportunidades" color={C.gold}><Target size={17} /></IconBtn>
        <IconBtn
          onClick={() => speakOracle(`Hola. Eres ${tier.name.replace('Nodo ', '')}, reputación ${rep}, ${pe} PE.` + (next ? ` Tu mejor paso: ${next.label}.` : ''))}
          label="Hablar con el Oráculo"
          active={speaking}
        >
          <Volume2 size={17} />
        </IconBtn>
      </div>

      {/* ── Filtros de dimensión ── */}
      <div style={S.pills}>
        {([
          { id: 'desempeno', label: 'Desempeño', color: C.purple },
          { id: 'economia', label: 'Economía', color: C.green },
          { id: 'crecimiento', label: 'Crecimiento', color: C.gold },
        ] as const).map((f) => {
          const on = filter === f.id;
          return (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              ...S.pill,
              background: on ? `${f.color}1f` : 'rgba(255,255,255,0.04)',
              border: `1px solid ${on ? f.color : C.line}`,
              color: on ? f.color : C.mut,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: f.color, boxShadow: `0 0 8px ${f.color}` }} />
              {f.label}
            </button>
          );
        })}
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
          emotion={emotion}
          audioLevel={audioLevel}
          center={
            <div style={{ textAlign: 'center', lineHeight: 1 }}>
              <div style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: 48, color: '#eafffb', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>{rep}</div>
              <div style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: 2, color: 'rgba(190,230,255,0.85)', marginTop: 3 }}>REPUTACIÓN</div>
            </div>
          }
        />
      </div>
      
      {/* ⭐ NOTIFICACIÓN PROACTIVA (toast holográfico) */}
      <GemeloProactive
        event={proactiveEvent}
        onDismiss={() => setProactiveEvent(null)}
        onAction={(index) => {
          // Ejecutar acción del evento
          if (proactiveEvent?.actions?.[index]) {
            proactiveEvent.actions[index].action();
          }
        }}
      />

      {/* ── Hoja inferior: recomendaciones + accesos + Oráculo ── */}
      <div style={S.sheet}>
        {/* ── Una empresa te busca (match de alto valor) ── */}
        <div style={S.matchCard}>
          <div style={S.matchTag}>
            <span style={{ ...S.tagDot, background: C.gold, boxShadow: `0 0 8px ${C.gold}` }} />
            UNA EMPRESA TE BUSCA
          </div>
          <div style={S.matchTitle}>Creative Technologist</div>
          <div style={S.matchMeta}>96% de afinidad · 120–200 Ω/hora · Freelance</div>
          <div style={S.matchActions}>
            <button style={S.btnGold} onClick={() => setActiveTab('empleos')}>Ver</button>
            <button style={S.btnGhost} onClick={() => { /* después */ }}>Después</button>
          </div>
        </div>

        <div style={S.card}>
          <div style={S.cardTag}><span style={S.tagDot} />MEJORA CONTINUA</div>
          <div style={S.cardRow}>
            <span style={S.cardText}>
              {next ? `${next.label} subiría tu match ~${Math.max(3, Math.round(next.dRep))}%` : 'Consolida tus 4 ejes y toma un contrato'}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={S.btnGold} onClick={() => { if (next) actions.addTitle(); }}>
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

      {/* ⭐ COMPONENTES NUEVOS DEL PROTOTIPO */}
      
      {/* Pushes proactivos en tiempo real */}
      <ProactivePushes pushes={pushes} onDismiss={dismissPush} />

      {/* Sheet de oportunidades */}
      <OpportunitiesSheet
        isOpen={showOpportunities}
        onClose={() => setShowOpportunities(false)}
        profile={analyzedProfile}
        reputation={rep}
        onPostulate={handlePostulate}
        onNavigate={(action) => {
          setShowOpportunities(false);
          if (action === 'academia') setActiveTab('academia');
          else if (action === 'vault') setActiveTab('vault');
          else if (action === 'market') setActiveTab('market');
          else if (action === 'mentor' || action === 'chat') setActiveTab('chat');
        }}
      />

      {/* Tarjeta de identidad / perfil */}
      <ProfileCard
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        profile={analyzedProfile}
        reputation={rep}
        pe={pe}
        tokens={tokens}
        contracts={contratos}
        onViewOpportunities={() => {
          setShowProfile(false);
          setShowOpportunities(true);
        }}
      />
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
  pills: { display: 'flex', gap: 8, flexShrink: 0 },
  pill: { display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 999, cursor: 'pointer', fontFamily: FONT.display, fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' },
  matchCard: { padding: '13px 15px', borderRadius: 18, background: 'linear-gradient(180deg, rgba(28,22,8,0.7), rgba(12,10,6,0.85))', border: '1px solid rgba(255,176,46,0.4)', boxShadow: '0 10px 30px rgba(255,176,46,0.14)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' },
  matchTag: { display: 'flex', alignItems: 'center', gap: 7, fontFamily: FONT.mono, fontSize: 9.5, letterSpacing: 1.4, color: C.gold, textTransform: 'uppercase', marginBottom: 8 },
  matchTitle: { fontFamily: FONT.display, fontSize: 18, fontWeight: 700, color: C.ink, letterSpacing: -0.3 },
  matchMeta: { fontFamily: FONT.mono, fontSize: 11, color: C.mut, marginTop: 4, marginBottom: 12 },
  matchActions: { display: 'flex', gap: 8 },
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
