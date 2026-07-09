import { Compass } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Opportunity } from "@/types";

import { OpportunityCard } from "./opportunity-card";

interface OpportunitiesSectionProps {
  opportunities: Opportunity[];
}

export function OpportunitiesSection({
  opportunities,
}: OpportunitiesSectionProps) {
  return (
    <section aria-labelledby="opportunities-title" className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15">
            <Compass className="h-4 w-4 text-primary" />
          </span>
          <h2 id="opportunities-title" className="text-lg font-semibold">
            Oportunidades recomendadas
          </h2>
        </div>
        <Button variant="link" className="text-primary">
          Ver todas
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {opportunities.map((opportunity) => (
          <OpportunityCard key={opportunity.id} opportunity={opportunity} />
        ))}
      </div>
    </section>
  );
}
