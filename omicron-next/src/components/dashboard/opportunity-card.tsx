import { ArrowRight, Briefcase, GraduationCap, Users, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import type { Opportunity, OpportunityType } from "@/types";

interface OpportunityCardProps {
  opportunity: Opportunity;
}

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

export function OpportunityCard({ opportunity }: OpportunityCardProps) {
  const meta = TYPE_META[opportunity.type];
  const Icon = meta.icon;

  return (
    <Card className="group flex flex-col border-border/60 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-glow-blue">
      <CardContent className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium",
              meta.accent,
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {meta.label}
          </span>
          <Badge variant="success" className="gap-1">
            {opportunity.match}% match
          </Badge>
        </div>

        <div className="space-y-1.5">
          <h3 className="font-semibold leading-tight">{opportunity.title}</h3>
          <p className="text-sm text-muted-foreground">
            {opportunity.description}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {opportunity.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-border/60 pt-4">
          <div className="flex items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1 font-medium text-primary">
              <Zap className="h-4 w-4" />+{formatNumber(opportunity.rewardXp)}{" "}
              XP
            </span>
            {opportunity.reward != null && (
              <span className="text-muted-foreground">
                {formatCurrency(opportunity.reward)}
              </span>
            )}
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="text-muted-foreground transition-colors group-hover:text-primary"
            aria-label={`Ver ${opportunity.title}`}
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
