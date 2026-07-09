import { Crown, Minus, TrendingDown, TrendingUp } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn, formatNumber } from "@/lib/utils";
import type { RankingEntry } from "@/types";

interface LeaderboardProps {
  entries: RankingEntry[];
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function DeltaBadge({ delta }: { delta: number }) {
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
      </span>
    );
  }
  const up = delta > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        up ? "text-emerald-400" : "text-destructive",
      )}
    >
      {up ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {Math.abs(delta)}
    </span>
  );
}

const PODIUM_STYLES = [
  "order-2 sm:-translate-y-4 ring-amber-400/50", // 1°
  "order-1 ring-slate-300/40", // 2°
  "order-3 ring-orange-500/40", // 3°
];

export function Leaderboard({ entries }: LeaderboardProps) {
  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="space-y-8">
      {/* Podio */}
      <div className="grid grid-cols-3 items-end gap-3 sm:gap-4">
        {podium.map((entry, i) => (
          <Card
            key={entry.user.id}
            className={cn(
              "relative flex flex-col items-center gap-2 border-border/60 bg-omicron-radial p-4 text-center ring-1",
              PODIUM_STYLES[i],
              entry.isCurrentUser && "border-primary/60",
            )}
          >
            {i === 0 && (
              <Crown className="absolute -top-3 h-6 w-6 text-amber-400" />
            )}
            <span className="text-xs font-bold text-muted-foreground">
              #{entry.position}
            </span>
            <Avatar className="h-14 w-14 ring-2 ring-primary/40">
              <AvatarImage src={entry.user.avatarUrl} alt={entry.user.name} />
              <AvatarFallback>{initials(entry.user.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {entry.user.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                Nodo {entry.node}
              </p>
            </div>
            <p className="text-sm font-bold text-gradient">
              {formatNumber(entry.experience)} XP
            </p>
          </Card>
        ))}
      </div>

      {/* Lista */}
      <Card className="divide-y divide-border/60 border-border/60">
        {rest.map((entry) => (
          <div
            key={entry.user.id}
            className={cn(
              "flex items-center gap-4 px-4 py-3 transition-colors sm:px-6",
              entry.isCurrentUser ? "bg-primary/5" : "hover:bg-muted/30",
            )}
          >
            <span className="w-6 text-center text-sm font-semibold text-muted-foreground">
              {entry.position}
            </span>
            <Avatar className="h-10 w-10">
              <AvatarImage src={entry.user.avatarUrl} alt={entry.user.name} />
              <AvatarFallback>{initials(entry.user.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium">
                  {entry.user.name}
                </p>
                {entry.isCurrentUser && (
                  <Badge variant="gradient" className="shrink-0">
                    Tú
                  </Badge>
                )}
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {entry.nodeName}
              </p>
            </div>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">
                {formatNumber(entry.experience)}
              </p>
              <p className="text-xs text-muted-foreground">XP</p>
            </div>
            <div className="w-8 text-right">
              <DeltaBadge delta={entry.delta} />
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
