import type { Metadata } from "next";
import { ArrowUpRight, Wallet } from "lucide-react";

import { EarningsBreakdown } from "@/components/earnings/earnings-breakdown";
import { EarningsChart } from "@/components/earnings/earnings-chart";
import { PaymentsTable } from "@/components/earnings/payments-table";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { getEarnings } from "@/lib/data/earnings";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Ganancias",
};

export default async function EarningsPage() {
  const { summary, months, totalLifetime, payments } = await getEarnings();
  const pending = payments
    .filter((p) => p.status !== "pagado")
    .reduce((acc, p) => acc + p.amount, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Ganancias"
        description="Tus ingresos en la plataforma, por período y fuente."
      />

      {/* Resumen */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/60 p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wallet className="h-4 w-4 text-secondary" />
            Este mes
          </div>
          <p className="mt-2 text-3xl font-bold tracking-tight">
            {formatCurrency(summary.amount, summary.currency)}
          </p>
          <p className="mt-1 inline-flex items-center gap-1 text-sm text-emerald-400">
            <ArrowUpRight className="h-4 w-4" />
            {summary.changePercent.toFixed(1)}% vs. mes anterior
          </p>
        </Card>

        <Card className="border-border/60 p-5">
          <p className="text-sm text-muted-foreground">Total histórico</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gradient">
            {formatCurrency(totalLifetime, summary.currency)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Desde tu ingreso a Omicron
          </p>
        </Card>

        <Card className="border-border/60 p-5">
          <p className="text-sm text-muted-foreground">Por cobrar</p>
          <p className="mt-2 text-3xl font-bold tracking-tight">
            {formatCurrency(pending, summary.currency)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Pagos pendientes o en proceso
          </p>
        </Card>
      </div>

      {/* Gráfico + desglose */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <EarningsChart months={months} currency={summary.currency} />
        </div>
        <EarningsBreakdown
          items={summary.breakdown}
          currency={summary.currency}
        />
      </div>

      <PaymentsTable payments={payments} />
    </div>
  );
}
