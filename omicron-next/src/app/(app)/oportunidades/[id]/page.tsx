import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  Clock,
  GraduationCap,
  MapPin,
  Signal,
  Users,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getOpportunities, getOpportunityById } from "@/lib/data/opportunities";
import { cn, formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import type { OpportunityType } from "@/types";

const TYPE_META: Record<
  OpportunityType,
  { label: string; icon: LucideIcon; accent: string }
> = {
  proyecto: {
    label: "Proyecto",
    icon: Briefcase,
    accent: "text-primary bg-primary/15",
  },
  mentoria: {
    label: "Mentoría",
    icon: Users,
    accent: "text-secondary bg-secondary/15",
  },
  curso: {
    label: "Curso",
    icon: GraduationCap,
    accent: "text-emerald-400 bg-emerald-500/15",
  },
};

const LEVEL_LABEL: Record<string, string> = {
  junior: "Junior",
  mid: "Intermedio",
  senior: "Senior",
};

interface PageProps {
  params: { id: string };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const opportunity = await getOpportunityById(params.id);
  return {
    title: opportunity ? opportunity.title : "Oportunidad no encontrada",
  };
}

export default async function OpportunityDetailPage({ params }: PageProps) {
  const opportunity = await getOpportunityById(params.id);
  if (!opportunity) {
    notFound();
  }

  const meta = TYPE_META[opportunity.type];
  const Icon = meta.icon;

  return (
    <div className="space-y-6">
      <Button variant="ghost" asChild className="-ml-2 text-muted-foreground">
        <Link href="/oportunidades">
          <ArrowLeft className="h-4 w-4" />
          Volver a oportunidades
        </Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Contenido principal */}
        <div className="space-y-6 lg:col-span-2">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium",
                  meta.accent,
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {meta.label}
              </span>
              <Badge variant="success">{opportunity.match}% match</Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              {opportunity.title}
            </h1>
            <p className="text-muted-foreground">{opportunity.company}</p>
          </div>

          <Card className="border-border/60">
            <CardContent className="space-y-6 p-6">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">Descripción</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {opportunity.description}
                </p>
              </div>

              <Separator />

              <div className="space-y-3">
                <h2 className="text-lg font-semibold">Requisitos</h2>
                <ul className="space-y-2">
                  {opportunity.requirements.map((req) => (
                    <li key={req} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="text-muted-foreground">{req}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Separator />

              <div className="space-y-3">
                <h2 className="text-lg font-semibold">Tecnologías</h2>
                <div className="flex flex-wrap gap-2">
                  {opportunity.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-muted/60 px-2.5 py-1 text-xs text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panel lateral */}
        <div className="space-y-4">
          <Card className="border-gradient sticky top-24">
            <CardContent className="space-y-5 p-6">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Recompensa
                </p>
                <p className="mt-1 flex items-center gap-2 text-3xl font-bold text-gradient">
                  <Zap className="h-6 w-6 text-primary" />+
                  {formatNumber(opportunity.rewardXp)} XP
                </p>
                {opportunity.reward != null && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    + {formatCurrency(opportunity.reward)} estimados
                  </p>
                )}
              </div>

              <Separator />

              <dl className="space-y-3 text-sm">
                <DetailRow
                  icon={Clock}
                  label="Dedicación"
                  value={opportunity.commitment}
                />
                <DetailRow
                  icon={MapPin}
                  label="Ubicación"
                  value={opportunity.location}
                />
                <DetailRow
                  icon={Signal}
                  label="Nivel"
                  value={LEVEL_LABEL[opportunity.level] ?? opportunity.level}
                />
                <DetailRow
                  icon={CalendarClock}
                  label="Postula antes de"
                  value={formatDate(opportunity.deadline)}
                />
              </dl>

              <Button variant="gradient" className="w-full">
                Postular ahora
              </Button>
              <Button variant="outline" className="w-full">
                Guardar para después
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

/** Pre-genera las rutas de detalle conocidas (mejora el rendimiento). */
export async function generateStaticParams() {
  const opportunities = await getOpportunities();
  return opportunities.map((o) => ({ id: o.id }));
}
