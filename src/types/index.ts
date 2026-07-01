// types/index.ts
// Tipos centralizados del Sistema Ómicron

// ===== AUTHENTICATION =====
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'no_access';

// ===== TAB NAVIGATION =====
export type TabId = 'perfil' | 'maxskill' | 'academia' | 'empleos' | 'chat' | 'market' | 'wallet' | 'gobernanza' | 'vault';

// ===== PROFILE & REPUTATION =====
export type NodeLevel = 1 | 2 | 3;
export type NodeStatus = 'ACTIVE' | 'SUSPENDED' | 'DEGRADED';
// ✅ Taxonomía oficial unificada (fuente única en src/config/nodes.ts)
export type NodeType = 'Nodo Operativo' | 'Nodo Core' | 'Nodo Arquitecto' | 'Nodo Fundador';

export interface Profile {
  id: string;
  email?: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  bio?: string;
  location?: string;       // ✅ añadido: ubicación del nodo
  skills?: string[];       // ✅ añadido: habilidades declaradas

  // === TOKENS Y WALLET ===
  token_balance: number;
  token_escrow?: number;   // ✅ añadido: tokens bloqueados en escrow

  // === PUNTOS DE EXPERIENCIA ===
  pe_points: number;

  // === REPUTACIÓN (0-100) ===
  reputation_score: number;
  reputation_updated_at: string;

  // === GEMELO DIGITAL: 4 EJES (0-100) ===
  execution_score: number;         // Rapidez
  quality_score: number;           // Calidad técnica
  transcendence_score: number;     // Compartición conocimiento
  foundation_score: number;        // Fundamento teórico

  // === PONDERACIÓN 80/20 ===
  traditional_score: number;       // 20% (títulos, portafolio)
  experience_score: number;        // 80% (PE, desempeño)

  // === SISTEMA DE NODOS ===
  node_level: NodeLevel;
  node_status: NodeStatus;
  node_type: NodeType;
  is_pioneer: boolean;
  last_audit_date?: string;


  // === FLAGS ===
  is_verified_professional: boolean;
  can_receive_contracts: boolean;
  is_premium?: boolean;             // Ómicrom Premium: desbloquea las funciones de IA

  // === CONTADORES ===
  total_contracts_completed: number;
  total_earnings: number;

  created_at: string;
  updated_at: string;
}

// === GEMELO DIGITAL (Radar Chart Data) ===
export interface GemeloDigital {
  execution: number;
  quality: number;
  transcendence: number;
  foundation: number;
  overallReputation: number;
}

// === REPUTACIÓN HISTORY ===
export interface ReputationHistoryEntry {
  id: string;
  user_id: string;
  old_reputation: number;
  new_reputation: number;
  old_execution_score: number;
  new_execution_score: number;
  old_quality_score: number;
  new_quality_score: number;
  old_transcendence_score: number;
  new_transcendence_score: number;
  old_foundation_score: number;
  new_foundation_score: number;
  reason: string;
  trigger_event_id?: string;
  created_at: string;
}

// ===== ÁRBOL DE HABILIDADES =====
export type SkillCategory = 'FOUNDATION' | 'SPECIALIZATION' | 'ADVANCED';
export type SkillProgressStatus = 'LOCKED' | 'IN_PROGRESS' | 'VALIDATED' | 'MASTERED';
export type TestResult = 'PASS' | 'FAIL' | 'TIMEOUT' | 'ERROR';


export interface SkillTreeNode {
  id: string;
  title: string;
  description: string;
  category: SkillCategory;
  parent_node_id?: string;
  difficulty_level: number; // 1-5
  pe_reward: number;
  estimated_hours: number;
  icon: string; // Lucide icon name
  color: string; // Tailwind color
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface UserSkillProgress {
  id: string;
  user_id: string;
  node_id: string;
  status: SkillProgressStatus;
  progress_percentage: number; // 0-100
  attempts: number;
  best_time_seconds?: number;
  validated_at?: string;
  created_at: string;

  // Datos relacionados (para convenencia en frontend)
  node?: SkillTreeNode;
  tests?: SkillTest[];
}

export interface SkillTest {
  id: string;
  node_id: string;
  test_name: string;
  description: string;
  problem_statement: string;
  test_cases: Array<{
    input: string;
    expected_output: string;
    explanation: string;
  }>;
  time_limit_seconds: number;
  passing_score: number; // 0-100
  difficulty_multiplier: number;
  created_at: string;
  updated_at: string;
}


export interface SkillTestAttempt {
  id: string;
  user_id: string;
  test_id: string;
  submission_code: string;
  result: TestResult;
  score: number; // 0-100
  time_taken_seconds: number;
  error_message?: string;
  attempted_at: string;
}

// ===== EXAMINADOR IA / ACTA DE EVIDENCIA =====
export interface ExamMultipleChoice { pregunta: string; opciones: string[]; }
export interface ExamGenerated {
  session_id: string;
  node: { id: string; title: string };
  multiple_choice: ExamMultipleChoice[];
  caso: { enunciado: string };
}
export interface ExamEjes {
  ejecucion: number;
  calidad: number;
  trascendencia: number;
  fundamento: number;
}
export interface ExamResultado {
  acta_id: string;
  node: { id: string; title: string } | null;
  veredicto: 'APROBADO' | 'REPROBADO';
  puntaje_global: number;
  ejes: ExamEjes;
  resumen: string;
  feedback: string;
}
export interface ActaEvidencia {
  id: string;
  user_id: string;
  node_id: string;
  ejecucion: number;
  calidad: number;
  trascendencia: number;
  fundamento: number;
  puntaje_global: number;
  veredicto: 'APROBADO' | 'REPROBADO';
  resumen: string | null;
  detalle: unknown;
  validador: string;
  created_at: string;
}

// ===== NOTIFICACIONES =====
export type NotificationType =
  | 'JOB_MATCH'
  | 'REPUTATION_ALERT'
  | 'AUDIT_TRIGGERED'
  | 'DISPUTE_OPENED'
  | 'ARBITRATION_VERDICT'
  | 'CONTRACT_COMPLETED'
  | 'MESSAGE_RECEIVED';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  related_id?: string;
  is_read: boolean;
  created_at: string;
}

// ===== APP STATE (Context) =====
export interface AppState {
  // === AUTH ===
  authStatus: AuthStatus;
  isLoadingProfile: boolean;

  // === PROFILE ===
  profile: Profile | null;

  // === NAVIGATION ===
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;

  // === NOTIFICATIONS ===
  unreadCount: number;
  setUnreadCount: (count: number) => void;

  // === ACTIONS ===
  refreshProfile: () => Promise<void>;
}


// ===== EMPLEOS (JOBS) - Para futuro módulo =====
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

// ===== CHAT & ESCROW - Para futuro módulo =====
export interface ChatRoom {
  id: string;
  job_id: string;
  participant_1: string;
  participant_2: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'DISPUTED';
  created_at: string;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  message_hash: string;
  created_at: string;
}


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

// ===== JUSTICIA DESCENTRALIZADA - Para futuro módulo =====
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


// ===== UTILIDADES =====
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ReputationUpdateInput {
  user_id: string;
  execution_delta?: number;
  quality_delta?: number;
  transcendence_delta?: number;
  foundation_delta?: number;
  reason: string;
  trigger_event_id?: string;
}


// ===== MARKET =====
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

// ===== WALLET =====
export type WalletTransactionType =
  | 'deposit'
  | 'escrow_lock'
  | 'escrow_release'
  | 'refund'
  | 'commission'
  | 'withdrawal';

export interface WalletTransaction {
  id: string;
  user_id: string;
  type: WalletTransactionType;
  amount: number;
  balance_after: number | null;
  description: string | null;
  reference_id: string | null;
  created_at: string;
}

// ===== MENSAJERÍA (chat directo) =====
export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string | null;
  network_id: string | null;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: { id: string; username: string };
}
