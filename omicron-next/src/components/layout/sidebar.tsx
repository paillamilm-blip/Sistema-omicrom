import { Sparkles } from "lucide-react";

import { Logo } from "@/components/dashboard/logo";

import { SidebarNav } from "./sidebar-nav";

/**
 * Sidebar fija de escritorio. Oculta en pantallas pequenas (se usa el
 * menu movil en su lugar).
 */
export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border/60 bg-card/40 lg:flex">
      <div className="flex h-16 items-center border-b border-border/60 px-6">
        <Logo />
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <SidebarNav />
      </div>

      <div className="m-3 rounded-xl border border-border/60 bg-omicron-radial p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-secondary" />
          Sube de nodo
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Completa oportunidades y gana XP para alcanzar el Nodo Arquitecto.
        </p>
      </div>
    </aside>
  );
}
