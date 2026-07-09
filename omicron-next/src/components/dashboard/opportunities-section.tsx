import Link from "next/link";
import { Compass } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Opportunity } from "@/types";

import { OpportunityCard } from "./opportunity-card";

interface OpportunitiesSectionProps {
  opportunities: Opportunity[];
  /** Numero de columnas en pantallas grandes (2 o 3). */
  columns?: 2 | 3;
}

export function OpportunitiesSection({
  opportunities,
  columns = 3,
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
        <Button variant="link" asChild className="text-primary">
          <Link href="/oportunidades">Ver todas</Link>
        </Button>
      </div>

      <div
        className={cn(
          "grid gap-4 sm:grid-cols-2",
          columns === 3 && "lg:grid-cols-3",
        )}
      >
        {opportunities.map((opportunity) => (
          <OpportunityCard key={opportunity.id} opportunity={opportunity} />
        ))}
      </div>
    </section>
  );
}
