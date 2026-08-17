// types/jobs.ts
// Empleos, contratos y escrow

import type { NodeLevel } from './profile';

// ===== EMPLEOS (JOBS) =====
export type JobStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface JobPosting {
  id: string;
  company_id: string;
  title: string;
  description: string;
  required_skills: Array<{ node_id: string; min_level: number }>;
  required_node_level: NodeLevel;
  budget_usd: number;
  time_limit_hours: number;
  status: JobStatus;
  created_at: string;
  published_at: string;
}

export interface JobMatch {
  id: string;
  job_id: string;
  user_id: string;
  match_score: number; // 0-100
  rank: number; // 1, 2, 3
  match_reason: string;
  sent_at: string;
}

// ===== ESCROW =====
export interface EscrowContract {
  id: string;
  job_id: string;
  payer_id: string;
  payee_id: string;
  amount_usd: number;
  amount_tokens: number;
  status: 'LOCKED' | 'APPROVED' | 'RELEASED' | 'REFUNDED' | 'DISPUTED';
  ghost_approval_deadline: string;
  created_at: string;
  released_at?: string;
}
