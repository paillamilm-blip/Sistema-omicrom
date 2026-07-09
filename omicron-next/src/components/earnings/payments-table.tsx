import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { Payment, PaymentStatus } from "@/types";

interface PaymentsTableProps {
  payments: Payment[];
}

const STATUS_STYLES: Record<PaymentStatus, string> = {
  pagado: "bg-emerald-500/15 text-emerald-400",
  procesando: "bg-primary/15 text-primary",
  pendiente: "bg-amber-500/15 text-amber-400",
};

export function PaymentsTable({ payments }: PaymentsTableProps) {
  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle>Pagos recientes</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/60">
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="flex items-center justify-between gap-4 px-6 py-3.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {payment.concept}
                </p>
                <p className="text-xs text-muted-foreground">
                  {payment.source} · {formatDate(payment.date)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                    STATUS_STYLES[payment.status],
                  )}
                >
                  {payment.status}
                </span>
                <span className="w-20 text-right text-sm font-semibold">
                  {formatCurrency(payment.amount, payment.currency)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
