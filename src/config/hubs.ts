// config/hubs.ts
// Navegación por "hubs": agrupa las pestañas en grupos por intención,
// con etiquetas en lenguaje natural (claras y autoexplicativas).
import { Home, GraduationCap, Briefcase, Store, MessageCircle, Scale, type LucideIcon } from 'lucide-react';
import type { TabId } from '../types';

export interface HubMember { tab: TabId; label: string; }
export interface Hub { id: string; label: string; Icon: LucideIcon; members: HubMember[]; }

// ─────────────────────────────────────────────────────────────
// Navegación completa: los 6 hubs del ecosistema Ómicrom activos.
// (Anteriormente reducida a 3 hubs para un piloto controlado; se
// reactivaron Mercado, Billetera, Mensajes y Gobernanza — todos los
// módulos ya estaban construidos y probados, solo ocultos.)
// ─────────────────────────────────────────────────────────────
export const HUBS: Hub[] = [
  {
    id: 'perfil', label: 'Inicio', Icon: Home,
    members: [
      { tab: 'perfil', label: 'Inicio' },
      { tab: 'wallet', label: 'Billetera' },
    ],
  },
  {
    id: 'aprender', label: 'Academia', Icon: GraduationCap,
    members: [
      { tab: 'academia', label: 'Academia' },
      { tab: 'maxskill', label: 'Habilidades' },
    ],
  },
  {
    id: 'empleos', label: 'Empleos', Icon: Briefcase,
    members: [
      { tab: 'empleos', label: 'Empleos' },
    ],
  },
  {
    id: 'mercado', label: 'Mercado', Icon: Store,
    members: [
      { tab: 'market',  label: 'Servicios' },
      { tab: 'vault',   label: 'Bóveda' },
    ],
  },
  {
    id: 'chat', label: 'Mensajes', Icon: MessageCircle,
    members: [{ tab: 'chat', label: 'Mensajes' }],
  },
  {
    id: 'gobernanza', label: 'Gobernanza', Icon: Scale,
    members: [{ tab: 'gobernanza', label: 'Gobernanza' }],
  },
];

// Devuelve el hub al que pertenece una pestaña.
export function hubForTab(tab: TabId): Hub {
  return HUBS.find(h => h.members.some(m => m.tab === tab)) ?? HUBS[0];
}
