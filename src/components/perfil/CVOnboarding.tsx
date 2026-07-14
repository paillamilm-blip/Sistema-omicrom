// components/perfil/CVOnboarding.tsx
// ═══════════════════════════════════════════════════════════════════════
// ONBOARDING PROFESIONAL: sube tu CV (PDF, Word, TXT) o pega tu
// experiencia. Analiza, mide y posiciona. Diseño sobrio y profesional.
// ═══════════════════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from 'react';
import { FileText, Upload, ArrowRight, CheckCircle, Briefcase } from 'lucide-react';
import { analyzeCV, DEMO_CV, type AnalyzedProfile } from '../../lib/cvAnalyzer';
import { getTopJobs } from '../../lib/jobMatcher';
import { FONT, RADIUS } from '../../theme';

interface Props {
  onComplete: (profile: AnalyzedProfile) => void;
}

export function CVOnboarding({ onComplete }: Props) {
  const [step, setStep] = useState<'cv' | 'analysis'>('cv');
  const [cvText, setCvText] = useState('');
  const [cvNote, setCvNote] = useState('');
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [profile, setProfile] = useState<AnalyzedProfile | null>(null);
  const [barWidth, setBarWidth] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 'analysis' && profile) {
      const rep = calculateReputation(profile);
      setTimeout(() => setBarWidth(rep), 120);
    }
  }, [step, profile]);

  function calculateReputation(p: AnalyzedProfile): number {
    const { exec, qual, trans, fund } = p.axes;
    const avg = (exec + qual + trans + fund) / 4;
    return Math.max(0, Math.min(100, Math.round(avg * 0.8)));
  }

  function handleAnalyze() {
    const txt = cvText.trim();
    if (!txt) {
      setCvNote('Adjunta tu CV o describe tu experiencia profesional.');
      return;
    }
    setIsProcessing(true);
    // Simular breve procesamiento (UX profesional)
    setTimeout(() => {
      const analyzed = analyzeCV(txt);
      setProfile(analyzed);
      setStep('analysis');
      setIsProcessing(false);
    }, 800);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const name = file.name.toLowerCase();
    setFileName(file.name);
    setCvNote('');

    // PDF: extraer texto
    if (name.endsWith('.pdf')) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const text = await extractTextFromPDF(arrayBuffer);
        if (text.trim().length < 20) {
          setCvNote('No se pudo extraer texto del PDF. Intenta con un PDF de texto (no escaneado) o pega tu experiencia manualmente.');
          return;
        }
        setCvText(text.slice(0, 8000));
        setCvNote(`Documento cargado: ${file.name}`);
      } catch {
        setCvNote('Error al leer el PDF. Intenta con otro formato o pega tu experiencia.');
      }
      return;
    }

    // Word (.docx): extraer texto básico
    if (name.endsWith('.docx') || name.endsWith('.doc')) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const text = await extractTextFromDocx(arrayBuffer);
        if (text.trim().length < 20) {
          setCvNote('No se pudo extraer texto del documento. Intenta copiar y pegar tu CV directamente.');
          return;
        }
        setCvText(text.slice(0, 8000));
        setCvNote(`Documento cargado: ${file.name}`);
      } catch {
        setCvNote('Error al leer el documento. Intenta copiar y pegar tu CV directamente.');
      }
      return;
    }

    // Texto plano (.txt, .md, etc)
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '').slice(0, 8000);
      setCvText(text);
      setCvNote(`Documento cargado: ${file.name}`);
    };
    reader.onerror = () => {
      setCvNote('Error al leer el archivo.');
    };
    reader.readAsText(file);
  }

  function handleComplete() {
    if (profile) {
      onComplete(profile);
    }
  }

  const rep = profile ? calculateReputation(profile) : 0;
  const topJob = profile ? getTopJobs(profile, rep, 1)[0] : null;

  return (
    <div style={S.overlay}>
      <div style={S.container}>
        {step === 'cv' && (
          <div style={S.step}>
            {/* Header profesional */}
            <div style={S.logoRow}>
              <div style={S.logoMark}>Ω</div>
              <span style={S.logoText}>Ómicron</span>
            </div>

            <h1 style={S.h1}>Construye tu Gemelo Digital</h1>
            <p style={S.p}>
              Tu Gemelo Digital es una reputación verificable e imposible de falsear. Sube tu CV y el sistema calculará tus 4 ejes de desempeño para posicionarte en el ecosistema de capital intelectual.
            </p>

            {/* Zona de upload principal */}
            <div
              style={S.dropZone}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={28} color="#5a7090" />
              <div style={S.dropTitle}>
                {fileName || 'Subir CV'}
              </div>
              <div style={S.dropSub}>
                PDF, Word (.docx) o texto plano — máx. 5MB
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.txt,.md,.json,.text,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />

            {/* Separador */}
            <div style={S.separator}>
              <div style={S.sepLine} />
              <span style={S.sepText}>o describe tu experiencia profesional</span>
              <div style={S.sepLine} />
            </div>

            <textarea
              value={cvText}
              onChange={(e) => setCvText(e.target.value)}
              placeholder="Rol actual, años de experiencia, tecnologías que dominas, contratos completados, certificaciones, mentorías realizadas..."
              style={S.textarea}
            />

            {cvNote && (
              <div style={{ ...S.note, color: cvNote.startsWith('Documento') ? '#4a9e7a' : '#a08050' }}>
                {cvNote}
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={isProcessing}
              style={{ ...S.btnPrimary, opacity: isProcessing ? 0.7 : 1 }}
            >
              {isProcessing ? 'Calculando ejes...' : 'Calcular mi Gemelo Digital'}
              {!isProcessing && <ArrowRight size={16} />}
            </button>

            <button onClick={() => { setCvText(DEMO_CV); setCvNote(''); }} style={S.linkBtn}>
              Usar perfil de ejemplo para explorar el sistema
            </button>
          </div>
        )}

        {step === 'analysis' && profile && (
          <div style={S.step}>
            {/* Header resultado */}
            <div style={S.resultHeader}>
              <CheckCircle size={20} color="#4a9e7a" />
              <span style={S.resultTitle}>Gemelo Digital calculado</span>
            </div>

            {/* Tarjeta de perfil */}
            <div style={S.profileCard}>
              <div style={S.profileRow}>
                <div style={S.profileAvatar}>
                  <Briefcase size={22} color="#7a8ea8" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={S.profileName}>{profile.seniorLabel}</div>
                  <div style={S.profileSkills}>
                    {profile.labels.slice(0, 4).join(' · ')}
                  </div>
                  {profile.years > 0 && (
                    <div style={S.profileYears}>{profile.years} año{profile.years !== 1 ? 's' : ''} de experiencia</div>
                  )}
                </div>
              </div>
            </div>

            {/* Fórmula de reputación visible */}
            <div style={S.formulaCard}>
              <div style={S.formulaTitle}>Fórmula de tu reputación</div>
              <div style={S.formulaText}>
                REPUTACIÓN = 20% Tradicional + 80% (Ejecución + Calidad + Fundamento + Trascendencia) / 4
              </div>
            </div>

            {/* Métricas profesionales */}
            <div style={S.metricsGrid}>
              <div style={S.metricCard}>
                <div style={S.metricValue}>{rep}<span style={S.metricUnit}>/100</span></div>
                <div style={S.metricLabel}>Reputación</div>
                <div style={S.metricBar}>
                  <div style={{ ...S.metricFill, width: `${barWidth}%` }} />
                </div>
              </div>
              <div style={S.metricCard}>
                <div style={S.metricValue}>{profile.skills.length}</div>
                <div style={S.metricLabel}>Competencias</div>
              </div>
            </div>

            {/* Ejes de evaluación — con nombres exactos de la bitácora */}
            <div style={S.axesCard}>
              <div style={S.axesTitle}>Tus 4 ejes de desempeño (80% de tu reputación)</div>
              <div style={S.axesList}>
                <AxisRow label="Ejecución" value={profile.axes.exec} desc="Contratos completados" />
                <AxisRow label="Calidad" value={profile.axes.qual} desc="Calificaciones de clientes" />
                <AxisRow label="Fundamento" value={profile.axes.fund} desc="Academia + credenciales" />
                <AxisRow label="Trascendencia" value={profile.axes.trans} desc="Bóveda + mentorías" />
              </div>
            </div>

            {/* Mejor oportunidad */}
            {topJob && (
              <div style={S.matchCard}>
                <div style={S.matchLabel}>Mayor afinidad detectada</div>
                <div style={S.matchRow}>
                  <div style={{ flex: 1 }}>
                    <div style={S.matchTitle}>{topJob.job.title}</div>
                    <div style={S.matchMeta}>{topJob.job.pay} · {topJob.job.type === 'empresa' ? 'Empresa' : topJob.job.type === 'freelance' ? 'Freelance' : 'Mentoría'}</div>
                  </div>
                  <div style={S.matchScore}>{topJob.success}%</div>
                </div>
              </div>
            )}

            <button onClick={handleComplete} style={S.btnPrimary}>
              Entrar al ecosistema
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Extractores de texto para PDF y Word (básicos, sin dependencias)
// ───────────────────────────────────────────────────────────────────────

async function extractTextFromPDF(buffer: ArrayBuffer): Promise<string> {
  // Extracción básica de texto desde PDF sin librería externa.
  // Busca streams de texto entre paréntesis y operadores Tj/TJ.
  const bytes = new Uint8Array(buffer);
  const raw = new TextDecoder('latin1').decode(bytes);

  const textChunks: string[] = [];

  // Buscar texto entre paréntesis que precede a Tj o TJ
  const regex = /\(([^)]*)\)\s*T[jJ]/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(raw)) !== null) {
    const chunk = match[1]
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\\\/g, '\\');
    if (chunk.trim()) textChunks.push(chunk);
  }

  // También buscar texto en arrays TJ: [(text) num (text) ...]
  const tjArrayRegex = /\[([^\]]*)\]\s*TJ/g;
  while ((match = tjArrayRegex.exec(raw)) !== null) {
    const inner = match[1];
    const partRegex = /\(([^)]*)\)/g;
    let part: RegExpExecArray | null;
    while ((part = partRegex.exec(inner)) !== null) {
      const chunk = part[1]
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\\\\/g, '\\');
      if (chunk.trim()) textChunks.push(chunk);
    }
  }

  return textChunks.join(' ').replace(/\s+/g, ' ').trim();
}

async function extractTextFromDocx(buffer: ArrayBuffer): Promise<string> {
  // .docx es un ZIP con document.xml adentro.
  // Descompresión mínima sin dependencias externas.
  try {
    const bytes = new Uint8Array(buffer);
    // Buscar el contenido XML directamente (simplificado)
    const raw = new TextDecoder('utf-8', { fatal: false }).decode(bytes);

    // Buscar patrones de texto en el XML del documento
    const textParts: string[] = [];

    // Buscar <w:t> tags (contenido de texto en Word XML)
    const wtRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let match: RegExpExecArray | null;
    while ((match = wtRegex.exec(raw)) !== null) {
      if (match[1].trim()) textParts.push(match[1]);
    }

    if (textParts.length > 0) {
      return textParts.join(' ').replace(/\s+/g, ' ').trim();
    }

    // Fallback: extraer cualquier texto legible entre tags XML
    const cleaned = raw
      .replace(/<[^>]+>/g, ' ')
      .replace(/[^\x20-\x7E\xA0-\xFF\u0100-\u024F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Solo devolver si parece texto real (más de 50 chars de texto legible)
    if (cleaned.length > 50) {
      return cleaned.slice(0, 8000);
    }

    return '';
  } catch {
    return '';
  }
}

// ───────────────────────────────────────────────────────────────────────
// Componente auxiliar: fila de eje
// ───────────────────────────────────────────────────────────────────────

function AxisRow({ label, value, desc }: { label: string; value: number; desc: string }) {
  return (
    <div style={S.axisRow}>
      <div style={S.axisInfo}>
        <span style={S.axisLabel}>{label}</span>
        <span style={S.axisDesc}>{desc}</span>
      </div>
      <div style={S.axisBarWrap}>
        <div style={{ ...S.axisFill, width: `${value}%` }} />
      </div>
      <span style={S.axisValue}>{value}</span>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Estilos: diseño profesional, sobrio, sin gamificación
// ───────────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 40,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    background: '#030508',
    overflowY: 'auto',
    padding: `max(28px, env(safe-area-inset-top, 0px)) 20px 30px`,
  },
  container: {
    width: '100%',
    maxWidth: 420,
    margin: 'auto 0',
  },
  step: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    width: '100%',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  logoMark: {
    width: 36,
    height: 36,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: FONT.display,
    fontSize: 18,
    fontWeight: 700,
    color: '#c8d8f0',
    background: 'linear-gradient(140deg, #1a2a44, #0f1a2e)',
    border: '1px solid rgba(100,140,200,0.15)',
  },
  logoText: {
    fontFamily: FONT.display,
    fontSize: 18,
    fontWeight: 700,
    color: '#c8d8f0',
    letterSpacing: -0.3,
  },
  h1: {
    fontFamily: FONT.display,
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: -0.4,
    color: '#dce4f0',
    maxWidth: 340,
    textAlign: 'center',
    margin: 0,
  },
  p: {
    fontFamily: FONT.display,
    fontSize: 14,
    lineHeight: 1.6,
    color: '#6a7a94',
    maxWidth: 360,
    textAlign: 'center',
    margin: 0,
  },
  dropZone: {
    width: '100%',
    padding: '28px 20px',
    borderRadius: RADIUS.lg,
    border: '1.5px dashed rgba(90,112,144,0.35)',
    background: 'rgba(10,16,28,0.6)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
    transition: 'border-color 0.2s',
  },
  dropTitle: {
    fontFamily: FONT.display,
    fontSize: 15,
    fontWeight: 600,
    color: '#8a9ab4',
  },
  dropSub: {
    fontFamily: FONT.mono,
    fontSize: 11,
    color: '#4a5a70',
  },
  separator: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    margin: '4px 0',
  },
  sepLine: {
    flex: 1,
    height: 1,
    background: 'rgba(90,112,144,0.15)',
  },
  sepText: {
    fontFamily: FONT.mono,
    fontSize: 10.5,
    color: '#4a5a70',
    whiteSpace: 'nowrap',
  },
  textarea: {
    width: '100%',
    minHeight: 100,
    maxHeight: 160,
    borderRadius: RADIUS.md,
    border: '1px solid rgba(90,112,144,0.2)',
    background: 'rgba(8,12,22,0.8)',
    color: '#c0cce0',
    fontFamily: FONT.display,
    fontSize: 13.5,
    padding: 14,
    outline: 'none',
    resize: 'none' as const,
    lineHeight: 1.55,
  },
  note: {
    fontFamily: FONT.mono,
    fontSize: 11.5,
    width: '100%',
    textAlign: 'left',
  },
  btnPrimary: {
    width: '100%',
    padding: '14px 24px',
    borderRadius: 12,
    border: 'none',
    cursor: 'pointer',
    fontFamily: FONT.display,
    fontSize: 15,
    fontWeight: 600,
    color: '#fff',
    background: 'linear-gradient(135deg, #1a4070, #1a2a50)',
    boxShadow: '0 4px 14px rgba(26,64,112,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  linkBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontFamily: FONT.mono,
    fontSize: 11.5,
    color: '#5a7a9a',
    textDecoration: 'underline',
    padding: '8px 0',
  },
  // Paso 2: Resultados
  resultHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 16px',
    borderRadius: 12,
    background: 'rgba(40,90,60,0.12)',
    border: '1px solid rgba(74,158,122,0.2)',
    width: '100%',
  },
  resultTitle: {
    fontFamily: FONT.display,
    fontSize: 14,
    fontWeight: 600,
    color: '#7ac0a0',
  },
  profileCard: {
    width: '100%',
    padding: '16px',
    borderRadius: 14,
    background: 'rgba(8,12,22,0.85)',
    border: '1px solid rgba(90,112,144,0.12)',
  },
  profileRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    background: 'rgba(20,30,50,0.8)',
    border: '1px solid rgba(90,112,144,0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  profileName: {
    fontFamily: FONT.display,
    fontSize: 16,
    fontWeight: 700,
    color: '#d0daf0',
  },
  profileSkills: {
    fontFamily: FONT.mono,
    fontSize: 11.5,
    color: '#6a8aaa',
    marginTop: 3,
  },
  profileYears: {
    fontFamily: FONT.mono,
    fontSize: 10.5,
    color: '#4a6080',
    marginTop: 2,
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
    width: '100%',
  },
  metricCard: {
    padding: '14px 12px',
    borderRadius: 12,
    background: 'rgba(8,12,22,0.85)',
    border: '1px solid rgba(90,112,144,0.1)',
  },
  metricValue: {
    fontFamily: FONT.display,
    fontSize: 28,
    fontWeight: 800,
    color: '#c0d4e8',
    letterSpacing: -0.5,
  },
  metricUnit: {
    fontSize: 14,
    fontWeight: 500,
    color: '#5a7090',
  },
  metricLabel: {
    fontFamily: FONT.mono,
    fontSize: 10,
    color: '#4a6080',
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
    marginTop: 4,
  },
  metricBar: {
    height: 4,
    borderRadius: 3,
    background: 'rgba(255,255,255,0.06)',
    marginTop: 8,
    overflow: 'hidden',
  },
  metricFill: {
    height: '100%',
    borderRadius: 3,
    background: 'linear-gradient(90deg, #2a5080, #1a3a60)',
    transition: 'width 1.2s cubic-bezier(0.2, 0.9, 0.25, 1)',
  },
  axesCard: {
    width: '100%',
    padding: '14px 14px',
    borderRadius: 14,
    background: 'rgba(8,12,22,0.85)',
    border: '1px solid rgba(90,112,144,0.1)',
  },
  axesTitle: {
    fontFamily: FONT.mono,
    fontSize: 10.5,
    color: '#5a7090',
    letterSpacing: 0.4,
    textTransform: 'uppercase' as const,
    marginBottom: 12,
  },
  axesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  axisRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  axisInfo: {
    width: 100,
    flexShrink: 0,
  },
  axisLabel: {
    fontFamily: FONT.display,
    fontSize: 12.5,
    fontWeight: 600,
    color: '#b0c0d8',
    display: 'block',
  },
  axisDesc: {
    fontFamily: FONT.mono,
    fontSize: 9.5,
    color: '#4a6080',
    display: 'block',
  },
  axisBarWrap: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    background: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  axisFill: {
    height: '100%',
    borderRadius: 3,
    background: 'linear-gradient(90deg, #2a5a88, #1a3a5a)',
    transition: 'width 0.8s ease',
  },
  axisValue: {
    fontFamily: FONT.mono,
    fontSize: 11,
    fontWeight: 700,
    color: '#8aa0b8',
    width: 28,
    textAlign: 'right' as const,
  },
  matchCard: {
    width: '100%',
    padding: '14px 14px',
    borderRadius: 14,
    background: 'rgba(12,16,24,0.9)',
    border: '1px solid rgba(90,112,144,0.12)',
  },
  matchLabel: {
    fontFamily: FONT.mono,
    fontSize: 9.5,
    color: '#5a7090',
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    marginBottom: 8,
  },
  formulaCard: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 12,
    background: 'rgba(20,30,50,0.6)',
    border: '1px solid rgba(70,110,160,0.15)',
  },
  formulaTitle: {
    fontFamily: FONT.mono,
    fontSize: 9.5,
    color: '#5a7a9a',
    letterSpacing: 0.4,
    textTransform: 'uppercase' as const,
    marginBottom: 6,
  },
  formulaText: {
    fontFamily: FONT.mono,
    fontSize: 11,
    color: '#8aa8c8',
    lineHeight: 1.5,
  },
  matchRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  matchTitle: {
    fontFamily: FONT.display,
    fontSize: 14,
    fontWeight: 700,
    color: '#c0d0e4',
  },
  matchMeta: {
    fontFamily: FONT.mono,
    fontSize: 11,
    color: '#5a7a94',
    marginTop: 3,
  },
  matchScore: {
    fontFamily: FONT.display,
    fontSize: 22,
    fontWeight: 800,
    color: '#7aaa90',
  },
};
