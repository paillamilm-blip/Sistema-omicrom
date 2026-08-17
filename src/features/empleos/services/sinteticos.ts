// src/lib/empleosSinteticos.ts
// ═══════════════════════════════════════════════════════════════════════
// EMPLEOS SINTÉTICOS — Matches hipotéticos generados desde el perfil.
// Si no hay ofertas reales, muestra "lo que podrías tener" para motivar.
// ═══════════════════════════════════════════════════════════════════════

export interface EmpleoSintetico {
  titulo: string;
  match: number; // 0-100
  salario: string;
  gap: string; // qué te falta para calzar
  accion: string; // qué hacer para mejorar
}

/**
 * Genera matches hipotéticos basados en las skills y ejes del usuario.
 * No llama IA — es determinístico y rápido.
 */
export function generarEmpleosSinteticos(
  skills: string[],
  axes: { exec: number; qual: number; trans: number; fund: number },
  years: number,
): EmpleoSintetico[] {
  const resultados: EmpleoSintetico[] = [];
  const hasSkill = (kw: string) => skills.some(s => s.toLowerCase().includes(kw));

  // Frontend
  if (hasSkill('react') || hasSkill('frontend') || hasSkill('typescript')) {
    const match = Math.min(95, 50 + axes.exec * 0.3 + (years > 3 ? 15 : 0));
    resultados.push({
      titulo: 'Frontend Developer (React)',
      match: Math.round(match),
      salario: years >= 5 ? '$3.500–4.500/mes' : '$2.500–3.500/mes',
      gap: axes.exec < 60 ? 'Sube tu Ejecución validando más nodos' : match < 80 ? 'Agrega testing a tu stack' : '¡Estás listo!',
      accion: axes.exec < 60 ? 'Ir a Habilidades → validar nodo' : 'Postular cuando haya oferta real',
    });
  }

  // Backend / Full-Stack
  if (hasSkill('node') || hasSkill('python') || hasSkill('backend') || hasSkill('java')) {
    const match = Math.min(92, 45 + axes.exec * 0.25 + axes.fund * 0.2 + (years > 4 ? 10 : 0));
    resultados.push({
      titulo: 'Backend / Full-Stack Developer',
      match: Math.round(match),
      salario: years >= 5 ? '$4.000–5.500/mes' : '$3.000–4.000/mes',
      gap: axes.fund < 50 ? 'Refuerza tu Fundamento (certificaciones)' : 'Sube un proyecto a la Bóveda',
      accion: 'Convalidar credenciales → sube Fundamento',
    });
  }

  // Tech Lead
  if (years >= 4 && (hasSkill('liderazgo') || hasSkill('gestión') || axes.trans > 40)) {
    const match = Math.min(88, 30 + axes.trans * 0.3 + axes.exec * 0.2 + (years > 6 ? 15 : 0));
    resultados.push({
      titulo: 'Tech Lead / Engineering Manager',
      match: Math.round(match),
      salario: '$5.000–7.000/mes',
      gap: axes.trans < 50 ? 'Sube tu Trascendencia (mentoriza, comparte)' : 'Publica un caso de liderazgo en la Bóveda',
      accion: 'Ir a Bóveda → compartir experiencia',
    });
  }

  // Diseño
  if (hasSkill('diseño') || hasSkill('ux') || hasSkill('figma')) {
    const match = Math.min(90, 50 + axes.qual * 0.3 + (years > 2 ? 10 : 0));
    resultados.push({
      titulo: 'Product Designer UX/UI',
      match: Math.round(match),
      salario: years >= 4 ? '$3.500–4.500/mes' : '$2.500–3.500/mes',
      gap: axes.qual < 55 ? 'Mejora tu Calidad con un case study' : 'Portfolio sólido — ¡a postular!',
      accion: 'Crear case study en la Bóveda',
    });
  }

  // Data / IA
  if (hasSkill('data') || hasSkill('machine') || hasSkill('python') || hasSkill('analytics')) {
    const match = Math.min(85, 40 + axes.fund * 0.3 + axes.exec * 0.2);
    resultados.push({
      titulo: 'Data Analyst / ML Engineer',
      match: Math.round(match),
      salario: '$3.500–5.000/mes',
      gap: axes.fund < 50 ? 'Certifica tu base teórica' : 'Publica un análisis en la Bóveda',
      accion: 'Ir a Academia → curso de Data',
    });
  }

  // Genérico para todos
  if (resultados.length === 0) {
    resultados.push({
      titulo: 'Profesional en tu área',
      match: Math.round(30 + axes.exec * 0.2 + years * 3),
      salario: '$2.000–3.500/mes',
      gap: 'Sube tu CV para activar matches reales',
      accion: 'Convalidar CV → desbloquea matching',
    });
  }

  return resultados.sort((a, b) => b.match - a.match).slice(0, 4);
}
