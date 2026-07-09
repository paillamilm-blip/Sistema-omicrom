import { Bell, Search } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { UserProfile } from "@/types";

import { Logo } from "./logo";

interface DashboardHeaderProps {
  user: UserProfile;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 glass">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo />

        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="hidden text-muted-foreground sm:inline-flex"
            aria-label="Buscar"
          >
            <Search className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="relative text-muted-foreground"
            aria-label="Notificaciones"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-secondary ring-2 ring-background" />
          </Button>

          <div className="flex items-center gap-3 rounded-full border border-border/60 bg-card/50 py-1 pl-1 pr-3">
            <Avatar className="h-8 w-8 ring-2 ring-primary/40">
              <AvatarImage src={user.avatarUrl} alt={user.name} />
              <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <div className="hidden leading-tight sm:block">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.handle}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
