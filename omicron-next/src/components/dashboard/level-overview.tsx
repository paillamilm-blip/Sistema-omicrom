import { ArrowUpRight, Sparkles, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import type { NodeLevel } from "@/types";

import { ProgressRing } from "./progress-ring";

interface LevelOverviewProps {
  node: NodeLevel;
}

export function LevelOverview({ node }: LevelOverviewProps) {
  const earnedInNode = node.experience - node.currentThreshold;
  const nodeSpan = node.nextThreshold - node.currentThreshold;
  const progress = Math.round((earnedInNode / nodeSpan) * 100);
  const remaining = node.nextThreshold - node.experience;

  return (
    <Card className="relative overflow-hidden border-border/60 bg-omicron-radial p-6 sm:p-8">
      {/* Halo decorativo */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-omicron-purple/10 blur-3xl" />

      <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        {/* Info del nodo + XP */}
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <Badge variant="gradient" className="gap-1">
              <Sparkles className="h-3 w-3" />
              Nivel actual
            </Badge>
            <span className="text-sm text-muted-foreground">
              Nodo {node.current}
            </span>
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {node.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sigues creciendo. Próximo destino:{" "}
              <span className="font-medium text-foreground">
                {node.nextName}
              </span>
            </p>
          </div>

          <div className="flex items-end gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/15">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div className="leading-none">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Puntaje de experiencia
              </p>
              <p className="mt-1 text-5xl font-extrabold tracking-tight text-gradient sm:text-6xl">
                {formatNumber(node.experience)}
                <span className="ml-2 align-baseline text-base font-semibold text-muted-foreground">
                  XP
                </span>
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-sm text-emerald-400">
            <ArrowUpRight className="h-4 w-4" />
            Te faltan{" "}
            <span className="font-semibold">
              {formatNumber(remaining)} XP
            </span>{" "}
            para el siguiente nodo
          </div>
        </div>

        {/* Anillo de progreso hacia el siguiente nodo */}
        <div className="flex shrink-0 flex-col items-center gap-3">
          <ProgressRing value={progress} size={200} strokeWidth={14}>
            <span className="text-4xl font-bold text-gradient">
              {progress}%
            </span>
            <span className="mt-1 text-xs text-muted-foreground">
              hacia Nodo {node.current + 1}
            </span>
          </ProgressRing>
          <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
            <span>{formatNumber(node.currentThreshold)}</span>
            <span>{formatNumber(node.nextThreshold)}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
