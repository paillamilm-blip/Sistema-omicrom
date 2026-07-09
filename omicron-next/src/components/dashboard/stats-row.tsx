import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { Card } from "@/components/ui/card";
import { getIcon } from "@/lib/icon-map";
import { cn } from "@/lib/utils";
import type { StatCard } from "@/types";

interface StatsRowProps {
  stats: StatCard[];
}

export function StatsRow({ stats }: StatsRowProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = getIcon(stat.icon);
        const hasChange = typeof stat.change === "number" && stat.change !== 0;
        const positive = (stat.change ?? 0) >= 0;
        return (
          <Card
            key={stat.id}
            className="border-border/60 p-4 transition-colors hover:border-primary/30"
          >
            <div className="flex items-center justify-between">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </span>
              {hasChange && (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 text-xs font-medium",
                    positive ? "text-emerald-400" : "text-destructive",
                  )}
                >
                  {positive ? (
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5" />
                  )}
                  {Math.abs(stat.change as number)}%
                </span>
              )}
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight">
              {stat.value}
            </p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </Card>
        );
      })}
    </div>
  );
}
