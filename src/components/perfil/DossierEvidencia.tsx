// components/perfil/DossierEvidencia.tsx
// Dossier de Evidencia — la prueba "imposible de falsear" detras del Gemelo.
// Lista las competencias validadas por el Examinador IA (Actas de Evidencia),
// con el desglose de los 4 ejes. Es lo que una empresa puede auditar.

import { useEffect, useState, useCallback } from 'react';
import { ShieldCheck, FileCheck2, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../store/AppContext';
import { C, FONT, RADIUS } from '../../theme';
import type { ActaEvidencia } from '../../types';

type ActaRow = ActaEvidencia & { nodo?: { title: string } | null };

const EJES: Array<{ key: keyof Pick<ActaEvidencia, 'ejecucion' | 'calidad' | 'trascendencia' | 'fundamento'>; label: string }> = [
  { key: 'ejecucion', label: 'EJE' },
  { key: 'calidad', label: 'CAL' },
  { key: 'trascendencia', label: 'TRA' },
  { key: 'fundamento', label: 'FUN' },
];

export function DossierEvidencia() {
  const { profile } = useApp();
  const [actas, setActas] = useState<ActaRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('actas_evidencia')
      .select('*, nodo:skill_tree_nodes(title)')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });
    setActas((data as ActaRow[]) ?? []);
    setLoading(false);
  }, [profile?.id]);

  useEffect(() => { load(); }, [load]);

  const validadas = actas.filter(a => a.veredicto === 'APROBADO').length;

  return (
    <div style={{
      position: 'relative', borderRadius: RADIUS.xl, padding: 16, marginBottom: 14,
      background: 'rgba(12,20,38,0.95)', border: '1px solid rgba(0,240,255,0.14)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4 }}>
        <FileCheck2 size={18} style={{ color: C.cyan }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 15, color: '#eaf4ff' }}>Dossier de Evidencia</div>
          <div style={{ fontFamily: FONT.mono, fontSize: 9, color: C.cyanDim, letterSpacing: 0.5 }}>Validado por IA · imposible de falsear</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 20, color: C.green, lineHeight: 1 }}>{validadas}</div>
          <div style={{ fontFamily: FONT.mono, fontSize: 8, color: C.cyanDim }}>VALIDADAS</div>
        </div>
      </div>

      <p style={{ margin: '8px 0 14px', fontFamily: FONT.body, fontSize: 12, color: C.cyanDim, lineHeight: 1.45 }}>
        Cada acta es una prueba auditable de una competencia, evaluada por la IA en 4 ejes. Esto es lo que respalda tu Gemelo.
      </p>

      {loading ? (
        <p style={{ fontFamily: FONT.mono, fontSize: 11, color: C.cyanDim, textAlign: 'center', padding: 16 }}>Cargando dossier...</p>
      ) : actas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '18px 12px', borderRadius: RADIUS.lg, background: 'rgba(0,240,255,0.04)', border: '1px dashed rgba(0,240,255,0.18)' }}>
          <ShieldCheck size={24} style={{ color: C.cyanDim }} />
          <p style={{ margin: '8px 0 0', fontFamily: FONT.body, fontSize: 13, color: '#cfe6ff' }}>Aún no validas competencias.</p>
          <p style={{ margin: '4px 0 0', fontFamily: FONT.mono, fontSize: 10, color: C.cyanDim }}>Ve a Aprender → un nodo → "Rendir Examen IA".</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {actas.map(a => {
            const ok = a.veredicto === 'APROBADO';
            const accent = ok ? C.green : C.red;
            return (
              <div key={a.id} style={{ borderRadius: RADIUS.lg, padding: 12, background: 'rgba(0,240,255,0.04)', border: `1px solid ${ok ? 'rgba(57,255,20,0.30)' : 'rgba(255,80,102,0.30)'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ flex: 1, minWidth: 0, fontFamily: FONT.display, fontWeight: 700, fontSize: 13.5, color: '#eaf4ff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {a.nodo?.title ?? 'Competencia'}
                  </span>
                  <span style={{ padding: '2px 8px', borderRadius: 20, background: `${accent}1f`, border: `1px solid ${accent}55`, fontFamily: FONT.mono, fontSize: 9, fontWeight: 700, color: accent, letterSpacing: 0.5, flexShrink: 0 }}>
                    {ok ? 'VALIDADO' : 'PENDIENTE'} {a.puntaje_global}%
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: a.resumen ? 8 : 0 }}>
                  {EJES.map(e => (
                    <div key={e.key} style={{ textAlign: 'center', padding: '5px 0', borderRadius: 6, background: 'rgba(0,240,255,0.05)' }}>
                      <div style={{ fontFamily: FONT.mono, fontSize: 8, color: C.cyanDim, letterSpacing: 0.5 }}>{e.label}</div>
                      <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 14, color: C.cyan }}>{a[e.key] as number}</div>
                    </div>
                  ))}
                </div>

                {a.resumen && (
                  <p style={{ margin: '0 0 6px', fontFamily: FONT.body, fontSize: 12, color: '#cfe6ff', lineHeight: 1.45 }}>{a.resumen}</p>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: FONT.mono, fontSize: 8.5, color: C.cyanDim }}>
                  <ShieldCheck size={10} style={{ color: accent }} /> Validado por {a.validador}
                  <Clock size={10} style={{ marginLeft: 6 }} /> {new Date(a.created_at).toLocaleDateString('es-CL')}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
