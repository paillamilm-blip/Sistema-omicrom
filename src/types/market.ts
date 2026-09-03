// types/market.ts
// Marketplace de servicios

import type { NodeType, NodeLevel } from './profile';

/** Perfil público resumido del vendedor (denormalizado para el listado). */
export interface MarketSeller {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  node_type: NodeType;
  node_level: NodeLevel;
  token_balance: number;
  pe_points: number;
  is_pioneer: boolean;
  bio: string | null;
  skills: string[] | null;
  location: string | null;
  created_at: string;
  reputation_score?: number;          // Gemelo: reputación 0-100 (sello de confianza)
  /** Fecha en que ganó el 0.5 % permanente (null/ausente = todavía no). */
  commission_floor_locked_at?: string | null;
  competencias_validadas?: number;    // nº de competencias validadas por IA (actas)
}

export interface MarketService {
  id: string;
  seller_id: string | null;       // null en datos demo
  title: string;
  description: string;
  price: number;                  // en tokens
  category: string;
  tags: string[] | null;
  rating: number;
  total_reviews: number;
  is_active: boolean;
  created_at: string;
  seller?: MarketSeller;
}
