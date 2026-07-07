// config/hubs.ts
// Navegación por "hubs": agrupa las pestañas en 5 grupos por intención,
// con etiquetas en lenguaje natural (claras y autoexplicativas).
import { User, GraduationCap, Briefcase, type LucideIcon } from 'lucide-react';
// 🧪 Store, MessageCircle, Scale quedan sin usar mientras Mercado/Mensajes/
// Gobernanza estén ocultos para el piloto (MVP). No se eliminan: se
// reactivan junto con sus hubs comentados más abajo.
// import { Store, MessageCircle, Scale } from 'lucide-react';
import type { TabId } from '../types';

export interface HubMember { tab: TabId; label: string; }
export interface Hub { id: string; label: string; Icon: LucideIcon; members: HubMember[]; }

// ─────────────────────────────────────────────────────────────
// 🧪 MVP PILOTO CONTROLADO: navegación reducida a sus funciones
// estructurales básicas — solo Perfil, Academia y Empleos.
// Los hubs de Mercado, Billetera (dentro de Perfil) y Gobernanza
// quedan comentados (no eliminados) para reactivarlos fácilmente
// después del piloto.
// ─────────────────────────────────────────────────────────────
export const HUBS: Hub[] = [
  {
    id: 'perfil', label: 'Perfil', Icon: User,
    members: [
      { tab: 'perfil', label: 'Mi Perfil' },
      // { tab: 'wallet', label: 'Billetera' }, // 🧪 oculto para el piloto (MVP)
    ],
  },
  {
    id: 'aprender', label: 'Academia', Icon: GraduationCap,
    members: [
      { tab: 'academia', label: 'Academia' },
      // { tab: 'maxskill', label: 'Habilidades' }, // 🧪 oculto para el piloto (MVP): mantiene solo 3 pestañas visibles (sin sub-nav)
    ],
  },
  {
    id: 'empleos', label: 'Empleos', Icon: Briefcase,
    members: [
      { tab: 'empleos', label: 'Empleos' },
    ],
  },
  // 🧪 oculto para el piloto (MVP) — Mercado (Servicios + Bóveda)
  // {
  //   id: 'mercado', label: 'Mercado', Icon: Store,
  //   members: [
  //     { tab: 'market',  label: 'Servicios' },
  //     { tab: 'vault',   label: 'Bóveda' },
  //   ],
  // },
  // 🧪 oculto para el piloto (MVP) — Mensajes
  // {
  //   id: 'chat', label: 'Mensajes', Icon: MessageCircle,
  //   members: [{ tab: 'chat', label: 'Mensajes' }],
  // },
  // 🧪 oculto para el piloto (MVP) — Gobernanza
  // {
  //   id: 'gobernanza', label: 'Gobernanza', Icon: Scale,
  //   members: [{ tab: 'gobernanza', label: 'Gobernanza' }],
  // },
];

// Devuelve el hub al que pertenece una pestaña.
export function hubForTab(tab: TabId): Hub {
  return HUBS.find(h => h.members.some(m => m.tab === tab)) ?? HUBS[0];
}
