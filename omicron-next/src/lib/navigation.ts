import {
  Compass,
  LayoutDashboard,
  type LucideIcon,
  Trophy,
  User,
  Wallet,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

/** Rutas principales de la aplicacion (navegacion lateral). */
export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Oportunidades", href: "/oportunidades", icon: Compass },
  { label: "Ranking", href: "/ranking", icon: Trophy },
  { label: "Ganancias", href: "/ganancias", icon: Wallet },
  { label: "Perfil", href: "/perfil", icon: User },
];
