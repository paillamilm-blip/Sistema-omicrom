import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { MonthlyEarning } from "@/types";

interface EarningsChartProps {
  months: MonthlyEarning[];
  currency: string;
}

/** Gráfico de barras mensual construido con SVG/divs (sin dependencias). */
export function EarningsChart({ months, currency }: EarningsChartProps) {
  const max = Math.max(...months.map((m) => m.amount), 1);

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle>Ingresos por mes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex h-56 items-end gap-3">
          {months.map((month, i) => {
            const isLast = i === months.length - 1;
            const heightPct = (month.amount / max) * 100;
            return (
              <div
                key={month.label}
                className="group flex flex-1 flex-col items-center gap-2"
              >
                <div className="relative flex w-full flex-1 items-end">
                  <div
                    className={`w-full rounded-t-md transition-all ${
                      isLast
                        ? "bg-omicron-gradient shadow-glow"
                        : "bg-muted group-hover:bg-primary/40"
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />
                  <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-popover px-1.5 py-0.5 text-[10px] font-medium opacity-0 shadow transition-opacity group-hover:opacity-100">
                    {formatCurrency(month.amount, currency)}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {month.label}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
