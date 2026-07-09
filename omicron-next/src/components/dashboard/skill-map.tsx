import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Skill } from "@/types";

interface SkillMapProps {
  skills: Skill[];
}

const SIZE = 260;
const CENTER = SIZE / 2;
const RADIUS = 92;
const RINGS = 4;

/** Convierte (índice, valor 0-100) en coordenadas cartesianas del radar. */
function point(index: number, total: number, value: number) {
  // Empezamos arriba (-90°) y avanzamos en sentido horario.
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  const r = (value / 100) * RADIUS;
  return {
    x: CENTER + r * Math.cos(angle),
    y: CENTER + r * Math.sin(angle),
  };
}

/**
 * Mapa de habilidades circular (radar chart) construido con SVG puro.
 */
export function SkillMap({ skills }: SkillMapProps) {
  const total = skills.length;

  const dataPoints = skills.map((s, i) => point(i, total, s.value));
  const polygon = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  const average = Math.round(
    skills.reduce((acc, s) => acc + s.value, 0) / total,
  );

  return (
    <Card className="border-border/60">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Mapa de habilidades</CardTitle>
        <span className="text-sm text-muted-foreground">
          Promedio{" "}
          <span className="font-semibold text-gradient">{average}</span>
        </span>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <svg
          width="100%"
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="max-w-[280px]"
          role="img"
          aria-label="Radar de habilidades del usuario"
        >
          <defs>
            <linearGradient id="skill-fill" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop
                offset="0%"
                stopColor="hsl(217 91% 60%)"
                stopOpacity="0.55"
              />
              <stop
                offset="100%"
                stopColor="hsl(271 81% 66%)"
                stopOpacity="0.55"
              />
            </linearGradient>
            <linearGradient
              id="skill-stroke"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="hsl(217 91% 60%)" />
              <stop offset="100%" stopColor="hsl(271 81% 66%)" />
            </linearGradient>
          </defs>

          {/* Anillos concéntricos de referencia */}
          {Array.from({ length: RINGS }).map((_, ring) => (
            <circle
              key={ring}
              cx={CENTER}
              cy={CENTER}
              r={(RADIUS * (ring + 1)) / RINGS}
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth={1}
            />
          ))}

          {/* Ejes hacia cada habilidad */}
          {skills.map((_, i) => {
            const p = point(i, total, 100);
            return (
              <line
                key={i}
                x1={CENTER}
                y1={CENTER}
                x2={p.x}
                y2={p.y}
                stroke="hsl(var(--border))"
                strokeWidth={1}
              />
            );
          })}

          {/* Polígono de datos */}
          <polygon
            points={polygon}
            fill="url(#skill-fill)"
            stroke="url(#skill-stroke)"
            strokeWidth={2}
            strokeLinejoin="round"
          />

          {/* Vértices */}
          {dataPoints.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={3.5}
              fill="hsl(var(--background))"
              stroke="url(#skill-stroke)"
              strokeWidth={2}
            />
          ))}

          {/* Etiquetas de cada habilidad */}
          {skills.map((skill, i) => {
            const p = point(i, total, 118);
            const anchor =
              Math.abs(p.x - CENTER) < 8
                ? "middle"
                : p.x > CENTER
                  ? "start"
                  : "end";
            return (
              <text
                key={skill.label}
                x={p.x}
                y={p.y}
                dy="0.32em"
                textAnchor={anchor}
                className="fill-muted-foreground text-[10px] font-medium"
              >
                {skill.label}
              </text>
            );
          })}
        </svg>

        {/* Leyenda compacta */}
        <div className="mt-4 grid w-full grid-cols-2 gap-2 sm:grid-cols-3">
          {skills.map((skill) => (
            <div
              key={skill.label}
              className="flex items-center justify-between rounded-md bg-muted/40 px-2.5 py-1.5 text-xs"
            >
              <span className="text-muted-foreground">{skill.label}</span>
              <span className="font-semibold">{skill.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
