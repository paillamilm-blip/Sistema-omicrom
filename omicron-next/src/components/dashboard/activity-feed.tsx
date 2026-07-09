import {
  ArrowUp,
  Award,
  Briefcase,
  type LucideIcon,
  Wallet,
  Zap,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, timeAgo } from "@/lib/utils";
import type { ActivityItem, ActivityKind } from "@/types";

interface ActivityFeedProps {
  items: ActivityItem[];
}

const KIND_META: Record<ActivityKind, { icon: LucideIcon; className: string }> =
  {
    xp: { icon: Zap, className: "text-primary bg-primary/15" },
    node_up: { icon: ArrowUp, className: "text-secondary bg-secondary/15" },
    opportunity: { icon: Briefcase, className: "text-sky-400 bg-sky-500/15" },
    achievement: { icon: Award, className: "text-amber-400 bg-amber-500/15" },
    earning: { icon: Wallet, className: "text-emerald-400 bg-emerald-500/15" },
  };

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle>Actividad reciente</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="relative space-y-5 before:absolute before:left-[15px] before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-border">
          {items.map((item) => {
            const meta = KIND_META[item.kind];
            const Icon = meta.icon;
            return (
              <li key={item.id} className="relative flex gap-3">
                <span
                  className={cn(
                    "z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full ring-4 ring-card",
                    meta.className,
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="flex-1 pt-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{item.title}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {timeAgo(item.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
