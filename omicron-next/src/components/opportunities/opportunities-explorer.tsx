"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";

import { OpportunityCard } from "@/components/dashboard/opportunity-card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Opportunity, OpportunityType } from "@/types";

interface OpportunitiesExplorerProps {
  opportunities: Opportunity[];
}

type Filter = "todas" | OpportunityType;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "proyecto", label: "Proyectos" },
  { value: "mentoria", label: "Mentorías" },
  { value: "curso", label: "Cursos" },
];

export function OpportunitiesExplorer({
  opportunities,
}: OpportunitiesExplorerProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("todas");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return opportunities.filter((o) => {
      const matchesType = filter === "todas" || o.type === filter;
      const matchesQuery =
        q === "" ||
        o.title.toLowerCase().includes(q) ||
        o.company.toLowerCase().includes(q) ||
        o.tags.some((t) => t.toLowerCase().includes(q));
      return matchesType && matchesQuery;
    });
  }, [opportunities, query, filter]);

  return (
    <div className="space-y-6">
      {/* Controles */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por título, empresa o tag..."
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <SlidersHorizontal className="mr-1 hidden h-4 w-4 text-muted-foreground sm:block" />
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  filter === f.value
                    ? "bg-omicron-gradient text-white"
                    : "bg-muted/60 text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Resultados */}
      <p className="text-sm text-muted-foreground">
        {filtered.length}{" "}
        {filtered.length === 1
          ? "oportunidad encontrada"
          : "oportunidades encontradas"}
      </p>

      {filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((opportunity) => (
            <OpportunityCard key={opportunity.id} opportunity={opportunity} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border/60 p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No encontramos oportunidades con esos criterios. Prueba con otros
            filtros.
          </p>
        </div>
      )}
    </div>
  );
}
