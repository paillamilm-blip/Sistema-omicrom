// types/skills.ts
// Árbol de habilidades, tests, exámenes y actas de evidencia

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
