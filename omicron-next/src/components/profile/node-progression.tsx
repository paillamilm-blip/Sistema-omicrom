import { Check, Circle, Lock } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatNumber } from "@/lib/utils";
import type { NodeDefinition } from "@/types";

interface NodeProgressionProps {
  nodes: NodeDefinition[];
  currentIndex: number;
  experience: number;
}

/**
 * Linea de tiempo vertical con la progresion de nodos. Marca los completados,
 * el actual y los bloqueados.
 */
export function NodeProgression({
  nodes,
  currentIndex,
  experience,
}: NodeProgressionProps) {
  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle>Progresión de nodos</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="relative space-y-6 before:absolute before:left-[13px] before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-border">
          {nodes.map((node) => {
            const completed = node.index < currentIndex;
            const current = node.index === currentIndex;
            const reached = experience >= node.threshold;

            return (
              <li key={node.index} className="relative flex gap-4">
                <span
                  className={cn(
                    "z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full ring-4 ring-card",
                    completed && "bg-omicron-gradient text-white",
                    current && "bg-primary text-white shadow-glow",
                    !completed && !current && "bg-muted text-muted-foreground",
                  )}
                >
                  {completed ? (
                    <Check className="h-4 w-4" />
                  ) : current ? (
                    <Circle className="h-3 w-3 fill-current" />
                  ) : reached ? (
                    <Circle className="h-3 w-3" />
                  ) : (
                    <Lock className="h-3.5 w-3.5" />
                  )}
                </span>
                <div className="flex-1 pt-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        current && "text-gradient font-semibold",
                        !completed && !current && "text-muted-foreground",
                      )}
                    >
                      {node.name}
                    </p>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatNumber(node.threshold)} XP
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {node.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
