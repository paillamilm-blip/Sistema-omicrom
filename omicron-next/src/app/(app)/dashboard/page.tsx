import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { EarningsCard } from "@/components/dashboard/earnings-card";
import { LevelOverview } from "@/components/dashboard/level-overview";
import { OpportunitiesSection } from "@/components/dashboard/opportunities-section";
import { SkillMap } from "@/components/dashboard/skill-map";
import { StatsRow } from "@/components/dashboard/stats-row";
import { Button } from "@/components/ui/button";
import { getDashboardData } from "@/lib/data/dashboard";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const { user, node, skills, earnings, opportunities, stats, activity } =
    await getDashboardData();

  return (
    <div className="space-y-8">
      {/* Saludo */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <p className="text-sm text-muted-foreground">Hola de nuevo,</p>
          <h1 className="text-2xl font-bold tracking-tight">
            {user.name.split(" ")[0]} 👋
          </h1>
        </div>
        <Button variant="gradient" asChild className="hidden sm:inline-flex">
          <Link href="/oportunidades">
            Explorar oportunidades
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Stat cards */}
      <div className="animate-fade-in-up" style={{ animationDelay: "40ms" }}>
        <StatsRow stats={stats} />
      </div>

      {/* Seccion principal: Nodo + Experiencia + Progreso */}
      <div className="animate-fade-in-up" style={{ animationDelay: "80ms" }}>
        <LevelOverview node={node} />
      </div>

      {/* Mapa de habilidades + Ganancias */}
      <div
        className="grid animate-fade-in-up gap-6 lg:grid-cols-2"
        style={{ animationDelay: "120ms" }}
      >
        <SkillMap skills={skills} />
        <EarningsCard earnings={earnings} />
      </div>

      {/* Oportunidades + Actividad */}
      <div
        className="grid animate-fade-in-up gap-6 lg:grid-cols-3"
        style={{ animationDelay: "160ms" }}
      >
        <div className="lg:col-span-2">
          <OpportunitiesSection opportunities={opportunities} columns={2} />
        </div>
        <ActivityFeed items={activity} />
      </div>
    </div>
  );
}
