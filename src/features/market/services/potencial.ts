// src/lib/mercadoPotencial.ts
// ═══════════════════════════════════════════════════════════════════════
// MERCADO DE POTENCIAL — Sugiere servicios que el usuario podría ofrecer.
// Basado en sus skills reales con %. Si tiene React al 92%, puede vender
// desarrollo frontend. El marketplace se auto-seedea con los usuarios.
// ═══════════════════════════════════════════════════════════════════════

export interface ServicioSugerido {
  titulo: string;
  descripcion: string;
  precioEstimado: string;
  skillBase: string;
  pctDominio: number;
}

/**
 * Genera sugerencias de servicios que el usuario podría publicar.
 * No usa IA — es determinístico y rápido.
 */
export function sugerirServicios(
  skillsDetail: { name: string; pct: number }[],
): ServicioSugerido[] {
  const sugerencias: ServicioSugerido[] = [];

  const serviciosPorSkill: Record<string, { titulo: string; descripcion: string; precio: string }[]> = {
    react: [
      { titulo: 'Desarrollo de Landing Pages', descripcion: 'Landing pages profesionales, responsive y optimizadas para conversión.', precio: '$400–800' },
      { titulo: 'Componentes React a medida', descripcion: 'Desarrollo de componentes reutilizables con TypeScript y testing.', precio: '$200–500' },
    ],
    typescript: [
      { titulo: 'Migración a TypeScript', descripcion: 'Migro tu proyecto JS a TypeScript con tipos estrictos y sin romper nada.', precio: '$500–1.200' },
    ],
    node: [
      { titulo: 'API REST con Node.js', descripcion: 'Backend completo con autenticación, validación y deploy.', precio: '$600–1.500' },
    ],
    python: [
      { titulo: 'Automatización con Python', descripcion: 'Scripts para automatizar procesos repetitivos. Scraping, reportes, ETL.', precio: '$300–800' },
      { titulo: 'Análisis de datos', descripcion: 'Exploración, limpieza y visualización de datos con Pandas + Matplotlib.', precio: '$400–1.000' },
    ],
    figma: [
      { titulo: 'Diseño UI/UX de app', descripcion: 'Wireframes + UI completa en Figma con prototipo interactivo.', precio: '$800–2.000' },
    ],
    'diseño': [
      { titulo: 'Identidad visual', descripcion: 'Logo + paleta + tipografía + guía de marca para tu proyecto.', precio: '$500–1.500' },
    ],
    liderazgo: [
      { titulo: 'Mentoría de carrera', descripcion: 'Sessions 1-on-1 para devs que quieren llegar a senior o liderar equipos.', precio: '$80–150/sesión' },
    ],
    docker: [
      { titulo: 'Dockerización de proyecto', descripcion: 'Contenedorizo tu app + docker-compose + CI/CD básico.', precio: '$200–500' },
    ],
    excel: [
      { titulo: 'Dashboard ejecutivo', descripcion: 'Dashboard interactivo con tus datos reales. Tablas dinámicas + gráficos.', precio: '$200–500' },
    ],
  };

  for (const skill of skillsDetail) {
    if (skill.pct < 60) continue; // Solo sugerir si domina al 60%+
    const lower = skill.name.toLowerCase();
    for (const [key, servicios] of Object.entries(serviciosPorSkill)) {
      if (lower.includes(key)) {
        for (const svc of servicios) {
          if (sugerencias.length >= 4) break;
          sugerencias.push({
            titulo: svc.titulo,
            descripcion: svc.descripcion,
            precioEstimado: svc.precio,
            skillBase: skill.name,
            pctDominio: skill.pct,
          });
        }
      }
    }
  }

  // Fallback: mentoría genérica si no hay matches específicos
  if (sugerencias.length === 0 && skillsDetail.length > 0) {
    const top = skillsDetail[0];
    sugerencias.push({
      titulo: `Mentoría en ${top.name}`,
      descripcion: `Comparte tu experiencia en ${top.name} con profesionales que están empezando.`,
      precioEstimado: '$50–100/sesión',
      skillBase: top.name,
      pctDominio: top.pct,
    });
  }

  return sugerencias;
}
