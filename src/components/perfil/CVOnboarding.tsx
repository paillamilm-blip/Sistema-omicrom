// components/perfil/CVOnboarding.tsx
// ═══════════════════════════════════════════════════════════════════════
// ONBOARDING COMPLETO: analiza CV, mide conocimiento en tiempo real,
// permite elegir avatar, muestra reputación y mejor match, luego despierta.
// ═══════════════════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from 'react';
import { Upload, Sparkles } from 'lucide-react';
import { analyzeCV, DEMO_CV, type AnalyzedProfile } from '../../lib/cvAnalyzer';
import { getTopJobs } from '../../lib/jobMatcher';
import { AvatarPicker } from './AvatarPicker';
import { C, FONT, RADIUS } from '../../theme';

interface Props {
  onComplete: (profile: AnalyzedProfile) => void;
}

export function CVOnboarding({ onComplete }: Props) {
  const [step, setStep] = useState<'cv' | 'analysis'>('cv');
  const [cvText, setCvText] = useState('');
  const [cvNote, setCvNote] = useState('');
  const [profile, setProfile] = useState<AnalyzedProfile | null>(null);
  const [barWidth, setBarWidth] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Animar barra de reputación al entrar al paso 2
  useEffect(() => {
    if (step === 'analysis' && profile) {
      const rep = calculateReputation(profile);
      setTimeout(() => setBarWidth(rep), 80);
    }
  }, [step, profile]);

  function calculateReputation(p: AnalyzedProfile): number {
    const { exec, qual, trans, fund } = p.axes;
    const avg = (exec + qual + trans + fund) / 4;
    // Simplificado: 80% experiencia promedio
    return Math.max(0, Math.min(100, Math.round(avg * 0.8)));
  }

  function handleAnalyze() {
    const txt = cvText.trim();
    if (!txt) {
      setCvNote('⚠️ Pega tu CV o toca "Usar ejemplo"');
      return;
    }

    const analyzed = analyzeCV(txt);
    setProfile(analyzed);
    setStep('analysis');
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '').slice(0, 8000);
      setCvText(text);
      setCvNote('✓ Archivo cargado');
    };
    reader.readAsText(file);
  }

  function handleDemo() {
    setCvText(DEMO_CV);
    setCvNote('');
  }

  function handleComplete() {
    if (profile) {
      onComplete(profile);
    }
  }

  const rep = profile ? calculateReputation(profile) : 0;
  const topJob = profile ? getTopJobs(profile, rep, 1)[0] : null;
  const successColor = topJob && topJob.success >= 75 ? C.gold : C.cyan;

  return (
    <div style={S.overlay}>
      <div style={S.container}>
        {step === 'cv' && (
          <div style={S.step}>
            <div style={S.icon}>Ω</div>
            <h1 style={S.h1}>Activa tu Gemelo con tu CV</h1>
            <p style={S.p}>
              Pega tu CV o describe tu experiencia. Lo analizo, mido tu conocimiento en tiempo real y te posiciono para tus mejores oportunidades.
            </p>

            <textarea
              value={cvText}
              onChange={(e) => setCvText(e.target.value)}
              placeholder="Pega aquí tu CV o describe tu experiencia: rol, años, tecnologías (React, Node, Python…), proyectos, mentorías, certificaciones…"
              style={S.textarea}
            />

            {cvNote && <div style={S.note}>{cvNote}</div>}

            <div style={S.row}>
              <button onClick={() => fileInputRef.current?.click()} style={S.btnSecondary}>
                <Upload size={16} />
                Subir archivo (.txt)
              </button>
              <button onClick={handleDemo} style={S.btnSecondary}>
                Usar ejemplo
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.json,.text"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />

            <button onClick={handleAnalyze} style={S.btnPrimary}>
              Analizar mi conocimiento →
            </button>
          </div>
        )}

        {step === 'analysis' && profile && (
          <div style={S.step}>
            {/* Avatar giratorio con anillo */}
            <div style={S.avatarWrap}>
              <div style={S.avatarRing} />
              <div
                style={{
                  ...S.avatar,
                  ...(profile.avatar?.type === 'img'
                    ? {
                        backgroundImage: `url(${profile.avatar.v})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }
                    : {
                        background: getAvatarGradient(profile.avatar?.v as number),
                      }),
                }}
              >
                {profile.avatar?.type !== 'img' && (
                  <span style={{ fontFamily: FONT.display, fontSize: 44, fontWeight: 700, color: '#fff' }}>
                    Ω
                  </span>
                )}
              </div>
            </div>

            {/* Selector de avatar */}
            <AvatarPicker
              selected={profile.avatar}
              onChange={(av) => setProfile({ ...profile, avatar: av })}
            />

            {/* Medidor de reputación */}
            <div style={S.meter}>
              <div style={S.meterValue}>{rep}</div>
              <div style={S.meterLabel}>Reputación · tu medidor de conocimiento</div>
              <div style={S.meterBar}>
                <div style={{ ...S.meterFill, width: `${barWidth}%` }} />
              </div>
            </div>

            {/* Información del perfil */}
            <div style={S.roleLabel}>{profile.seniorLabel}</div>
            <div style={S.posLabel}>
              {profile.labels.slice(0, 3).join(' · ') || 'tu especialidad'}
            </div>

            {/* Preview del mejor trabajo */}
            {topJob && (
              <div style={S.jobPreview}>
                <div style={{ flex: 1 }}>
                  <div style={S.jobTitle}>{topJob.job.title}</div>
                  <div style={S.jobTag}>Tu mejor match ahora</div>
                </div>
                <div style={{ ...S.jobScore, color: successColor }}>
                  {topJob.success}%
                  <div style={S.jobScoreLabel}>ÉXITO</div>
                </div>
              </div>
            )}

            <button onClick={handleComplete} style={S.btnPrimary}>
              <Sparkles size={18} />
              Entrar al sistema
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function getAvatarGradient(index: number): string {
  const palettes = [
    ['#5cc8ff', '#5e5ce6'],
    ['#3fd0c9', '#5cc8ff'],
    ['#ffb02e', '#ff6a3d'],
    ['#b98bff', '#5e5ce6'],
    ['#ff8fb0', '#ff375f'],
    ['#8b9dff', '#3fd0c9'],
  ];
  const [c1, c2] = palettes[(index || 0) % palettes.length];
  return `linear-gradient(140deg, ${c1}, ${c2})`;
}

const S: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 40,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    background: 'radial-gradient(120% 90% at 50% 36%, #080c1c 0%, #010104 74%)',
    overflowY: 'auto',
    padding: `max(34px, env(safe-area-inset-top, 0px)) 20px 20px`,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    margin: 'auto 0',
  },
  step: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 15,
    width: '100%',
  },
  icon: {
    width: 74,
    height: 74,
    borderRadius: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: FONT.display,
    fontSize: 34,
    fontWeight: 700,
    color: '#fff',
    background: 'linear-gradient(140deg, #5cc8ff, #5e5ce6)',
    boxShadow: '0 22px 66px rgba(94,92,230,0.55)',
    animation: 'floatY 4s ease-in-out infinite',
  },
  h1: {
    fontFamily: FONT.display,
    fontSize: 26,
    fontWeight: 700,
    letterSpacing: -0.3,
    color: C.ink,
    maxWidth: 320,
    textAlign: 'center',
    margin: 0,
  },
  p: {
    fontFamily: FONT.display,
    fontSize: 14.5,
    lineHeight: 1.55,
    color: C.mut,
    maxWidth: 300,
    textAlign: 'center',
    margin: 0,
  },
  textarea: {
    width: '100%',
    minHeight: 118,
    maxHeight: 190,
    borderRadius: RADIUS.lg,
    border: `1px solid ${C.line}`,
    background: 'rgba(255,255,255,0.045)',
    color: C.ink,
    fontFamily: FONT.display,
    fontSize: 13,
    padding: 13,
    outline: 'none',
    resize: 'none' as const,
    lineHeight: 1.5,
  },
  note: {
    fontFamily: FONT.mono,
    fontSize: 11.5,
    color: C.gold,
    width: '100%',
    textAlign: 'left',
  },
  row: {
    display: 'flex',
    gap: 10,
    width: '100%',
  },
  btnSecondary: {
    flex: 1,
    padding: 11,
    borderRadius: RADIUS.md,
    cursor: 'pointer',
    fontFamily: FONT.display,
    fontSize: 12.5,
    fontWeight: 500,
    color: C.mut,
    background: C.glass,
    border: `1px solid ${C.line}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  btnPrimary: {
    width: '100%',
    padding: '15px 30px',
    borderRadius: 17,
    border: 'none',
    cursor: 'pointer',
    fontFamily: FONT.display,
    fontSize: 16,
    fontWeight: 600,
    color: '#fff',
    background: 'linear-gradient(135deg, #5cc8ff, #5e5ce6)',
    boxShadow: '0 14px 38px rgba(10,132,255,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  avatarWrap: {
    position: 'relative',
    width: 112,
    height: 112,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '2px 0 8px',
  },
  avatarRing: {
    position: 'absolute',
    inset: -6,
    borderRadius: '50%',
    border: '1px solid rgba(120,180,255,0.25)',
    animation: 'cp-spin 14s linear infinite',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 16px 46px rgba(92,120,255,0.5), inset 0 2px 10px rgba(255,255,255,0.25)',
    animation: 'floatY 5s ease-in-out infinite',
  },
  meter: {
    width: '100%',
    textAlign: 'center',
  },
  meterValue: {
    fontFamily: FONT.display,
    fontSize: 46,
    fontWeight: 800,
    letterSpacing: -1,
    lineHeight: 1,
    background: 'linear-gradient(135deg, #eaf3ff, #5cc8ff)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  meterLabel: {
    fontFamily: FONT.mono,
    fontSize: 10.5,
    color: C.mut,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
    marginTop: 3,
  },
  meterBar: {
    height: 8,
    borderRadius: 6,
    background: 'rgba(255,255,255,0.08)',
    margin: '9px 0 3px',
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: 6,
    background: 'linear-gradient(90deg, #5cc8ff, #5e5ce6)',
    transition: 'width 1.1s cubic-bezier(0.2, 0.9, 0.25, 1)',
  },
  roleLabel: {
    fontFamily: FONT.display,
    fontSize: 14.5,
    fontWeight: 700,
    textAlign: 'center',
    color: C.ink,
    marginTop: 2,
  },
  posLabel: {
    fontFamily: FONT.display,
    fontSize: 12.5,
    color: C.mut,
    textAlign: 'center',
    lineHeight: 1.5,
  },
  jobPreview: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    padding: '11px 13px',
    borderRadius: 14,
    border: `1px solid ${C.line}`,
    background: C.glass,
    marginTop: 4,
  },
  jobTitle: {
    fontFamily: FONT.display,
    fontSize: 13.5,
    fontWeight: 600,
    color: C.ink,
  },
  jobTag: {
    fontFamily: FONT.mono,
    fontSize: 10.5,
    color: C.mut,
    marginTop: 1,
  },
  jobScore: {
    fontFamily: FONT.display,
    fontSize: 15,
    fontWeight: 800,
    whiteSpace: 'nowrap' as const,
  },
  jobScoreLabel: {
    fontFamily: FONT.mono,
    fontSize: 8.5,
    fontWeight: 600,
    color: C.mut,
    letterSpacing: 0.4,
  },
};
