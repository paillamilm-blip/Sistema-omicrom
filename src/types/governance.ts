// types/governance.ts
// Justicia descentralizada: disputas y arbitraje

export interface Dispute {
  id: string;
  job_id: string;
  plaintiff_id: string;
  defendant_id: string;
  reason: string;
  evidence_room_id: string;
  status: 'OPENED' | 'IN_REVIEW' | 'RESOLVED' | 'APPEALED';
  created_at: string;
}

export interface ArbitrationCase {
  id: string;
  dispute_id: string;
  arbiters: string[]; // Array de 3 user_ids
  evidence_hash: string;
  evidence_decrypted_at?: string;
  verdict: 'PLAINTIFF_WINS' | 'DEFENDANT_WINS' | 'PARTIAL' | null;
  reasoning: string;
  decision_date?: string;
  monetary_penalty_tokens: number;
  penalty_payee: string;
  reputation_impact: number;
  created_at: string;
}
