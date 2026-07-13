// src/components/ReputationWheel.tsx
// ═══════════════════════════════════════════════════════════════════════
// 🎯 REPUTATION WHEEL — Visualización orbital multi-capa (SVG premium)
// Anillos pulsantes + trazos de luz orbitando un número central luminoso.
// Nítido, holográfico, controlado. Texto perfecto siempre.
// ═══════════════════════════════════════════════════════════════════════
import { FONT } from '../theme';

interface Axes { execution: number; quality: number; transcendence: number; foundation: number; }
interface Props { rep: number; axes: Axes; }

const CX = 170, CY = 170;

// 4 métricas orbitando (ejes del Gemelo)
function metricsOf(a: Axes) {
  return [
    { key: 'qual', label: 'Calidad', value: a.quality, color: '#3fd0c9', angle: -58 },
    { key: 'exec', label: 'Ejecución', value: a.execution, color: '#5cc8ff', angle: 58 },
    { key: 'trans', label: 'Trascendencia', value: a.transcendence, color: '#a78bfa', angle: 122 },
    { key: 'found', label: 'Fundación', value: a.foundation, color: '#ffb02e', angle: -122 },
  ];
}

export function ReputationWheel({ rep, axes }: Props) {
  const metrics = metricsOf(axes);
  const rad = (deg: number) => (deg * Math.PI) / 180;

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 360, margin: '0 auto', aspectRatio: '1 / 1' }}>
      <svg viewBox="0 0 340 340" width="100%" height="100%" style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <radialGradient id="rw-core" cx="50%" cy="42%" r="60%">
            <stop offset="0%" stopColor="#d4fbf4" />
            <stop offset="38%" stopColor="#4fe3d6" />
            <stop offset="72%" stopColor="#1c8fb8" />
            <stop offset="100%" stopColor="#06263f" />
          </radialGradient>
          <linearGradient id="rw-teal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3fd0c9" /><stop offset="100%" stopColor="#5cc8ff" />
          </linearGradient>
          <linearGradient id="rw-violet" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#5cc8ff" /><stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
          <filter id="rw-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3.4" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>


        {/* Anillos orbitales rotando (trazos de luz) */}
        <g fill="none" strokeLinecap="round">
          <circle cx={CX} cy={CY} r="150" stroke="url(#rw-teal)" strokeWidth="1.6"
            strokeDasharray="4 20" opacity="0.85" filter="url(#rw-glow)">
            <animateTransform attributeName="transform" type="rotate"
              from={`0 ${CX} ${CY}`} to={`360 ${CX} ${CY}`} dur="42s" repeatCount="indefinite" />
          </circle>
          <circle cx={CX} cy={CY} r="150" stroke="rgba(92,200,255,0.12)" strokeWidth="1" />

          <circle cx={CX} cy={CY} r="124" stroke="url(#rw-violet)" strokeWidth="2"
            strokeDasharray="60 300" opacity="0.9" filter="url(#rw-glow)">
            <animateTransform attributeName="transform" type="rotate"
              from={`360 ${CX} ${CY}`} to={`0 ${CX} ${CY}`} dur="26s" repeatCount="indefinite" />
          </circle>
          <circle cx={CX} cy={CY} r="124" stroke="rgba(167,139,250,0.10)" strokeWidth="1" />

          <circle cx={CX} cy={CY} r="100" stroke="url(#rw-teal)" strokeWidth="1.4"
            strokeDasharray="2 14" opacity="0.7">
            <animateTransform attributeName="transform" type="rotate"
              from={`0 ${CX} ${CY}`} to={`360 ${CX} ${CY}`} dur="60s" repeatCount="indefinite" />
          </circle>
        </g>

        {/* Núcleo central luminoso */}
        <circle cx={CX} cy={CY} r="84" fill="#4fe3d6" opacity="0.14" filter="url(#rw-glow)">
          <animate attributeName="opacity" values="0.10;0.20;0.10" dur="3.4s" repeatCount="indefinite" />
        </circle>
        <circle cx={CX} cy={CY} r="60" fill="url(#rw-core)" stroke="rgba(120,240,225,0.55)" strokeWidth="1.5" />
        <text x={CX} y={CY - 2} textAnchor="middle" dominantBaseline="middle"
          style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: 58, fill: '#eafffb', letterSpacing: -1 }}>
          {rep}
        </text>
        <text x={CX} y={CY + 30} textAnchor="middle"
          style={{ fontFamily: FONT.mono, fontSize: 10, fill: 'rgba(10,40,50,0.85)', letterSpacing: 2, fontWeight: 700 }}>
          REPUTACIÓN
        </text>


        {/* Orbes de métricas sobre el anillo exterior */}
        {metrics.map((m, i) => {
          const x = CX + 150 * Math.cos(rad(m.angle));
          const y = CY + 150 * Math.sin(rad(m.angle));
          const right = Math.cos(rad(m.angle)) >= 0;
          const lx = x + (right ? 14 : -14);
          const anchor = right ? 'start' : 'end';
          return (
            <g key={m.key}>
              <circle cx={x} cy={y} r="6.5" fill={m.color} filter="url(#rw-glow)">
                <animate attributeName="r" values="6;8;6" dur="2.8s" begin={`${i * 0.4}s`} repeatCount="indefinite" />
              </circle>
              <text x={lx} y={y - 3} textAnchor={anchor}
                style={{ fontFamily: FONT.mono, fontSize: 9, fill: 'rgba(180,200,230,0.75)', letterSpacing: 0.6, textTransform: 'uppercase' }}>
                {m.label}
              </text>
              <text x={lx} y={y + 12} textAnchor={anchor}
                style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: 700, fill: m.color }}>
                {Math.round(m.value)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
