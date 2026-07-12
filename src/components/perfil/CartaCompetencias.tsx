// components/perfil/CartaCompetencias.tsx
// Carta de Competencias IA — resumen profesional verificable (generado por la
// Edge Function `carta-ia` a partir del Gemelo + las Actas de Evidencia).
// Es "lo que lee una empresa": evidencia, no auto-declaracion.

import { useState, useCallback } from 'react';
import { FileText, Sparkles, Loader2, Copy, Check, RotateCcw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { C, FONT, RADIUS } from '../../theme';
import { usePremium, PremiumLock, PremiumBadge } from '../shared/Premium';

async function serverError(error: unknown, data: unknown, fallback: string): Promise<string> {
  const d = data as { error?: string; detail?: string } | null;
  if (d?.error) return d.detail ? `${d.error} — ${d.detail}` : d.error;
  const ctx = (error as { context?: Response } | null)?.context;
  if (ctx && typeof ctx.json === 'function') {
    try { const b = await ctx.json(); if (b?.error) return b.detail ? `${b.error} — ${b.detail}` : b.error; } catch { /* */ }
  }
  return (error as { message?: string } | null)?.message || fallback;
}

export function CartaCompetencias() {
  const { isPremium } = usePremium();
  const [locked, setLocked] = useState(false);
  const [carta, setCarta] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generar = useCallback(async () => {
    if (!isPremium) { setLocked(true); return; }
    setLoading(true); setErr(null);
    try {
      const { data, error } = await supabase.functions.invoke('carta-ia', { body: {} });
      const d = data as { carta?: string; error?: string };
      if (error || d?.error || !d?.carta) {
        setErr(await serverError(error, data, 'No se pudo generar la carta. ¿Está desplegada la función "carta-ia"?'));
        return;
      }
      setCarta(d.carta);
    } catch {
      setErr('Error de conexión con la Carta IA.');
    } finally {
      setLoading(false);
    }
  }, [isPremium]);

  const copiar = useCallback(() => {
    if (!carta) return;
    navigator.clipboard?.writeText(carta);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [carta]);

  return (
    <div style={{
      position: 'relative', borderRadius: RADIUS.xl, padding: 16, marginBottom: 14,
      background: 'rgba(12,20,38,0.95)', border: '1px solid rgba(92, 200, 255,0.14)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
        <FileText size={18} style={{ color: C.cyan }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 15, color: '#eaf4ff' }}>Carta de Competencias</div>
          <div style={{ fontFamily: FONT.mono, fontSize: 9, color: C.cyanDim, letterSpacing: 0.5 }}>Resumen profesional · generado por IA desde tu evidencia</div>
        </div>
      </div>

      {!carta && !loading && !err && (
        <>
          <p style={{ margin: '0 0 12px', fontFamily: FONT.body, fontSize: 12, color: C.cyanDim, lineHeight: 1.45 }}>
            La IA lee tu Gemelo y tus actas validadas y redacta un resumen que una empresa puede leer de un vistazo — respaldado por evidencia, no auto-declarado.
          </p>
          <button onClick={generar} style={btn(C.cyan)}>
            <Sparkles size={15} /> Generar mi Carta de Competencias
            {!isPremium && <PremiumBadge />}
          </button>
        </>
      )}

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 4px', fontFamily: FONT.mono, fontSize: 12, color: C.cyanDim }}>
          <Loader2 size={16} className="animate-spin" style={{ color: C.cyan }} /> Redactando tu carta con la evidencia...
        </div>
      )}

      {err && !loading && (
        <div style={{ padding: 12, borderRadius: RADIUS.lg, background: 'rgba(255, 92, 122,0.08)', border: '1px solid rgba(255, 92, 122,0.3)' }}>
          <p style={{ margin: '0 0 10px', fontFamily: FONT.body, fontSize: 12.5, color: '#ffb3bf', lineHeight: 1.4 }}>{err}</p>
          <button onClick={generar} style={btn(C.cyan)}><RotateCcw size={14} /> Reintentar</button>
        </div>
      )}

      {carta && !loading && (
        <div>
          <div style={{ padding: 14, borderRadius: RADIUS.lg, background: 'rgba(92, 200, 255,0.05)', border: '1px solid rgba(92, 200, 255,0.18)' }}>
            <p style={{ margin: 0, fontFamily: FONT.body, fontSize: 14, color: '#eaf4ff', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{carta}</p>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <button onClick={copiar} style={{ ...btnGhost, flex: 1 }}>
              {copied ? <><Check size={14} style={{ color: C.green }} /> Copiado</> : <><Copy size={14} /> Copiar</>}
            </button>
            <button onClick={generar} style={{ ...btnGhost, flex: 1 }}><RotateCcw size={14} /> Regenerar</button>
          </div>
          <p style={{ margin: '8px 0 0', fontFamily: FONT.mono, fontSize: 8.5, color: C.cyanDim, textAlign: 'center' }}>
            Generada por IA a partir de tu evidencia verificada.
          </p>
        </div>
      )}
      {locked && <PremiumLock feature="La Carta de Competencias" onClose={() => setLocked(false)} />}
    </div>
  );
}

function btn(color: string): React.CSSProperties {
  return { width: '100%', padding: '11px 0', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: FONT.display, fontWeight: 700, fontSize: 14, color: '#000206', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: `0 0 14px ${color}44` };
}
const btnGhost: React.CSSProperties = { padding: '10px 0', borderRadius: 9, background: 'rgba(92, 200, 255,0.08)', border: '1px solid rgba(92, 200, 255,0.25)', color: C.cyan, cursor: 'pointer', fontFamily: FONT.display, fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 };
