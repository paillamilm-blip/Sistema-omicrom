import {
  Award,
  Briefcase,
  Building2,
  Flame,
  type LucideIcon,
  Rocket,
  Sparkles,
  Trophy,
  Users,
  Wallet,
  Zap,
} from "lucide-react";

/**
 * Mapa de nombres (strings provenientes de datos) a componentes de icono.
 * Permite que la capa de datos referencie iconos por nombre sin acoplar
 * componentes de React a los datos.
 */
export const iconMap: Record<string, LucideIcon> = {
  Award,
  Briefcase,
  Building2,
  Flame,
  Rocket,
  Sparkles,
  Trophy,
  Users,
  Wallet,
  Zap,
};

/** Resuelve un icono por nombre, con fallback a `Sparkles`. */
export function getIcon(name: string): LucideIcon {
  return iconMap[name] ?? Sparkles;
}
