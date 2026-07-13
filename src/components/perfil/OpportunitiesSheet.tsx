// components/perfil/OpportunitiesSheet.tsx
// ═══════════════════════════════════════════════════════════════════════
// SHEET DE OPORTUNIDADES: modal flotante desde abajo con tabs dinámicos.
// Muestra trabajos filtrados por tipo, con scoring, match de skills y
// acciones (postular, ver detalles). Se adapta a modo estudiante.
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { X, Briefcase, Zap, GraduationCap, Store, ShoppingBag, Users } from 'lucide-react';
import type { AnalyzedProfile } from '../../lib/cvAnalyzer';
import { getTopJobs, getJobsByType, getGapSkills, jobTypeLabel, SKILL_LABELS, type JobScore } from '../../lib/jobMatcher';
import { C, FONT, RADIUS } from '../../theme';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  profile: AnalyzedProfile;
  reputation: number;
  onPostulate?: (jobId: string) => void;
  onNavigate?: (action: string) => void;
}

type TabId =
  | 'trabajos'
  | 'empresa'
  | 'freelance'
  | 'mentoria'
  | 'educarse'
  | 'vender'
  | 'comprar'
  // Tabs para estudiantes
  | 'ruta'
  | 'retos'
  | 'practicas'
  | 'comunidad';

interface Tab {
  id: TabId;
  label: string;
  icon?: typeof Briefcase;
}

const TABS_PRO: Tab[] = [
  { id: 'trabajos', label: '⭐ Trabajos' },
  { id: 'empresa', label: 'Empresa' },
  { id: 'freelance', label: 'Freelance' },
  { id: 'mentoria', label: 'Mentorías' },
  { id: 'educarse', label: 'Educarme' },
  { id: 'vender', label: 'Vender' },
  { id: 'comprar', label: 'Comprar' },
];

const TABS_STUDENT: Tab[] = [
  { id: 'ruta', label: '🧭 Mi ruta' },
  { id: 'retos', label: 'Retos' },
  { id: 'practicas', label: 'Prácticas' },
  { id: 'educarse', label: 'Aprender' },
  { id: 'mentoria', label: 'Mentores' },
  { id: 'comunidad', label: 'Comunidad' },
];

const TAB_SUBTITLES: Record<TabId, string> = {
  trabajos: 'Los 3 con mayor tasa de éxito para ti',
  empresa: 'Contratos por empresa alineados a tu perfil',
  freelance: 'Contratos freelance de alto valor',
  mentoria: 'Conecta con un mentor que te impulse',
  educarse: 'Aprende esto para desbloquear tu siguiente paso',
  vender: 'Convierte tu conocimiento en un activo',
  comprar: 'Adquiere conocimiento y sube tu medidor',
  ruta: 'Tu camino de aprendiz a profesional validado',
  retos: 'Practica, gana tokens y sube tu reputación',
  practicas: 'Prácticas y primeros empleos para ti',
  comunidad: 'Aprende acompañado y crece más rápido',
};

export function OpportunitiesSheet({
  isOpen,
  onClose,
  profile,
  reputation,
  onPostulate,
  onNavigate,
}: Props) {
  const isStudent = profile.arch === 'estudiante';
  const tabs = isStudent ? TABS_STUDENT : TABS_PRO;
  const defaultTab = isStudent ? 'ruta' : 'trabajos';

  const [currentTab, setCurrentTab] = useState<TabId>(defaultTab);

  // Reset tab al abrir si no es válido para el perfil
  useEffect(() => {
    if (isOpen) {
      const validIds = tabs.map((t) => t.id);
      if (!validIds.includes(currentTab)) {
        setCurrentTab(defaultTab);
      }
    }
  }, [isOpen, currentTab, defaultTab, tabs]);

  function handlePostulate(jobId: string, jobTitle: string) {
    onPostulate?.(jobId);
    // Simulación: cerrar sheet y mostrar toast
    setTimeout(() => {
      onClose();
    }, 300);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          ...S.backdrop,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        style={{
          ...S.sheet,
          transform: isOpen ? 'translateY(0)' : 'translateY(103%)',
        }}
      >
        {/* Grip */}
        <div style={S.grip} />

        {/* Header */}
        <div style={S.header}>
          <div>
            <h2 style={S.title}>Tus oportunidades</h2>
            <p style={S.subtitle}>{TAB_SUBTITLES[currentTab]}</p>
          </div>
          <button onClick={onClose} style={S.closeBtn} aria-label="Cerrar">
            <X size={15} />
          </button>
        </div>

        {/* Tabs */}
        <div style={S.tabs}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              style={{
                ...S.tab,
                ...(currentTab === tab.id ? S.tabActive : {}),
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body (scrollable) */}
        <div style={S.body}>
          <TabContent
            tab={currentTab}
            profile={profile}
            reputation={reputation}
            onPostulate={handlePostulate}
            onNavigate={onNavigate}
          />
        </div>
      </div>
    </>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Contenido dinámico de cada tab
// ───────────────────────────────────────────────────────────────────────

function TabContent({
  tab,
  profile,
  reputation,
  onPostulate,
  onNavigate,
}: {
  tab: TabId;
  profile: AnalyzedProfile;
  reputation: number;
  onPostulate: (jobId: string, jobTitle: string) => void;
  onNavigate?: (action: string) => void;
}) {
  // Tab: Trabajos (top 3)
  if (tab === 'trabajos') {
    const jobs = getTopJobs(profile, reputation, 3);
    return (
      <>
        {jobs.map((jobScore, i) => (
          <JobCard
            key={jobScore.job.id}
            jobScore={jobScore}
            profile={profile}
            isTop={i === 0}
            onPostulate={onPostulate}
          />
        ))}
      </>
    );
  }

  // Tab: Empresa
  if (tab === 'empresa') {
    const jobs = getJobsByType('empresa', profile, reputation);
    if (jobs.length === 0) {
      return <EmptyState message="Pronto habrá más aquí." />;
    }
    return (
      <>
        {jobs.map((jobScore, i) => (
          <JobCard
            key={jobScore.job.id}
            jobScore={jobScore}
            profile={profile}
            isTop={i === 0}
            onPostulate={onPostulate}
          />
        ))}
      </>
    );
  }

  // Tab: Freelance
  if (tab === 'freelance') {
    const jobs = getJobsByType('freelance', profile, reputation);
    if (jobs.length === 0) {
      return <EmptyState message="Pronto habrá más aquí." />;
    }
    return (
      <>
        {jobs.map((jobScore, i) => (
          <JobCard
            key={jobScore.job.id}
            jobScore={jobScore}
            profile={profile}
            isTop={i === 0}
            onPostulate={onPostulate}
          />
        ))}
      </>
    );
  }

  // Tab: Mentoría
  if (tab === 'mentoria') {
    if (profile.arch === 'estudiante') {
      return (
        <OpportunityCard
          icon="🤝"
          title="Encuentra tu mentor"
          tag="Nodos senior validados de la red"
          description="El sistema te empareja con un profesional senior afín a tu ruta para acelerar tu crecimiento y validar tu nodo."
          pay="Desde 40 Ω / sesión"
          buttonLabel="Buscar mentor"
          buttonType="gold"
          onAction={() => onNavigate?.('mentor')}
        />
      );
    }

    const jobs = getJobsByType('mentoria', profile, reputation);
    if (jobs.length === 0) {
      return <EmptyState message="Pronto habrá más aquí." />;
    }
    return (
      <>
        {jobs.map((jobScore, i) => (
          <JobCard
            key={jobScore.job.id}
            jobScore={jobScore}
            profile={profile}
            isTop={i === 0}
            onPostulate={onPostulate}
          />
        ))}
      </>
    );
  }

  // Tab: Educarse
  if (tab === 'educarse') {
    const gaps = getGapSkills(profile);
    return (
      <>
        {gaps.map((skillId) => (
          <OpportunityCard
            key={skillId}
            title={`Domina ${SKILL_LABELS[skillId] || skillId}`}
            tag="Academia · +Fundamento +Ejecución"
            description={`Suma ${SKILL_LABELS[skillId] || skillId} a tu Gemelo, sube tu medidor de conocimiento y desbloquea trabajos con mayor tasa de éxito.`}
            pay="Recompensa: +180 PE"
            buttonLabel="Empezar ahora"
            onAction={() => onNavigate?.('academia')}
          />
        ))}
      </>
    );
  }

  // Tab: Vender
  if (tab === 'vender') {
    return (
      <>
        {profile.labels.slice(0, 5).map((label) => (
          <OpportunityCard
            key={label}
            title={label}
            tag="Bóveda · activo con regalías"
            description={`Publica tu conocimiento de ${label} como curso o plantilla. Cobra regalías en Ω cada vez que alguien lo use.`}
            pay="+90 Ω + regalías"
            buttonLabel="Publicar"
            buttonType="gold"
            onAction={() => onNavigate?.('vault')}
          />
        ))}
      </>
    );
  }

  // Tab: Comprar
  if (tab === 'comprar') {
    const gaps = getGapSkills(profile);
    return (
      <>
        {gaps.map((skillId, i) => {
          const price = 400 + i * 140;
          return (
            <OpportunityCard
              key={skillId}
              title={`Pack ${SKILL_LABELS[skillId] || skillId}`}
              tag="Marketplace · de un Nodo Pioneer"
              description={`Adquiere conocimiento verificado de ${SKILL_LABELS[skillId] || skillId} y súbelo a tu Gemelo al instante. Sube tu Fundamento.`}
              pay={`${price} Ω`}
              buttonLabel="Adquirir"
              onAction={() => onNavigate?.('market')}
            />
          );
        })}
      </>
    );
  }

  // Tab: Ruta (estudiantes)
  if (tab === 'ruta') {
    const gaps = getGapSkills(profile);
    const chain = [
      {
        icon: '📚',
        tag: 'PASO 1 · Habilidad',
        title: `Aprende ${SKILL_LABELS[gaps[0]] || gaps[0]}`,
        desc: 'Tu base para todo lo demás.',
        btnLabel: 'Empezar',
        action: 'academia',
      },
      {
        icon: '🧩',
        tag: 'PASO 2 · Reto',
        title: `Reto guiado con ${SKILL_LABELS[gaps[0]] || gaps[0]}`,
        desc: 'Aplica lo aprendido y gana tokens Ω.',
        btnLabel: 'Ir al reto',
        action: 'reto',
      },
      {
        icon: '🏅',
        tag: 'PASO 3 · Validación',
        title: `Certifícate en ${SKILL_LABELS[gaps[1] || gaps[0]] || 'tu skill'}`,
        desc: 'El Tribunal de Pares valida tu nodo.',
        btnLabel: 'Validar',
        action: 'academia',
      },
      {
        icon: '💼',
        tag: 'PASO 4 · Primer empleo',
        title: 'Prácticas y roles Junior',
        desc: 'El sistema te presenta a empresas que buscan tu perfil.',
        btnLabel: 'Ver prácticas',
        action: 'practicas',
      },
    ];

    return (
      <>
        <div style={S.card}>
          <p style={S.cardText}>
            🔗 Todo se conecta: cada paso desbloquea el siguiente. Esta es tu ruta de aprendiz a profesional validado.
          </p>
        </div>
        {chain.map((step, i) => (
          <OpportunityCard
            key={i}
            icon={step.icon}
            tag={step.tag}
            title={step.title}
            description={step.desc}
            buttonLabel={step.btnLabel}
            onAction={() => {
              if (step.action === 'practicas') setCurrentTab('practicas');
              else onNavigate?.(step.action);
            }}
          />
        ))}
      </>
    );
  }

  // Tab: Retos
  if (tab === 'retos') {
    const gaps = getGapSkills(profile);
    const retos = [
      { title: `Clona una landing con ${SKILL_LABELS[gaps[0]] || 'HTML/CSS'}`, tag: 'Reto · 2-3 h', pay: '+60 Ω · +Ejecución' },
      { title: `Componente interactivo en ${SKILL_LABELS[gaps[0]] || 'JavaScript'}`, tag: 'Reto · medio día', pay: '+90 Ω · +Calidad' },
      { title: 'Mini-proyecto validado por pares', tag: 'Reto · 1 semana', pay: '+150 Ω · +Reputación' },
    ];

    return (
      <>
        {retos.map((r, i) => (
          <OpportunityCard
            key={i}
            icon="🧩"
            title={r.title}
            tag={r.tag}
            pay={r.pay}
            buttonLabel="Aceptar reto"
            onAction={() => onNavigate?.('academia')}
          />
        ))}
      </>
    );
  }

  // Tab: Prácticas
  if (tab === 'practicas') {
    const jobs = getJobsByType('empresa', profile, reputation).filter(
      (j) => j.job.seniorMin <= 1
    );
    if (jobs.length === 0) {
      return <EmptyState message="Pronto habrá prácticas disponibles." />;
    }
    return (
      <>
        {jobs.map((jobScore, i) => (
          <JobCard
            key={jobScore.job.id}
            jobScore={jobScore}
            profile={profile}
            isTop={i === 0}
            onPostulate={onPostulate}
          />
        ))}
      </>
    );
  }

  // Tab: Comunidad
  if (tab === 'comunidad') {
    return (
      <>
        <OpportunityCard
          icon="🤝"
          title="Encuentra un mentor"
          tag="Nodos senior de la red"
          description="Conéctate con un profesional validado que te guíe en tu ruta."
          buttonLabel="Buscar mentor"
          onAction={() => onNavigate?.('mentor')}
        />
        <OpportunityCard
          icon="💬"
          title="Únete a un grupo de estudio"
          tag="Aprende con pares"
          description="Resuelve retos en comunidad y sube tu reputación más rápido."
          buttonLabel="Unirme"
          onAction={() => onNavigate?.('chat')}
        />
      </>
    );
  }

  return <EmptyState message="Próximamente..." />;
}

// ───────────────────────────────────────────────────────────────────────
// Componentes auxiliares
// ───────────────────────────────────────────────────────────────────────

function JobCard({
  jobScore,
  profile,
  isTop,
  onPostulate,
}: {
  jobScore: JobScore;
  profile: AnalyzedProfile;
  isTop: boolean;
  onPostulate: (jobId: string, jobTitle: string) => void;
}) {
  const { job, success, match } = jobScore;
  const successColor = success >= 75 ? C.gold : success >= 55 ? C.cyan : C.mut;

  const matchedLabels = job.need
    .filter((s) => profile.skills.includes(s))
    .map((s) => SKILL_LABELS[s] || s)
    .slice(0, 4);

  return (
    <div style={{ ...S.card, ...(isTop ? S.cardTop : {}) }}>
      <div style={S.jobTitle}>{job.title}</div>
      <div style={S.jobTag}>
        {job.tag} · {jobTypeLabel(job.type)}
      </div>
      <p style={S.jobDesc}>{job.desc}</p>

      <div style={S.meta}>
        <span style={S.metaTag}>
          Coincide con: <b style={{ color: C.green }}>{matchedLabels.join(', ') || 'tu base'}</b>
        </span>
      </div>

      <div style={S.jobRow}>
        {/* Anillo de éxito */}
        <div
          style={{
            ...S.ring,
            background: `conic-gradient(${successColor} ${success * 3.6}deg, rgba(255,255,255,0.08) 0)`,
          }}
        >
          <div style={S.ringInner} />
          <div style={S.ringValue}>{success}%</div>
          <div style={S.ringLabel}>éxito</div>
        </div>

        <div style={S.jobSide}>
          <div style={S.jobPay}>{job.pay}</div>
        </div>

        <button
          onClick={() => onPostulate(job.id, job.title)}
          style={isTop ? S.btnGold : S.btnPrimary}
        >
          Postular
        </button>
      </div>
    </div>
  );
}

function OpportunityCard({
  icon,
  tag,
  title,
  description,
  pay,
  buttonLabel,
  buttonType = 'primary',
  onAction,
}: {
  icon?: string;
  tag?: string;
  title: string;
  description?: string;
  pay?: string;
  buttonLabel: string;
  buttonType?: 'primary' | 'gold';
  onAction: () => void;
}) {
  return (
    <div style={S.card}>
      {icon && <div style={S.oppIcon}>{icon}</div>}
      {tag && <div style={S.oppTag}>{tag}</div>}
      <div style={S.jobTitle}>{title}</div>
      {description && <p style={S.jobDesc}>{description}</p>}
      <div style={S.jobRow}>
        {pay && (
          <div style={S.jobSide}>
            <div style={S.jobPay}>{pay}</div>
          </div>
        )}
        <button onClick={onAction} style={buttonType === 'gold' ? S.btnGold : S.btnPrimary}>
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={S.card}>
      <p style={S.cardText}>{message}</p>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Estilos
// ───────────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 34,
    background: 'rgba(2,3,8,0.55)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    transition: 'opacity 0.3s',
  },
  sheet: {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 36,
    maxWidth: 480,
    margin: '0 auto',
    maxHeight: '84%',
    display: 'flex',
    flexDirection: 'column',
    background: 'linear-gradient(180deg, rgba(16,19,34,0.98), rgba(7,9,18,0.99))',
    borderRadius: '26px 26px 0 0',
    border: `1px solid ${C.line}`,
    borderBottom: 'none',
    boxShadow: '0 -20px 60px rgba(0,0,0,0.65)',
    transition: 'transform 0.36s cubic-bezier(0.2, 0.9, 0.25, 1)',
  },
  grip: {
    width: 40,
    height: 4,
    borderRadius: 3,
    background: 'rgba(255,255,255,0.18)',
    margin: '10px auto 2px',
    flexShrink: 0,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 18px',
    flexShrink: 0,
  },
  title: {
    fontFamily: FONT.display,
    fontSize: 17,
    fontWeight: 700,
    color: C.ink,
    margin: 0,
  },
  subtitle: {
    fontFamily: FONT.mono,
    fontSize: 11,
    color: C.mut,
    margin: '1px 0 0',
  },
  closeBtn: {
    width: 30,
    height: 30,
    flexShrink: 0,
    borderRadius: '50%',
    border: `1px solid ${C.line}`,
    background: 'rgba(255,255,255,0.05)',
    color: C.mut,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    display: 'flex',
    gap: 7,
    overflowX: 'auto',
    padding: '4px 18px 10px',
    flexShrink: 0,
  },
  tab: {
    flex: '0 0 auto',
    padding: '8px 13px',
    borderRadius: RADIUS.md,
    cursor: 'pointer',
    fontFamily: FONT.display,
    fontSize: 12.5,
    fontWeight: 500,
    color: C.mut,
    background: C.glass,
    border: `1px solid ${C.line}`,
    whiteSpace: 'nowrap',
  },
  tabActive: {
    color: '#05060f',
    background: 'linear-gradient(135deg, #8fe0ff, #5cc8ff)',
    borderColor: 'transparent',
    fontWeight: 600,
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: `2px 16px calc(20px + env(safe-area-inset-bottom, 0px))`,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  card: {
    padding: '14px 15px',
    borderRadius: RADIUS.lg,
    border: `1px solid ${C.line}`,
    background: C.glass,
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
  },
  cardTop: {
    borderColor: 'rgba(255,176,46,0.4)',
    background: 'rgba(255,176,46,0.07)',
  },
  cardText: {
    fontFamily: FONT.display,
    fontSize: 13,
    lineHeight: 1.5,
    color: '#b8c0d0',
    margin: 0,
  },
  oppIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  oppTag: {
    fontFamily: FONT.mono,
    fontSize: 10,
    letterSpacing: 0.6,
    color: C.cyan,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  jobTitle: {
    fontFamily: FONT.display,
    fontSize: 14.5,
    fontWeight: 600,
    color: C.ink,
    marginBottom: 2,
  },
  jobTag: {
    fontFamily: FONT.mono,
    fontSize: 11,
    color: C.mut,
    marginTop: 1,
  },
  jobDesc: {
    fontFamily: FONT.display,
    fontSize: 12.5,
    lineHeight: 1.5,
    color: '#b8c0d0',
    margin: '7px 0 0',
  },
  meta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 9,
  },
  metaTag: {
    fontFamily: FONT.mono,
    fontSize: 10.5,
    padding: '4px 8px',
    borderRadius: 9,
    background: 'rgba(255,255,255,0.05)',
    color: C.mut,
  },
  jobRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 11,
    gap: 10,
  },
  ring: {
    position: 'relative',
    width: 46,
    height: 46,
    flexShrink: 0,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringInner: {
    position: 'absolute',
    inset: 5,
    borderRadius: '50%',
    background: '#0b0e1a',
  },
  ringValue: {
    position: 'relative',
    zIndex: 1,
    fontFamily: FONT.display,
    fontSize: 12,
    fontWeight: 800,
    color: '#fff',
  },
  ringLabel: {
    position: 'absolute',
    bottom: -13,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: FONT.mono,
    fontSize: 8,
    color: C.mut,
    letterSpacing: 0.3,
  },
  jobSide: {
    flex: 1,
    minWidth: 0,
  },
  jobPay: {
    fontFamily: FONT.display,
    fontSize: 12,
    color: C.green,
    fontWeight: 600,
    marginTop: 3,
  },
  btnPrimary: {
    padding: '10px 16px',
    borderRadius: RADIUS.md,
    border: 'none',
    cursor: 'pointer',
    fontFamily: FONT.display,
    fontSize: 13,
    fontWeight: 600,
    color: '#05060f',
    background: 'linear-gradient(135deg, #8fe0ff, #5cc8ff)',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  btnGold: {
    padding: '10px 16px',
    borderRadius: RADIUS.md,
    border: 'none',
    cursor: 'pointer',
    fontFamily: FONT.display,
    fontSize: 13,
    fontWeight: 600,
    color: '#05060f',
    background: 'linear-gradient(135deg, #ffd27a, #ffb02e)',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
};
