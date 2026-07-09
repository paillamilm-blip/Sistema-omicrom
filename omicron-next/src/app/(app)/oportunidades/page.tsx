import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { OpportunitiesExplorer } from "@/components/opportunities/opportunities-explorer";
import { getOpportunities } from "@/lib/data/opportunities";

export const metadata: Metadata = {
  title: "Oportunidades",
};

export default async function OpportunitiesPage() {
  const opportunities = await getOpportunities();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Oportunidades"
        description="Proyectos, mentorías y cursos seleccionados según tu perfil y nodo actual."
      />
      <OpportunitiesExplorer opportunities={opportunities} />
    </div>
  );
}
