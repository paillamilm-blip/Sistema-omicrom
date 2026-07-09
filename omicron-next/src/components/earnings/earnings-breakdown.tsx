import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { EarningsBreakdownItem } from "@/types";

interface EarningsBreakdownProps {
  items: EarningsBreakdownItem[];
  currency: string;
}

const BAR_COLORS = [
  "bg-primary",
  "bg-secondary",
  "bg-emerald-400",
  "bg-amber-400",
];

export function EarningsBreakdown({ items, currency }: EarningsBreakdownProps) {
  const total = items.reduce((acc, i) => acc + i.amount, 0) || 1;

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle>Desglose por fuente</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Barra apilada */}
        <div className="flex h-3 overflow-hidden rounded-full">
          {items.map((item, i) => (
            <div
              key={item.source}
              className={BAR_COLORS[i % BAR_COLORS.length]}
              style={{ width: `${(item.amount / total) * 100}%` }}
            />
          ))}
        </div>

        <ul className="space-y-3">
          {items.map((item, i) => (
            <li
              key={item.source}
              className="flex items-center justify-between text-sm"
            >
              <span className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    BAR_COLORS[i % BAR_COLORS.length]
                  }`}
                />
                {item.source}
              </span>
              <span className="font-medium">
                {formatCurrency(item.amount, currency)}
                <span className="ml-2 text-xs text-muted-foreground">
                  {Math.round((item.amount / total) * 100)}%
                </span>
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
