// src/lib/gemeloComprador.ts
// ═══════════════════════════════════════════════════════════════════════
// GEMELO COMO COMPRADOR — La IA simula demanda recomendando servicios.
// Analiza los gaps del usuario y sugiere profesionales que podrían ayudarle.
// ═══════════════════════════════════════════════════════════════════════

export interface RecomendacionCompra {
  servicio: string;
  profesional: string;
  precio: string;
  beneficio: string; // qué eje sube
  match: number;
}

/**
 * Genera recomendaciones de servicios/profesionales que ayudarían al usuario.
 * Basado en sus gaps (ejes bajos) y skills faltantes.
 */
export function recomendarServicios(
  axes: { exec: number; qual: number; trans: number; fund: number },
  skills: string[],
): RecomendacionCompra[] {
  const recs: RecomendacionCompra[] = [];
  const hasSkill = (kw: string) => skills.some(s => s.toLowerCase().includes(kw));

  // Gap en Ejecución → necesita mentor técnico
  if (axes.exec < 50) {
    recs.push({
      servicio: 'Mentoría técnica personalizada',
      profesional: 'Mentor Senior verificado',
      precio: '$80/sesión',
      beneficio: 'Sube tu Ejecución (+15 estimado)',
      match: 90,
    });
  }

  // Gap en Calidad → necesita code review / auditoría
  if (axes.qual < 50) {
    recs.push({
      servicio: 'Code Review profesional',
      profesional: 'Arquitecto de Software',
      precio: '$150/proyecto',
      beneficio: 'Sube tu Calidad (+12 estimado)',
      match: 85,
    });
  }

  // Gap en Fundamento → necesita certificación / curso
  if (axes.fund < 50) {
    recs.push({
      servicio: 'Preparación para certificación',
      profesional: 'Instructor certificado',
      precio: '$200 (4 sesiones)',
      beneficio: 'Sube tu Fundamento (+20 estimado)',
      match: 88,
    });
  }

  // Gap en Trascendencia → necesita coaching de liderazgo
  if (axes.trans < 40) {
    recs.push({
      servicio: 'Coaching de liderazgo',
      profesional: 'Coach Ejecutivo',
      precio: '$120/sesión',
      beneficio: 'Sube tu Trascendencia (+10 estimado)',
      match: 82,
    });
  }

  // Si no tiene Docker y es dev → recomendar dockerización
  if (!hasSkill('docker') && (hasSkill('react') || hasSkill('node') || hasSkill('python'))) {
    recs.push({
      servicio: 'Dockerización de tu proyecto',
      profesional: 'DevOps Engineer',
      precio: '$300',
      beneficio: 'Agrega Docker a tus skills',
      match: 75,
    });
  }

  // Si no tiene testing
  if (!hasSkill('test') && !hasSkill('jest') && !hasSkill('cypress')) {
    recs.push({
      servicio: 'Setup de testing para tu proyecto',
      profesional: 'QA Engineer',
      precio: '$250',
      beneficio: 'Sube Calidad + nuevo skill',
      match: 70,
    });
  }

  return recs.sort((a, b) => b.match - a.match).slice(0, 3);
}
