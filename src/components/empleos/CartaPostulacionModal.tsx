// components/empleos/CartaPostulacionModal.tsx
// ═══════════════════════════════════════════════════════════════════════
// Modal "Postula con tu Gemelo" — genera carta IA + copia + abre link.
// Flujo: usuario toca Postular → genera carta → preview → copiar/abrir.
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { X, Copy, ExternalLink, Sparkles, CheckCircle2, FileText } from 'lucide-react';
import { C as T, FONT as TF } from '../../theme';
import { useApp } from '../../store/AppContext';
import { generarCartaPostulacion, type CartaResult } from '../../lib/cartaPostulacion';

const C = {
  bg: T.bg, panel: 'rgba(8,16,38,0.92)',
  cyan: T.cyan, cyanHi: '#8bd4ff', green: T.green, gold: T.gold,
  ink: T.ink, muted: T.mut, line: T.line,
} as const;
const FM = TF.mono;
const FR = TF.display;

interface Props {
  job: {
    id: string;
    title: string;
    description: string;
    company_name?: string;
    tags: string[];
    external_url?: string | null;
  };
  onClose: () => void;
  onApplyDone: () => void;
}

export function CartaPostulacionModal({ job, onClose, onApplyDone }: Props) {
  const { profile } = useApp();
  const [state, setState] = useState<'generating' | 'ready' | 'error'>('generating');
  const [carta, setCarta] = useState<CartaResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!profile) return;
    void generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generate() {
    if (!profile) return;
    setState('generating');
    try {
      const result = await generarCartaPostulacion({
        nombreUsuario: profile.username ?? 'Profesional',
        skills: profile.skills ?? [],
        yearsExp: profile.cv_years_experience ?? 0,
        cvSummary: profile.cv_summary ?? '',
        tituloEmpleo: job.title,
        descripcionEmpleo: job.description,
        empresa: job.company_name ?? 'la empresa',
        tags: job.tags ?? [],
      });
      setCarta(result);
      setState('ready');
    } catch {
      setState('error');
    }
  }

  async function copyToClipboard() {
    if (!carta) return;
    try {
      await navigator.clipboard.writeText(carta.carta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = carta.carta;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function openAndApply() {
    if (job.external_url) {
      window.open(job.external_url, '_blank', 'noopener');
    }
    onApplyDone();
    onClose();
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={16} style={{ color: C.gold }} />
            <span style={{ fontFamily: FM, fontSize: 11, color: C.cyanHi, letterSpacing: 1.5 }}>
              POSTULA CON TU GEMELO
            </span>
          </div>
          <button onClick={onClose} style={styles.closeBtn}><X size={18} /></button>
        </div>

        {/* Titulo del empleo */}
        <div style={{ fontFamily: FR, fontSize: 15, color: C.ink, fontWeight: 700, margin: '12px 0 4px' }}>
          {job.title}
        </div>
        <div style={{ fontFamily: FM, fontSize: 10, color: C.muted, marginBottom: 16 }}>
          {job.company_name ?? 'Empresa'} · {job.tags?.slice(0, 3).join(', ')}
        </div>

        {/* Estado: generando */}
        {state === 'generating' && (
          <div style={styles.genBox}>
            <div style={styles.spinner} />
            <span style={{ fontFamily: FM, fontSize: 11, color: C.cyan }}>
              Generando carta personalizada...
            </span>
            <span style={{ fontFamily: FM, fontSize: 9, color: C.muted, marginTop: 4 }}>
              Analizando tu perfil vs. requisitos del empleo
            </span>
          </div>
        )}

        {/* Estado: error */}
        {state === 'error' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p style={{ fontFamily: FM, fontSize: 11, color: '#ff5c7a', marginBottom: 12 }}>
              No se pudo generar la carta. Puedes postular directamente.
            </p>
            <button onClick={openAndApply} style={styles.primaryBtn}>
              <ExternalLink size={13} /> Postular sin carta
            </button>
          </div>
        )}

        {/* Estado: listo */}
        {state === 'ready' && carta && (
          <>
            {/* Puntos fuertes */}
            {carta.puntosFuertes.length > 0 && (
              <div style={styles.puntosBox}>
                <span style={{ fontFamily: FM, fontSize: 9, color: C.green, letterSpacing: 1 }}>
                  ✓ TUS PUNTOS FUERTES PARA ESTE EMPLEO
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {carta.puntosFuertes.map((p, i) => (
                    <span key={i} style={styles.tag}>{p}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Carta */}
            <div style={styles.cartaBox}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontFamily: FM, fontSize: 9, color: C.muted, letterSpacing: 1 }}>
                  <FileText size={10} style={{ verticalAlign: 'middle' }} /> CARTA GENERADA
                </span>
                <button onClick={copyToClipboard} style={styles.copyBtn}>
                  {copied ? <><CheckCircle2 size={11} /> Copiada</> : <><Copy size={11} /> Copiar</>}
                </button>
              </div>
              <div style={styles.cartaText}>
                {carta.carta}
              </div>
            </div>

            {/* Gaps (si hay) */}
            {carta.gapsMencionados.length > 0 && (
              <div style={{ fontFamily: FM, fontSize: 9, color: C.muted, margin: '8px 0', lineHeight: 1.4 }}>
                💡 Áreas a desarrollar: {carta.gapsMencionados.join(', ')} — Ómicron puede ayudarte.
              </div>
            )}

            {/* Acciones */}
            <div style={styles.actions}>
              {job.external_url ? (
                <button onClick={openAndApply} style={styles.primaryBtn}>
                  <ExternalLink size={13} /> Abrir postulación
                </button>
              ) : (
                <button onClick={() => { onApplyDone(); onClose(); }} style={styles.primaryBtn}>
                  <CheckCircle2 size={13} /> Marcar como aplicado
                </button>
              )}
              <p style={{ fontFamily: FM, fontSize: 9, color: C.muted, textAlign: 'center', marginTop: 8 }}>
                {job.external_url ? 'La carta ya está en tu portapapeles. Pégala en el formulario.' : 'Usa la carta copiada al postular.'}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'rgba(0,2,6,0.85)', backdropFilter: 'blur(6px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16,
  },
  modal: {
    position: 'relative', width: '100%', maxWidth: 420, maxHeight: '85vh',
    overflowY: 'auto', background: C.panel,
    border: `1px solid ${C.line}`, borderRadius: 18,
    padding: '20px', boxShadow: '0 12px 48px rgba(0,0,0,0.7)',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  closeBtn: {
    background: 'none', border: 'none', color: C.muted, cursor: 'pointer', display: 'flex',
  },
  genBox: {
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
    padding: '32px 20px', gap: 10,
  },
  spinner: {
    width: 28, height: 28, borderRadius: '50%',
    border: `2px solid ${C.line}`, borderTopColor: C.cyan,
    animation: 'spin 1s linear infinite',
  },
  puntosBox: {
    background: 'rgba(63, 208, 201, 0.06)',
    border: `1px solid rgba(63, 208, 201, 0.2)`,
    borderRadius: 10, padding: '10px 12px', marginBottom: 12,
  },
  tag: {
    display: 'inline-flex', padding: '3px 8px', borderRadius: 4,
    background: 'rgba(92, 200, 255, 0.08)', border: `1px solid rgba(92, 200, 255, 0.2)`,
    fontFamily: FM, fontSize: 10, color: C.cyanHi,
  },
  cartaBox: {
    background: 'rgba(0,2,6,0.5)', border: `1px solid ${C.line}`,
    borderRadius: 10, padding: '12px', maxHeight: 220, overflowY: 'auto' as const,
  },
  cartaText: {
    fontFamily: FR, fontSize: 12.5, color: '#d4e6f4', lineHeight: 1.55,
    whiteSpace: 'pre-wrap' as const,
  },
  copyBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    background: 'rgba(92, 200, 255, 0.1)', border: `1px solid rgba(92, 200, 255, 0.3)`,
    borderRadius: 5, padding: '4px 9px', cursor: 'pointer',
    fontFamily: FM, fontSize: 9, color: C.cyanHi,
  },
  actions: {
    marginTop: 16,
  },
  primaryBtn: {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: '13px', borderRadius: 10, cursor: 'pointer',
    background: `linear-gradient(135deg, ${C.cyan}, #008b9e)`,
    border: 'none', color: '#04121f',
    fontFamily: FM, fontSize: 12, fontWeight: 700, letterSpacing: 1,
    boxShadow: '0 0 20px rgba(92, 200, 255, 0.3)',
  },
};
