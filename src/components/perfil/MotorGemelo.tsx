// src/components/perfil/MotorGemelo.tsx
// Motor del Gemelo: "Siguiente mejor paso" (recomendación por retorno) +
// Historial de actividad con racha. Lee el perfil COMPARTIDO
// (useGemeloProfile), de modo que refleja y actualiza exactamente lo mismo
// que el resto de la app al convalidar datos.
import { Target, Flame, ArrowRight, History } from 'lucide-react';
import { useGemeloProfile } from '../../hooks/useGemeloProfile';
import { C, FONT, RADIUS } from '../../theme';

function timeAgo(d: number): string {
  const dt = new Date(d);
  const day = dt.toLocaleDateString('es', { day: '2-digit', month: 'short' });
  const hm = dt.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  return `${day} ${hm}`;
}

export function MotorGemelo() {
  const { actions, history, streak, next } = useGemeloProfile();
  const recent = [...history].slice(-6).reverse();

  return (
    <div style={{
      position: 'relative', borderRadius: RADIUS.xl, padding: 16, marginBottom: 14,
      background: 'rgba(12,20,38,0.95)', border: '1px solid rgba(0,240,255,0.14)',
    }}>
      {/* Siguiente mejor paso */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Target size={16} style={{ color: C.gold }} />
        <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 15, color: '#eaf4ff' }}>
          Tu siguiente mejor paso
        </span>
      </div>

      {next ? (
        <button
          onClick={() => actions.run(next.action)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 12,
            padding: '13px 15px', borderRadius: RADIUS.lg, cursor: 'pointer', textAlign: 'left',
            background: `${C.gold}12`, border: `1px solid ${C.goldDim}`, color: '#eaf4ff',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 15, color: '#eaf4ff' }}>
              {next.label}
            </div>
            <div style={{ fontFamily: FONT.mono, fontSize: 10.5, color: C.gold, marginTop: 3 }}>
              +{next.dRep} reputación · +{next.dPe} PE
            </div>
          </div>
          <ArrowRight size={18} style={{ color: C.gold, flexShrink: 0 }} />
        </button>
      ) : (
        <p style={{ margin: 0, fontFamily: FONT.body, fontSize: 12.5, color: C.cyanDim }}>
          Tu Gemelo está al máximo por ahora. Sigue aportando a la Bóveda para mantener tu ventaja.
        </p>
      )}

      {/* Historial + racha */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '18px 0 8px' }}>
        <History size={15} style={{ color: C.cyan }} />
        <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 14, color: '#eaf4ff' }}>
          Tu historial
        </span>
        <span style={{
          marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '3px 10px', borderRadius: 14, background: C.goldFaint, border: `1px solid ${C.goldDim}`,
          fontFamily: FONT.mono, fontSize: 11, color: C.gold,
        }}>
          <Flame size={12} /> {streak} {streak === 1 ? 'día' : 'días'}
        </span>
      </div>

      {recent.length === 0 ? (
        <p style={{ margin: 0, fontFamily: FONT.body, fontSize: 12, color: C.cyanDim }}>
          Aún sin actividad. Convalida algo para empezar tu racha.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {recent.map((h, i) => (
            <div key={`${h.d}-${i}`} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
              padding: '7px 0', borderBottom: i < recent.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
            }}>
              <span style={{ fontFamily: FONT.body, fontSize: 12.5, color: '#dbeafe' }}>▸ {h.t}</span>
              <span style={{ fontFamily: FONT.mono, fontSize: 9.5, color: C.cyanDim, whiteSpace: 'nowrap' }}>
                {timeAgo(h.d)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
