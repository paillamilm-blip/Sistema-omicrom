import { Lock } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getIcon } from "@/lib/icon-map";
import { cn, formatDate } from "@/lib/utils";
import type { Achievement } from "@/types";

interface AchievementsGridProps {
  achievements: Achievement[];
}

export function AchievementsGrid({ achievements }: AchievementsGridProps) {
  const unlocked = achievements.filter((a) => a.unlocked).length;

  return (
    <Card className="border-border/60">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Insignias</CardTitle>
        <span className="text-sm text-muted-foreground">
          <span className="font-semibold text-gradient">{unlocked}</span> /{" "}
          {achievements.length}
        </span>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {achievements.map((achievement) => {
            const Icon = achievement.unlocked
              ? getIcon(achievement.icon)
              : Lock;
            return (
              <div
                key={achievement.id}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-colors",
                  achievement.unlocked
                    ? "border-border/60 bg-muted/30"
                    : "border-dashed border-border/60 opacity-60",
                )}
              >
                <span
                  className={cn(
                    "grid h-11 w-11 place-items-center rounded-full",
                    achievement.unlocked
                      ? "bg-omicron-gradient text-white shadow-glow"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-medium leading-tight">
                    {achievement.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {achievement.unlocked && achievement.unlockedAt
                      ? formatDate(achievement.unlockedAt)
                      : achievement.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
