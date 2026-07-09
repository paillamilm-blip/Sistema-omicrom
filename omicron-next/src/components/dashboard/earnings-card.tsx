import { ArrowDownRight, ArrowUpRight, Wallet } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";
import type { EarningsSummary } from "@/types";

interface EarningsCardProps {
  earnings: EarningsSummary;
}

export function EarningsCard({ earnings }: EarningsCardProps) {
  const isPositive = earnings.changePercent >= 0;
  const max = Math.max(...earnings.trend, 1);

  return (
    <Card className="border-border/60">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Ganancias este mes</CardTitle>
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-secondary/15">
          <Wallet className="h-5 w-5 text-secondary" />
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <p className="text-4xl font-bold tracking-tight">
            {formatCurrency(earnings.amount, earnings.currency)}
          </p>
          <span
            className={cn(
              "mb-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-medium",
              isPositive
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-destructive/10 text-destructive",
            )}
          >
            {isPositive ? (
              <ArrowUpRight className="h-4 w-4" />
            ) : (
              <ArrowDownRight className="h-4 w-4" />
            )}
            {Math.abs(earnings.changePercent).toFixed(1)}%
          </span>
        </div>

        <p className="text-sm text-muted-foreground">
          {isPositive ? "Vas por encima" : "Vas por debajo"} del mes anterior
        </p>

        {/* Mini-gráfico de barras */}
        <div className="flex h-24 items-end gap-1.5 pt-2">
          {earnings.trend.map((value, i) => {
            const isLast = i === earnings.trend.length - 1;
            return (
              <div
                key={i}
                className="group relative flex-1"
                style={{ height: "100%" }}
              >
                <div
                  className={cn(
                    "absolute bottom-0 w-full rounded-t-md transition-all",
                    isLast
                      ? "bg-omicron-gradient shadow-glow"
                      : "bg-muted group-hover:bg-muted-foreground/40",
                  )}
                  style={{ height: `${(value / max) * 100}%` }}
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
