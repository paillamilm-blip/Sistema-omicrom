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
import { X, FileText, GraduationCap, Clock, BookOpen, Check, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../store/AppContext';
import { useToast } from '../shared/Toast';
import { speak } from '../../lib/voiceEngine';
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

export default function ConvalidaOmicron({ onClose }: { onClose: () => void }) {
  const { gemelo, refreshProfile } = useApp();
  const { toast } = useToast();
  const [busy, setBusy] = useState<Kind | null>(null);
  const [done, setDone] = useState<Kind[]>([]);
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
                  onChange={(e) => { if (e.target.files?.[0]) void convalidar('cv'); e.currentTarget.value = ''; }} />
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
