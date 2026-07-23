// components/omicron/ConvalidaOmicron.tsx
// ═══════════════════════════════════════════════════════════════════════
// ÓMICRON · Convalidación REAL del Gemelo — modal de alto impacto.
//
// Llama a la RPC server-side `convalidar_credencial` (la que SÍ mueve la
// reputación real, sorteando el trigger anti-inflado) para cada nodo:
// CV, Título, Años de experiencia y Aporte a la Bóveda. Tras cada
// convalidación refresca el perfil → los ejes y la reputación suben EN VIVO.
// ═══════════════════════════════════════════════════════════════════════
import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, FileText, GraduationCap, Clock, BookOpen, Check, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../store/AppContext';
import { useToast } from '../shared/Toast';
import { speak } from '../../lib/voiceEngine';
import { analyzeCV, type AnalyzedProfile } from '../../lib/cvAnalyzer';
import { extractCVText } from '../../lib/cvExtract';
import { askCoach } from '../../lib/oraculo';
import { C, FONT, RADIUS } from '../../theme';
import ParticleOrb from './ParticleOrb';

type Kind = 'cv' | 'title' | 'year' | 'vault';

const NODES: { kind: Kind; label: string; hint: string; Icon: typeof FileText; color: string }[] = [
  { kind: 'cv', label: 'Subir CV', hint: 'PDF · Word — suma a tu base', Icon: FileText, color: C.cyan },
  { kind: 'title', label: 'Validar título', hint: 'Grado / certificación', Icon: GraduationCap, color: C.purple },
  { kind: 'year', label: 'Año de experiencia', hint: 'Trayectoria declarada', Icon: Clock, color: C.gold },
  { kind: 'vault', label: 'Aporte a la Bóveda', hint: 'Conocimiento compartido', Icon: BookOpen, color: C.green },
];

const AXES: [string, 'execution' | 'quality' | 'transcendence' | 'foundation', string][] = [
  ['Ejecución', 'execution', C.cyan],
  ['Calidad', 'quality', C.purple],
  ['Trasc.', 'transcendence', C.gold],
  ['Fund.', 'foundation', C.green],
];

export default function ConvalidaOmicron({ onClose, onViewProfile }: { onClose: () => void; onViewProfile?: () => void }) {
  const { profile, gemelo, refreshProfile } = useApp();
  const { toast } = useToast();
  const [busy, setBusy] = useState<Kind | null>(null);
  const [done, setDone] = useState<Kind[]>([]);
  const [dossier, setDossier] = useState<AnalyzedProfile | null>(null);
  const [ai, setAi] = useState<{ loading: boolean; text: string }>({ loading: false, text: '' });
  const [msg, setMsg] = useState('Convalidá tus datos reales: cada uno eleva tu Gemelo al instante.');

  const rep = gemelo ? Math.round(gemelo.overallReputation) : 0;

  const convalidar = async (kind: Kind) => {
    if (busy) return;
    setBusy(kind);
    setMsg('Convalidando con el núcleo…');
    try {
      const { data, error } = await supabase.rpc('convalidar_credencial', { p_kind: kind });
      const res = data as { ok?: boolean; error?: string; reputation?: number } | null;
      if (error || !res?.ok) {
        setMsg(res?.error ? `No se pudo: ${res.error}` : 'No se pudo convalidar. ¿Tu sesión está activa?');
      } else {
        setDone((prev) => (prev.includes(kind) ? prev : [...prev, kind]));
        const label = NODES.find((n) => n.kind === kind)?.label ?? 'Dato';
        const nuevoRep = Math.round(res.reputation ?? rep);
        setMsg(`${label} convalidado ✓ Tu reputación real subió a ${nuevoRep}.`);
        // Push de confirmación (toast + voz para el CV).
        if (kind === 'cv') {
          toast('CV cargado y convalidado ✓', 'success');
          speak('CV cargado y convalidado. Tu Gemelo subió de nivel.');
        } else {
          toast(`${label} convalidado ✓`, 'success');
        }
        await refreshProfile();
      }
    } catch {
      setMsg('Error inesperado al convalidar.');
    }
    setBusy(null);
  };

  // CV: extrae texto → analiza (skills/seniority) → convalida (reputación) →
  // persiste skills en el perfil → muestra el Dossier de Experticia.
  const handleCV = async (file: File) => {
    if (busy) return;
    setBusy('cv');
    setMsg('Analizando tu CV con Ómicron…');
    try {
      const text = await extractCVText(file);
      const analyzed = analyzeCV(text);
      await supabase.rpc('convalidar_credencial', { p_kind: 'cv' });
      if (profile?.id) {
        try { await supabase.from('profiles').update({ skills: analyzed.labels }).eq('id', profile.id); } catch { /* best-effort */ }
      }
      setDone((prev) => (prev.includes('cv') ? prev : [...prev, 'cv']));
      toast('CV cargado y convalidado ✓', 'success');
      speak(`CV analizado. Tu perfil: ${analyzed.seniorLabel}. Experto en ${analyzed.labels.slice(0, 3).join(', ')}.`);
      await refreshProfile();
      setDossier(analyzed);
      // Análisis personalizado de la IA (coach) — en paralelo, no bloquea el Dossier.
      setAi({ loading: true, text: '' });
      askCoach()
        .then((r) => setAi({ loading: false, text: r.advice || '' }))
        .catch(() => setAi({ loading: false, text: '' }));
    } catch {
      setMsg('No pude analizar el CV. Probá con un PDF de texto o pegá tu experiencia.');
    }
    setBusy(null);
  };

  // ── Dossier de Experticia (alto impacto) tras analizar el CV ───────
  if (dossier) {
    const ARCH: Record<string, string> = { estudiante: 'Aprendiz', junior: 'Junior', mid: 'Mid', senior: 'Senior', lead: 'Lead · Arquitecto', pro: 'Profesional' };
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'flex', flexDirection: 'column', background: 'radial-gradient(130% 100% at 50% 6%, rgba(8,16,34,0.98), #000 70%)' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: `linear-gradient(${C.grid} 1px, transparent 1px), linear-gradient(90deg, ${C.grid} 1px, transparent 1px)`, backgroundSize: '44px 44px', maskImage: 'radial-gradient(circle at 50% 22%, #000, transparent 74%)' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', position: 'relative', zIndex: 2 }}>
          <span style={{ fontFamily: FONT.mono, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: C.gold }}>DOSSIER DE EXPERTICIA</span>
          <button onClick={onClose} aria-label="Cerrar" style={{ width: 36, height: 36, borderRadius: 12, border: `1px solid ${C.line}`, background: C.glass, color: C.ink, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
        </div>

        <div style={{ position: 'relative', zIndex: 2, height: 140, flexShrink: 0 }}>
          <ParticleOrb colorA={[255, 176, 46]} colorB={[92, 200, 255]} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', position: 'relative', zIndex: 2, padding: '4px 20px calc(env(safe-area-inset-bottom, 0px) + 16px)', textAlign: 'center' }}>
          <div style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: 1.4, color: C.mut, textTransform: 'uppercase' }}>Ómicron te reconoce como</div>
          <h2 style={{ margin: '6px 0 4px', fontFamily: FONT.display, fontWeight: 800, fontSize: 26, color: '#fff', letterSpacing: -0.4 }}>{dossier.seniorLabel}</h2>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
            <span style={{ fontFamily: FONT.mono, fontSize: 11, color: C.cyan, padding: '4px 10px', borderRadius: 999, background: C.cyanGhost, border: `1px solid ${C.cyanFaint}` }}>{ARCH[dossier.arch] ?? dossier.arch}</span>
            {dossier.years > 0 && <span style={{ fontFamily: FONT.mono, fontSize: 11, color: C.gold, padding: '4px 10px', borderRadius: 999, background: C.goldFaint, border: `1px solid ${C.goldDim}` }}>{dossier.years} {dossier.years === 1 ? 'año' : 'años'}</span>}
          </div>

          <div style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: 1.2, color: C.mut, textTransform: 'uppercase', marginBottom: 8 }}>Experto en</div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 18 }}>
            {dossier.labels.map((l) => (
              <span key={l} style={{ fontFamily: FONT.display, fontWeight: 600, fontSize: 13, color: '#eaf4ff', padding: '7px 13px', borderRadius: 999, background: `linear-gradient(135deg, ${C.purple}22, ${C.cyan}18)`, border: `1px solid ${C.purpleDim}`, boxShadow: `0 0 14px ${C.purple}33` }}>{l}</span>
            ))}
          </div>

          {gemelo && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 16 }}>
              {([['Ejecución', gemelo.execution, C.cyan], ['Calidad', gemelo.quality, C.purple], ['Trasc.', gemelo.transcendence, C.gold], ['Fund.', gemelo.foundation, C.green]] as [string, number, string][]).map(([lbl, val, col]) => (
                <div key={lbl} style={{ padding: '8px', borderRadius: 12, background: C.glass, border: `1px solid ${C.line}` }}>
                  <div style={{ fontFamily: FONT.mono, fontSize: 8.5, textTransform: 'uppercase', color: C.mut }}>{lbl}</div>
                  <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 16, color: col }}>{Math.round(val)}</div>
                </div>
              ))}
            </div>
          )}

          {/* Análisis personalizado de la IA (coach) */}
          {(ai.loading || ai.text) && (
            <div style={{ textAlign: 'left', borderRadius: RADIUS.lg, padding: '13px 14px', marginTop: 4, background: `linear-gradient(135deg, ${C.cyan}14, rgba(255,255,255,0.03))`, border: `1px solid ${C.cyanFaint}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                <Sparkles size={14} color={C.cyan} />
                <span style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: C.cyan }}>Análisis de Ómicron</span>
              </div>
              {ai.loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.mut, fontFamily: FONT.body, fontSize: 13 }}>
                  <Loader2 size={14} style={{ animation: 'cp-spin 0.8s linear infinite' }} />
                  Ómicron está leyendo tu perfil…
                </div>
              ) : (
                <p style={{ margin: 0, fontFamily: FONT.body, fontSize: 13.5, lineHeight: 1.5, color: C.ink, whiteSpace: 'pre-wrap' }}>{ai.text}</p>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, padding: '0 18px calc(env(safe-area-inset-bottom, 0px) + 16px)', position: 'relative', zIndex: 2 }}>
          <button onClick={() => onViewProfile?.()} style={{ flex: 1, padding: '13px 0', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#5cc8ff,#5e5ce6)', color: '#fff', fontFamily: FONT.display, fontWeight: 700, fontSize: 15 }}>Ver mi perfil completo</button>
          <button onClick={onClose} style={{ padding: '13px 20px', borderRadius: 14, cursor: 'pointer', background: C.glass, border: `1px solid ${C.line}`, color: C.ink, fontFamily: FONT.display, fontWeight: 700, fontSize: 15 }}>Listo</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 90, display: 'flex', flexDirection: 'column',
      background: 'radial-gradient(130% 100% at 50% 10%, rgba(8,14,30,0.98), rgba(2,3,10,0.99) 60%, #000 100%)',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
    }}>
      {/* Rejilla */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: `linear-gradient(${C.grid} 1px, transparent 1px), linear-gradient(90deg, ${C.grid} 1px, transparent 1px)`, backgroundSize: '44px 44px', maskImage: 'radial-gradient(circle at 50% 26%, #000, transparent 74%)' }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', position: 'relative', zIndex: 2 }}>
        <span style={{ fontFamily: FONT.mono, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: C.ink }}>CONVALIDAR GEMELO</span>
        <button onClick={onClose} aria-label="Cerrar" style={{ width: 36, height: 36, borderRadius: 12, border: `1px solid ${C.line}`, background: C.glass, color: C.ink, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={18} />
        </button>
      </div>

      {/* Orbe + reputación */}
      <div style={{ position: 'relative', zIndex: 2, height: 150, flexShrink: 0 }}>
        <ParticleOrb />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <motion.div key={rep} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: 38, color: '#fff', textShadow: '0 0 24px rgba(92,200,255,0.6)' }}>
            {rep}
          </motion.div>
          <span style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: 2, color: C.mut, textTransform: 'uppercase' }}>Reputación real</span>
        </div>
      </div>

      {/* Mensaje */}
      <p style={{ position: 'relative', zIndex: 2, textAlign: 'center', margin: '6px 20px 10px', fontFamily: FONT.body, fontSize: 13.5, lineHeight: 1.5, color: C.ink, minHeight: 40 }}>{msg}</p>

      {/* Ejes en vivo */}
      {gemelo && (
        <div style={{ position: 'relative', zIndex: 2, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, padding: '0 18px 12px' }}>
          {AXES.map(([lbl, key, col]) => (
            <div key={key} style={{ padding: '7px 8px', borderRadius: 12, background: C.glass, border: `1px solid ${C.line}` }}>
              <div style={{ fontFamily: FONT.mono, fontSize: 8.5, letterSpacing: 0.5, textTransform: 'uppercase', color: C.mut }}>{lbl}</div>
              <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 15, color: col }}>{Math.round(gemelo[key])}</div>
              <div style={{ height: 3, borderRadius: 2, marginTop: 3, background: 'rgba(255,255,255,0.08)' }}>
                <div style={{ height: '100%', width: `${Math.round(gemelo[key])}%`, borderRadius: 2, background: col, transition: 'width .5s ease' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Nodos de convalidación */}
      <div style={{ flex: 1, overflowY: 'auto', position: 'relative', zIndex: 2, padding: '4px 18px calc(env(safe-area-inset-bottom, 0px) + 20px)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignContent: 'start' }}>
        {NODES.map(({ kind, label, hint, Icon, color }) => {
          const isDone = done.includes(kind);
          const isBusy = busy === kind;
          const content = (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Icon size={19} color={isDone ? C.green : color} />
                {isBusy ? <Loader2 size={15} color={color} style={{ animation: 'cp-spin 0.8s linear infinite' }} />
                  : isDone ? <Check size={15} color={C.green} /> : null}
              </div>
              <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 14, color: '#fff', marginTop: 8 }}>{label}</span>
              <span style={{ fontFamily: FONT.mono, fontSize: 9.5, color: isDone ? C.green : 'rgba(234,240,251,0.6)' }}>
                {isDone ? '✓ convalidado' : hint}
              </span>
            </>
          );
          const style: React.CSSProperties = {
            display: 'flex', flexDirection: 'column', textAlign: 'left', gap: 2,
            padding: '13px 13px', borderRadius: RADIUS.lg, cursor: busy ? 'default' : 'pointer',
            background: `linear-gradient(135deg, ${isDone ? C.green : color}16, rgba(255,255,255,0.03))`,
            border: `1px solid ${isDone ? C.green : color}44`, opacity: busy && !isBusy ? 0.6 : 1,
          };
          // El CV usa input de archivo; el resto son botones directos.
          if (kind === 'cv') {
            return (
              <label key={kind} style={style}>
                <input type="file" accept=".pdf,.doc,.docx,.txt,image/*" style={{ display: 'none' }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleCV(f); e.currentTarget.value = ''; }} />
                {content}
              </label>
            );
          }
          return (
            <button key={kind} onClick={() => void convalidar(kind)} disabled={!!busy} style={style}>
              {content}
            </button>
          );
        })}
      </div>
    </div>
  );
}
