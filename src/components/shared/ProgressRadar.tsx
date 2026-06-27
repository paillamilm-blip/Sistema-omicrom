// components/shared/ProgressRadar.tsx
// Visualización del Gemelo Digital como radar dinámico en tiempo real

import { useMemo } from 'react';
import { AlertCircle, TrendingUp } from 'lucide-react';
import type { GemeloDigital } from '../../types';
import { formatScore, getReputationBadge } from '../../services/reputationService';

interface ProgressRadarProps {
  gemelo: GemeloDigital;
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  showHeader?: boolean;
  animated?: boolean;
  threshold?: number;
}

const AXIS_LABELS = {
  execution:    'Ejecución',
  quality:      'Calidad',
  transcendence:'Trascendencia',
  foundation:   'Fundamento',
} as const;

const AXIS_COLORS = {
  execution:    '#10b981',
  quality:      '#3b82f6',
  transcendence:'#f59e0b',
  foundation:   '#8b5cf6',
} as const;

// ✅ FIX: getReputationBadge devuelve el hex directamente para que el componente
// no dependa de strings arbitrarios que se pueden desincronizar.
const BADGE_BORDER_HEX: Record<string, string> = {
  gold:    '#fbbf24',
  emerald: '#10b981',
  blue:    '#3b82f6',
  amber:   '#f59e0b',
  slate:   '#64748b',
};


export function ProgressRadar({
  gemelo,
  size = 'md',
  showLabels = true,
  showHeader = true,
  animated = true,
  threshold = 50,
}: ProgressRadarProps) {
  const radius      = size === 'sm' ? 64 : size === 'md' ? 92 : 130;
  const labelPad    = size === 'sm' ? 52 : size === 'md' ? 70 : 90;
  const viewBoxSize = radius * 2 + labelPad * 2;
  const centerX     = viewBoxSize / 2;
  const centerY     = viewBoxSize / 2;
  const labelDist   = radius + (size === 'sm' ? 18 : size === 'md' ? 24 : 30);

  const points = useMemo(() => {
    const data = [
      { key: 'execution',    value: gemelo.execution,    label: AXIS_LABELS.execution,    color: AXIS_COLORS.execution    },
      { key: 'quality',      value: gemelo.quality,      label: AXIS_LABELS.quality,      color: AXIS_COLORS.quality      },
      { key: 'transcendence',value: gemelo.transcendence,label: AXIS_LABELS.transcendence,color: AXIS_COLORS.transcendence },
      { key: 'foundation',   value: gemelo.foundation,   label: AXIS_LABELS.foundation,   color: AXIS_COLORS.foundation   },
    ];

    const angleSlice = (Math.PI * 2) / data.length;

    return data.map((item, i) => {
      const angle           = angleSlice * i - Math.PI / 2;
      const normalizedValue = item.value / 100;
      const distance        = radius * normalizedValue;

      return {
        ...item,
        angle,
        x:      centerX + distance * Math.cos(angle),
        y:      centerY + distance * Math.sin(angle),
        labelX: centerX + labelDist * Math.cos(angle),
        labelY: centerY + labelDist * Math.sin(angle),
      };
    });
  }, [gemelo, radius, centerX, centerY, labelDist]);

  const hasAlert = useMemo(() => points.some(p => p.value < threshold), [points, threshold]);

  const polygonPoints = useMemo(() => points.map(p => `${p.x},${p.y}`).join(' '), [points]);


  const gridLines = useMemo(() => {
    const lines: Array<{ type: string; x1?: number; y1?: number; x2?: number; y2?: number; points?: string }> = [];
    const gridLevels  = 5;
    const angleSlice  = (Math.PI * 2) / points.length;

    for (let i = 0; i < points.length; i++) {
      const angle = angleSlice * i - Math.PI / 2;
      lines.push({
        type: 'radial',
        x1: centerX,
        y1: centerY,
        x2: centerX + (radius + 20) * Math.cos(angle),
        y2: centerY + (radius + 20) * Math.sin(angle),
      });
    }

    for (let i = 1; i <= gridLevels; i++) {
      const r = (radius / gridLevels) * i;
      const circlePoints: string[] = [];
      for (let j = 0; j < points.length; j++) {
        const angle = angleSlice * j - Math.PI / 2;
        circlePoints.push(`${centerX + r * Math.cos(angle)},${centerY + r * Math.sin(angle)}`);
      }
      circlePoints.push(circlePoints[0]);
      lines.push({ type: 'concentric', points: circlePoints.join(' ') });
    }

    return lines;
  }, [points, radius, centerX, centerY]);

  const badge       = getReputationBadge(gemelo.overallReputation);
  const borderColor = BADGE_BORDER_HEX[badge.color] ?? '#64748b';

  const dotRadius   = size === 'sm' ? 4 : size === 'md' ? 5 : 7;
  const glowRadius  = size === 'sm' ? 6 : size === 'md' ? 8 : 11;
  const fontSize    = size === 'sm' ? '11' : size === 'md' ? '13' : '16';
  const subFontSize = size === 'sm' ? '10' : size === 'md' ? '12' : '14';
  const labelOffset = size === 'sm' ? 14  : size === 'md' ? 18  : 24;
  const svgSize     = viewBoxSize;


  return (
    <div className="flex flex-col gap-4">
      {/* Reputación General */}
      {showHeader && (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-omicron-subtle uppercase tracking-wide">Gemelo Digital</p>
            <p className="text-3xl font-bold mt-1">
              {formatScore(gemelo.overallReputation)}
              <span className="text-lg text-omicron-subtle ml-1">/100</span>
            </p>
          </div>
          <div
            className="px-4 py-2 rounded-xl border-2 text-center"
            style={{ borderColor }}
          >
            <p className="text-sm font-bold">{badge.emoji} {badge.label}</p>
          </div>
        </div>
      )}

      {/* SVG Radar Chart */}
      <div className="flex justify-center">
        <svg
          viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
          width={svgSize}
          height={svgSize}
          style={{ maxWidth: '100%', height: 'auto' }}
          className="drop-shadow-lg"
        >
          {/* Grid */}
          <g stroke="#64748b" strokeWidth="1" opacity="0.3">
            {gridLines.filter(l => l.type === 'concentric').map((line, i) => (
              <polygon key={`concentric-${i}`} points={line.points} fill="none" />
            ))}
            {gridLines.filter(l => l.type === 'radial').map((line, i) => (
              <line key={`radial-${i}`} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} />
            ))}
          </g>


          {/* ✅ FIX: Eliminado animate-pulse del polígono (cambiaba opacidad, no tamaño).
              Si animated=true, se aplica una animación CSS en el stroke que sí es visible. */}
          <polygon
            points={polygonPoints}
            fill="#3b82f6"
            fillOpacity="0.15"
            stroke="#3b82f6"
            strokeWidth="2"
            style={animated ? { animation: 'radarStroke 3s ease-in-out infinite' } : undefined}
          />

          {/* Puntos de los ejes */}
          {points.map((p) => (
            <g key={p.key}>
              <circle cx={p.x} cy={p.y} r={dotRadius}  fill={p.color} stroke="white" strokeWidth="2" />
              <circle cx={p.x} cy={p.y} r={glowRadius} fill={p.color} fillOpacity="0.2" stroke={p.color} strokeWidth="1" strokeOpacity="0.5" />
            </g>
          ))}

          {/* Etiquetas */}
          {showLabels && (
            <g fontSize={fontSize} fontWeight="600">
              {points.map((p) => (
                <g key={`label-${p.key}`}>
                  <text x={p.labelX} y={p.labelY} textAnchor="middle" dominantBaseline="middle" fill={p.color}>
                    {p.label}
                  </text>
                  <text x={p.labelX} y={p.labelY + labelOffset} textAnchor="middle" dominantBaseline="middle" fill="#94a3b8" fontSize={subFontSize}>
                    {formatScore(p.value)}
                  </text>
                </g>
              ))}
            </g>
          )}
        </svg>


        {/* ✅ FIX: Keyframe definido en un <style> inline dentro del SVG container */}
        <style>{`
          @keyframes radarStroke {
            0%, 100% { stroke-opacity: 1; stroke-width: 2; }
            50%       { stroke-opacity: 0.4; stroke-width: 3; }
          }
        `}</style>
      </div>

      {/* Tabla de Scores */}
      <div className="grid grid-cols-2 gap-3">
        {points.map((p) => (
          <div key={`score-${p.key}`} className="p-3 rounded-lg bg-omicron-card border border-omicron-border">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
              <p className="text-xs text-omicron-subtle">{p.label}</p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-omicron-text">{formatScore(p.value)}</span>
              {p.value < threshold && <AlertCircle size={14} className="text-red-500" />}
            </div>
            <div className="w-full h-1.5 bg-omicron-border rounded-full mt-2 overflow-hidden">
              <div
                className="h-full transition-all duration-500"
                style={{ width: `${p.value}%`, backgroundColor: p.color, opacity: 0.8 }}
              />
            </div>
          </div>
        ))}
      </div>


      {/* Alerta */}
      {hasAlert && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex gap-2">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-500">
            Algunos ejes están por debajo del umbral de excelencia. Considera mejorar tus habilidades.
          </p>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-omicron-subtle">
        <TrendingUp size={14} />
        <span>Actualizado en tiempo real</span>
      </div>
    </div>
  );
}


// === HISTORIAL ===

interface ScoreHistoryProps {
  history: Array<{
    date: string;
    execution: number;
    quality: number;
    transcendence: number;
    foundation: number;
  }>;
}

export function ScoreHistory({ history }: ScoreHistoryProps) {
  if (!history.length) {
    return (
      <div className="text-center py-8 text-omicron-subtle">
        <p className="text-sm">Sin historial de cambios</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {history.slice(0, 5).map((entry, i) => (
        <div
          key={i}
          className="flex items-center justify-between p-2 rounded-lg bg-omicron-card border border-omicron-border/50"
        >
          <p className="text-xs text-omicron-subtle">{new Date(entry.date).toLocaleDateString()}</p>
          <div className="flex gap-2">
            <span className="text-xs font-mono" style={{ color: AXIS_COLORS.execution    }}>Ex:{formatScore(entry.execution)}</span>
            <span className="text-xs font-mono" style={{ color: AXIS_COLORS.quality      }}>Ca:{formatScore(entry.quality)}</span>
            <span className="text-xs font-mono" style={{ color: AXIS_COLORS.transcendence}}>Tr:{formatScore(entry.transcendence)}</span>
            <span className="text-xs font-mono" style={{ color: AXIS_COLORS.foundation   }}>Fd:{formatScore(entry.foundation)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
