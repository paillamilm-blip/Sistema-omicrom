import type { Metadata } from "next";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { EarningsCard } from "@/components/dashboard/earnings-card";
import { LevelOverview } from "@/components/dashboard/level-overview";
import { OpportunitiesSection } from "@/components/dashboard/opportunities-section";
import { SkillMap } from "@/components/dashboard/skill-map";
import { dashboardData } from "@/lib/mock-data";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  const { user, node, skills, earnings, opportunities } = dashboardData;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader user={user} />

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {/* Saludo */}
        <div className="animate-fade-in-up">
          <p className="text-sm text-muted-foreground">Hola de nuevo,</p>
          <h1 className="text-2xl font-bold tracking-tight">
            {user.name.split(" ")[0]} 👋
          </h1>
        </div>

        {/* Sección principal: Nodo + Experiencia + Progreso */}
        <div className="animate-fade-in-up" style={{ animationDelay: "60ms" }}>
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

        {/* Oportunidades recomendadas */}
        <div className="animate-fade-in-up" style={{ animationDelay: "180ms" }}>
          <OpportunitiesSection opportunities={opportunities} />
        </div>
      </main>
    </div>
  );
}
