-- =====================================================================
-- Omicron · Datos de ejemplo (seed)
-- =====================================================================
-- Se ejecuta con `supabase db reset`. Poblamos las oportunidades, que no
-- dependen de usuarios autenticados. Los perfiles, habilidades, actividad
-- y ganancias se crean al registrarse cada usuario (ver trigger
-- handle_new_user) y se completan desde la app.
-- =====================================================================

insert into public.opportunities
  (title, description, type, reward_xp, reward, match, tags, company,
   commitment, location, deadline, requirements, level)
values
  (
    'Rediseño de panel analítico',
    'Startup fintech busca refactorizar su dashboard con Next.js y visualizaciones en tiempo real.',
    'proyecto', 1500, 2200, 94,
    array['Next.js', 'TypeScript', 'Charts'],
    'Fluxo Finance', '20h/semana', 'Remoto',
    '2026-08-15T00:00:00Z',
    array[
      'Experiencia sólida con Next.js (App Router) y TypeScript.',
      'Manejo de librerías de visualización (Recharts, D3 o similar).',
      'Buenas prácticas de accesibilidad y rendimiento.'
    ],
    'senior'
  ),
  (
    'Mentoría: Arquitectura de microservicios',
    'Acompaña a un equipo junior en el diseño de una arquitectura escalable orientada a eventos.',
    'mentoria', 900, 600, 87,
    array['Arquitectura', 'Node.js', 'Mentoring'],
    'Nébula Labs', '4h/semana', 'Remoto',
    '2026-07-30T00:00:00Z',
    array[
      'Experiencia liderando diseño de sistemas distribuidos.',
      'Comunicación clara y empatía para mentorear.',
      'Conocimiento de colas de mensajes y patrones event-driven.'
    ],
    'senior'
  ),
  (
    'Curso: Diseño de sistemas a escala',
    'Completa el track avanzado y desbloquea el siguiente nodo con un proyecto final evaluado.',
    'curso', 1200, null, 81,
    array['System Design', 'Caching', 'Colas'],
    'Omicron Academy', 'Autoguiado', 'Online',
    '2026-09-01T00:00:00Z',
    array[
      'Bases de backend y bases de datos.',
      'Disposición para un proyecto final evaluado.'
    ],
    'mid'
  ),
  (
    'Feature de colaboración en tiempo real',
    'Implementa edición colaborativa con CRDTs para una herramienta de documentación.',
    'proyecto', 1800, 3100, 76,
    array['WebSockets', 'CRDT', 'React'],
    'Docly', '30h/semana', 'Híbrido · Santiago',
    '2026-08-05T00:00:00Z',
    array[
      'Experiencia con sincronización en tiempo real.',
      'Familiaridad con CRDTs o OT.'
    ],
    'senior'
  ),
  (
    'Mentoría: Primeros pasos en TypeScript',
    'Guía a nuevos desarrolladores en el paso de JavaScript a TypeScript con buenas prácticas.',
    'mentoria', 700, 400, 90,
    array['TypeScript', 'Mentoring', 'Fundamentos'],
    'Codemos', '3h/semana', 'Remoto',
    '2026-07-20T00:00:00Z',
    array['Dominio de TypeScript.', 'Paciencia y didáctica.'],
    'mid'
  ),
  (
    'Curso: Testing moderno en React',
    'Aprende testing con Vitest, Testing Library y estrategias de cobertura efectiva.',
    'curso', 1000, null, 84,
    array['Testing', 'Vitest', 'React'],
    'Omicron Academy', 'Autoguiado', 'Online',
    '2026-09-15T00:00:00Z',
    array['Conocimientos básicos de React.'],
    'junior'
  );
