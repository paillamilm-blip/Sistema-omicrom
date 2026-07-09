import { CalendarDays, Flame, MapPin, Sparkles } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatNumber } from "@/lib/utils";
import type { NodeLevel, UserProfile } from "@/types";

interface ProfileHeaderProps {
  user: UserProfile;
  node: NodeLevel;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ProfileHeader({ user, node }: ProfileHeaderProps) {
  return (
    <Card className="overflow-hidden border-border/60">
      {/* Banner */}
      <div className="h-28 bg-omicron-gradient sm:h-32" />

      <CardContent className="p-6">
        <div className="-mt-16 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <Avatar className="h-24 w-24 ring-4 ring-card">
              <AvatarImage src={user.avatarUrl} alt={user.name} />
              <AvatarFallback className="text-2xl">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1 pb-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">
                  {user.name}
                </h1>
                <Badge variant="gradient" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  Nodo {node.current}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{user.handle}</p>
              <p className="text-sm font-medium">{user.role}</p>
            </div>
          </div>

          <Button variant="outline" className="shrink-0">
            Editar perfil
          </Button>
        </div>

        <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
          {user.bio}
        </p>

        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            {user.location}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" />
            Se unió el {formatDate(user.joinedAt)}
          </span>
          <span className="inline-flex items-center gap-1.5 text-amber-400">
            <Flame className="h-4 w-4" />
            {user.streak} días de racha
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
            {formatNumber(node.experience)} XP
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
