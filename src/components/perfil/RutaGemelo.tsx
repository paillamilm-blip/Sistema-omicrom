// src/components/perfil/RutaGemelo.tsx
// Ruta interactiva al siguiente Nodo: el motor calcula la secuencia óptima
// de acciones (por retorno) para subir de Tier. Cada paso es tocable y
// ejecuta la acción real; al hacerlo, el perfil avanza y la ruta se
// recalcula automáticamente (el paso hecho desaparece del tope).
import { Compass, ArrowUpRight } from 'lucide-react';
import { useGemeloProfile } from '../../hooks/useGemeloProfile';
import { routeToNextTier, type NextAction } from '../../lib/gemeloProfile';
import { C, FONT, RADIUS } from '../../theme';

const ICON: Record<NextAction, string> = { cv: '📄', title: '🎓', year: '⏱️', vault: '📚' };

export function RutaGemelo() {
  const { profile, tier, actions } = useGemeloProfile();
  const route = routeToNextTier(profile);
  const atMax = tier.name === 'Nodo Arquitecto' || route.steps.length === 0;

  return (
    <div style={{
      borderRadius: RADIUS.xl, padding: 16, marginBottom: 14,
      background: 'rgba(12,20,38,0.95)', border: `1px solid ${C.goldDim}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Compass size={16} style={{ color: C.gold }} />
        <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 15, color: '#eaf4ff' }}>
          {atMax ? 'Estás en el nodo máximo' : `Ruta al ${route.endTier}`}
        </span>
      </div>

      {atMax ? (
        <p style={{ margin: '4px 0 0', fontFamily: FONT.body, fontSize: 12.5, color: C.cyanDim }}>
          Eres Nodo Arquitecto. Sigue aportando a la Bóveda para mantener tu ventaja en la red.
        </p>
      ) : (
        <>
          <p style={{ margin: '2px 0 12px', fontFamily: FONT.mono, fontSize: 10.5, color: C.cyanDim }}>
            Toca cada paso para completarlo · al terminar: reputación {route.endRep} · {route.endPe.toLocaleString('es')} PE
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {route.steps.map((s, i) => (
              <button
                key={`${s.action}-${i}`}
                onClick={() => actions.run(s.action)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', borderRadius: RADIUS.lg,
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                  background: i === 0 ? `${C.gold}14` : 'rgba(255,255,255,0.03)',
                  border: i === 0 ? `1px solid ${C.goldDim}` : '1px solid rgba(255,255,255,0.08)',
                  color: '#eaf4ff',
                }}
              >
                <span style={{
                  flexShrink: 0, width: 24, height: 24, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: i === 0 ? C.gold : 'rgba(255,255,255,0.1)',
                  color: i === 0 ? '#000206' : '#9fb2c8',
                  fontFamily: FONT.mono, fontSize: 12, fontWeight: 700,
                }}>{i + 1}</span>
                <span style={{ flex: 1, fontFamily: FONT.body, fontSize: 13.5 }}>
                  {ICON[s.action]} {s.label}
                </span>
                {i === 0
                  ? <ArrowUpRight size={16} style={{ color: C.gold, flexShrink: 0 }} />
                  : <span style={{ fontFamily: FONT.mono, fontSize: 9, color: C.cyanDim, flexShrink: 0 }}>DESPUÉS</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
