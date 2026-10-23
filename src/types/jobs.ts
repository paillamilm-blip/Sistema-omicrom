// types/jobs.ts
// La fila que lee la Red Viva para medir la brecha. El match y el escrow
// salieron con el recorte de la Fase 5: no tienen pantalla ni tabla en uso.

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
