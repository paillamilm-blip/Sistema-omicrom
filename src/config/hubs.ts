// config/hubs.ts
// Navegación por "hubs": agrupa las pestañas en 5 grupos por intención,
// con etiquetas en lenguaje natural (claras y autoexplicativas).
import { User, GraduationCap, Store, MessageCircle, Scale, type LucideIcon } from 'lucide-react';
import type { TabId } from '../types';

export interface HubMember { tab: TabId; label: string; }
export interface Hub { id: string; label: string; Icon: LucideIcon; members: HubMember[]; }

export const HUBS: Hub[] = [
  {
    id: 'perfil', label: 'Perfil', Icon: User,
    members: [
      { tab: 'perfil', label: 'Mi Perfil' },
      { tab: 'wallet', label: 'Billetera' },
    ],
  },
  {
    id: 'aprender', label: 'Aprender', Icon: GraduationCap,
    members: [
      { tab: 'maxskill', label: 'Habilidades' },
      { tab: 'academia', label: 'Academia' },
    ],
  },
  {
    id: 'mercado', label: 'Mercado', Icon: Store,
    members: [
      { tab: 'market',  label: 'Servicios' },
      { tab: 'empleos', label: 'Empleos' },
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
