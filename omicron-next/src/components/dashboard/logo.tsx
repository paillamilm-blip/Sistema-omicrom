import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showWordmark?: boolean;
}

/**
 * Logo de Omicron: la letra griega "ο" (ómicron) estilizada como un nodo
 * con un anillo en degradado azul -> morado, acompañada del wordmark.
 */
export function Logo({ className, showWordmark = true }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-omicron-gradient shadow-glow">
        <span className="grid h-4 w-4 place-items-center rounded-full border-2 border-white/90">
          <span className="h-1 w-1 rounded-full bg-white" />
        </span>
      </span>
      {showWordmark && (
        <span className="text-lg font-bold tracking-tight">
          Omi<span className="text-gradient">cron</span>
        </span>
      )}
    </div>
  );
}
