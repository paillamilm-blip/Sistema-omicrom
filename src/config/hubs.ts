// config/hubs.ts
// Navegación por "hubs": agrupa las 8 pestañas en 5 grupos por intención.
import { User, Zap, ShoppingCart, MessageCircle, Scale, type LucideIcon } from 'lucide-react';
import type { TabId } from '../types';

export interface HubMember { tab: TabId; label: string; }
export interface Hub { id: string; label: string; Icon: LucideIcon; members: HubMember[]; }

export const HUBS: Hub[] = [
  {
    id: 'perfil', label: 'PERFIL', Icon: User,
    members: [
      { tab: 'perfil', label: 'Identidad' },
      { tab: 'wallet', label: 'Wallet' },
    ],
  },
  {
    id: 'aprender', label: 'APRENDER', Icon: Zap,
    members: [
      { tab: 'maxskill', label: 'Árbol' },
      { tab: 'academia', label: 'Academia' },
    ],
  },
  {
    id: 'mercado', label: 'MERCADO', Icon: ShoppingCart,
    members: [
      { tab: 'market',  label: 'Servicios' },
      { tab: 'empleos', label: 'Empleos' },
      { tab: 'vault',   label: 'Bóveda' },
    ],
  },
  {
    id: 'chat', label: 'CHAT', Icon: MessageCircle,
    members: [{ tab: 'chat', label: 'Chat' }],
  },
  {
    id: 'gobernanza', label: 'GOBERN', Icon: Scale,
    members: [{ tab: 'gobernanza', label: 'Gobernanza' }],
  },
];

// Devuelve el hub al que pertenece una pestaña.
export function hubForTab(tab: TabId): Hub {
  return HUBS.find(h => h.members.some(m => m.tab === tab)) ?? HUBS[0];
}
