// src/components/empleos/RutaCarrera.tsx
// "Ruta de Carrera" — si NO encuentras trabajo, el sistema te dice CÓMO mejorar:
// qué estudiar para calificar a mejores puestos, y qué pivote de carrera es el
// más viable con tus fortalezas actuales.
//
// Analiza tus 4 ejes reales (useGemeloProfile, unificado con Supabase) contra
// un catálogo de destinos de carrera. Para cada destino calcula tu "readiness",
// detecta tu mayor brecha y te da una acción concreta que navega al hub donde
// cerrarla (Academia / Empleos / Bóveda). 100% frontend, sin dependencias nuevas.
import { useMemo } from 'react';
import { GraduationCap, Compass, ArrowUpRight, Target } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { useGemeloProfile } from '../../hooks/useGemeloProfile';
import { C, FONT, RADIUS } from '../../theme';
import type { TabId } from '../../types';

type EjeKey = 'execution' | 'quality' | 'foundation' | 'transcendence';

const EJE: Record<EjeKey, { label: string; study: string; tab: TabId; color: string }> = {
  execution:     { label: 'Ejecución',     study: 'Toma contratos cortos y retos para ganar velocidad de entrega.', tab: 'empleos',  color: '#00D6E6' },
  quality:       { label: 'Calidad',       study: 'Cierra contratos pidiendo reseña de 5★: tu calidad sube.',        tab: 'empleos',  color: '#0a8ba3' },
  foundation:    { label: 'Fundamento',    study: 'Estudia y certifícate en la Academia (bases y arquitectura).',    tab: 'academia', color: '#2FE014' },
  transcendence: { label: 'Trascendencia', study: 'Publica en la Bóveda o mentorea a un nodo junior.',                tab: 'vault',    color: '#E08A00' },
};

interface Track {
  id: string;
  name: string;
  area: string;
  target: Record<EjeKey, number>;
}

// Catálogo de destinos de carrera (áreas distintas → permite ver pivotes).
const TRACKS: Track[] = [
  { id: 'frontend',  name: 'Frontend Senior',        area: 'Desarrollo', target: { execution: 75, quality: 75, foundation: 70, transcendence: 45 } },
  { id: 'fullstack', name: 'Full-Stack Engineer',    area: 'Desarrollo', target: { execution: 72, quality: 70, foundation: 78, transcendence: 45 } },
  { id: 'techlead',  name: 'Tech Lead / Arquitecto', area: 'Liderazgo',  target: { execution: 80, quality: 80, foundation: 85, transcendence: 70 } },
  { id: 'creative',  name: 'Creative Technologist',  area: 'Producto',   target: { execution: 70, quality: 65, foundation: 60, transcendence: 78 } },
  { id: 'data',      name: 'Data / IA',              area: 'Datos',      target: { execution: 65, quality: 72, foundation: 85, transcendence: 55 } },
  { id: 'mentor',    name: 'Mentor / Docente',       area: 'Enseñanza',  target: { execution: 58, quality: 70, foundation: 80, transcendence: 88 } },
];

const KEYS: EjeKey[] = ['execution', 'quality', 'foundation', 'transcendence'];

interface Analyzed {
  track: Track;
  readiness: number;
  gapEje: EjeKey | null;
  gapAmount: number;
}

function analyze(track: Track, ejes: Record<EjeKey, number>): Analyzed {
  let sum = 0;
  let gapEje: EjeKey | null = null;
  let worstDef = 0;
  KEYS.forEach((k) => {
    const u = ejes[k] ?? 0;
    const t = track.target[k];
    sum += Math.min(1, t > 0 ? u / t : 1);
    const def = t - u;
    if (def > worstDef) { worstDef = def; gapEje = k; }
  });
  return { track, readiness: Math.round((sum / KEYS.length) * 100), gapEje, gapAmount: Math.max(0, Math.round(worstDef)) };
}

export function RutaCarrera() {
  const { setActiveTab } = useApp();
  const { profile } = useGemeloProfile();

  const ejes: Record<EjeKey, number> = {
    execution: profile.axes.execution,
    quality: profile.axes.quality,
    foundation: profile.axes.foundation,
    transcendence: profile.axes.transcendence,
  };

  const { ranked, strongest } = useMemo(() => {
    const r = TRACKS.map((t) => analyze(t, ejes)).sort((a, b) => b.readiness - a.readiness);
    let strong: EjeKey = 'execution';
    KEYS.forEach((k) => { if ((ejes[k] ?? 0) > (ejes[strong] ?? 0)) strong = k; });
    return { ranked: r, strongest: strong };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ejes.execution, ejes.quality, ejes.foundation, ejes.transcendence]);

  const top = ranked[0];

  return (
    <div style={{ margin: '14px 0', padding: 16, borderRadius: RADIUS.xl, background: 'rgba(12,20,38,0.95)', border: '1px solid rgba(0,214,230,0.14)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Compass size={16} style={{ color: C.gold }} />
        <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 15, color: '#eaf4ff' }}>Ruta de Carrera</span>
      </div>
      <p style={{ margin: '0 0 12px', fontFamily: FONT.body, fontSize: 12, color: C.cyanDim }}>
        ¿No encuentras trabajo aún? Esto es lo que te acerca: qué estudiar para mejores puestos y tu pivote más viable.
      </p>

      {/* Pivote sugerido según tu fortaleza actual */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', borderRadius: RADIUS.lg, background: 'rgba(224,138,0,0.08)', border: '1px solid rgba(224,138,0,0.25)', marginBottom: 12 }}>
        <Target size={15} style={{ color: C.gold, flexShrink: 0, marginTop: 1 }} />
        <span style={{ fontFamily: FONT.body, fontSize: 12.5, color: '#ffdd9e', lineHeight: 1.45 }}>
          Tu fortaleza es <b>{EJE[strongest].label}</b>. Tu ruta más cercana ahora es{' '}
          <b>{top.track.name}</b> ({top.readiness}% listo){top.track.area ? ` · ${top.track.area}` : ''}.
        </span>
      </div>

      {/* Top destinos por cercanía */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ranked.slice(0, 4).map((a) => {
          const ready = a.gapAmount <= 2 || a.gapEje === null;
          const eje = a.gapEje ? EJE[a.gapEje] : null;
          const col = a.readiness >= 80 ? C.green : a.readiness >= 55 ? C.cyan : C.gold;
          return (
            <div key={a.track.id} style={{ padding: '11px 13px', borderRadius: RADIUS.lg, background: 'rgba(0,214,230,0.05)', border: `1px solid ${C.cyanFaint}` }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 14, color: '#eaf4ff' }}>{a.track.name}</span>
                <span style={{ fontFamily: FONT.mono, fontSize: 13, fontWeight: 700, color: col }}>{a.readiness}%</span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', margin: '6px 0 8px' }}>
                <div style={{ height: '100%', width: `${a.readiness}%`, background: col, transition: 'width .5s ease' }} />
              </div>
              {ready || !eje ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT.body, fontSize: 12, color: C.green }}>
                  <ArrowUpRight size={14} /> Estás listo para postular a este rol.
                </div>
              ) : (
                <>
                  <div style={{ fontFamily: FONT.body, fontSize: 12, color: '#c2cadd', lineHeight: 1.45 }}>
                    Te falta <b style={{ color: eje.color }}>+{a.gapAmount} en {eje.label}</b>. {eje.study}
                  </div>
                  <button
                    onClick={() => setActiveTab(eje.tab)}
                    style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 10, cursor: 'pointer', border: `1px solid ${eje.color}66`, background: `${eje.color}1a`, color: eje.color, fontFamily: FONT.mono, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' }}
                  >
                    <GraduationCap size={13} /> Estudiar {eje.label} →
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
