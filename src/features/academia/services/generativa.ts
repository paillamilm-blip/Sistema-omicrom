// src/lib/academiaGenerativa.ts
// ═══════════════════════════════════════════════════════════════════════
// ACADEMIA GENERATIVA — Micro-cursos personalizados con IA on-demand.
// Si no hay cursos para una skill del usuario, la IA genera uno al vuelo.
// Cada micro-curso tiene: concepto, 3 preguntas, y otorga PE al completar.
// ═══════════════════════════════════════════════════════════════════════

// Usa aiClient centralizado (proxy-ai Edge Function server-side)
import { callAI } from '@/infrastructure/ai/client';

export interface MicroCurso {
  titulo: string;
  skill: string;
  concepto: string; // 2-3 párrafos de aprendizaje
  preguntas: { pregunta: string; opciones: string[]; correcta: number }[];
  peReward: number;
}

const SYS_PROMPT = `Eres Ómicron, el generador de micro-cursos adaptativos.
Genera un micro-curso práctico sobre la skill indicada.
El curso debe ser:
- Breve (2-3 párrafos de concepto, como una lección de 3 minutos)
- Práctico (con ejemplo real aplicable)
- En español latinoamericano, cercano y motivador
- 3 preguntas de validación (4 opciones cada una, índice correcta 0-3)

Responde SOLO JSON válido:
{"titulo":"nombre corto","concepto":"2-3 párrafos","preguntas":[{"pregunta":"...","opciones":["a","b","c","d"],"correcta":0}]}`;

/**
 * Genera un micro-curso personalizado para una skill del usuario.
 * Si falla la IA, retorna un curso genérico basado en la skill.
 */
export async function generarMicroCurso(skill: string, nivel?: string): Promise<MicroCurso> {
  try {
    const raw = await callAI([
      { role: 'system', content: SYS_PROMPT },
      { role: 'user', content: `Genera un micro-curso sobre: ${skill}. Nivel: ${nivel || 'intermedio'}.` },
    ], { maxTokens: 1024, temperature: 0.7, jsonMode: true });
    if (!raw) throw new Error('IA no disponible');
    let parsed: { titulo?: string; concepto?: string; preguntas?: { pregunta: string; opciones: string[]; correcta: number }[] } | null = null;
    try { parsed = JSON.parse(raw); } catch {
      const a = raw.indexOf('{'); const b = raw.lastIndexOf('}');
      if (a >= 0 && b > a) parsed = JSON.parse(raw.slice(a, b + 1));
    }
    if (parsed?.concepto && parsed?.preguntas) {
      return {
        titulo: parsed.titulo || `Micro-curso: ${skill}`,
        skill,
        concepto: parsed.concepto,
        preguntas: parsed.preguntas.slice(0, 3),
        peReward: 10,
      };
    }
    throw new Error('parse failed');
  } catch {
    // Fallback: curso genérico
    return {
      titulo: `Fundamentos de ${skill}`,
      skill,
      concepto: `${skill} es una competencia clave en el mercado actual. Dominarla te permite resolver problemas reales y destacar profesionalmente. Para mejorar en ${skill}, practica con proyectos pequeños, busca feedback de pares, y valida tu conocimiento con retos concretos.`,
      preguntas: [
        { pregunta: `¿Cuál es el beneficio principal de dominar ${skill}?`, opciones: ['Mayor empleabilidad', 'Solo es decorativo', 'No tiene beneficio', 'Es obsoleto'], correcta: 0 },
        { pregunta: `¿Cómo se mejora en ${skill}?`, opciones: ['Práctica con proyectos', 'Solo leyendo teoría', 'Esperando', 'No se puede'], correcta: 0 },
        { pregunta: `¿Qué valida tu nivel en ${skill}?`, opciones: ['Exámenes + proyectos', 'Solo certificados', 'Nada', 'Años trabajando'], correcta: 0 },
      ],
      peReward: 5,
    };
  }
}

/**
 * Genera micro-cursos para las top skills del usuario que no tienen curso en la BD.
 */
export async function generarCursosParaSkills(skills: string[], cursosExistentes: string[]): Promise<MicroCurso[]> {
  const faltantes = skills.filter(s => !cursosExistentes.some(c => c.toLowerCase().includes(s.toLowerCase())));
  const top3 = faltantes.slice(0, 3);
  const cursos = await Promise.all(top3.map(s => generarMicroCurso(s)));
  return cursos;
}
