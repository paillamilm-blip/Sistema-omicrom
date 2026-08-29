-- 0064_seed_content.sql
-- CONTENIDO SEMILLA — Rompe el problema huevo-gallina.
-- 5 cursos + 3 empleos demo + 5 servicios demo.
-- Marcados como "demo" para reemplazar con contenido real después.
--
-- NOTA: las columnas id de academy_courses, course_lessons, job_postings y
-- market_services son de tipo uuid. Usamos literales uuid deterministas para
-- que ON CONFLICT (id) DO NOTHING siga siendo idempotente.

-- ═══ CURSOS SEMILLA ═══
INSERT INTO academy_courses (id, title, description, cover_emoji, difficulty, passing_score, order_index, is_published, node_id)
VALUES
  ('11111111-1111-4111-8111-111111110001', 'React: Hooks y Componentes', 'Aprende los fundamentos modernos de React con hooks, state y efectos. Curso práctico con ejemplos reales.', '⚛️', 2, 70, 1, true, null),
  ('11111111-1111-4111-8111-111111110002', 'Docker en 30 minutos', 'Contenedores desde cero: Dockerfile, build, run, compose. Todo lo que necesitas para empezar con DevOps.', '🐳', 2, 70, 2, true, null),
  ('11111111-1111-4111-8111-111111110003', 'Liderazgo para Tech Leads', 'Transición de developer a líder técnico. Delegación, feedback efectivo y gestión de equipo.', '👑', 3, 60, 3, true, null),
  ('11111111-1111-4111-8111-111111110004', 'UX Writing: Diseña con palabras', 'Micro-copy que convierte. Cómo escribir textos de interfaz claros, empáticos y accionables.', '✍️', 1, 70, 4, true, null),
  ('11111111-1111-4111-8111-111111110005', 'Excel Avanzado: Dashboards y Macros', 'Tablas dinámicas, Power Query, macros VBA básicas. Transforma datos en decisiones.', '📊', 3, 70, 5, true, null)
ON CONFLICT (id) DO NOTHING;

-- Lecciones semilla (1 por curso para que no esté vacío)
-- course_id apunta al mismo uuid del curso padre correspondiente.
INSERT INTO course_lessons (id, course_id, title, content, order_index)
VALUES
  ('22222222-2222-4222-8222-222222220001', '11111111-1111-4111-8111-111111110001', 'useState y useEffect', 'Los hooks son funciones especiales de React que permiten usar estado y efectos secundarios en componentes funcionales.\n\n**useState** te da una variable de estado y una función para actualizarla:\n```jsx\nconst [count, setCount] = useState(0);\n```\n\n**useEffect** ejecuta código cuando el componente se monta o cuando una dependencia cambia:\n```jsx\nuseEffect(() => { document.title = `Clicks: ${count}`; }, [count]);\n```\n\nPractica: crea un contador que actualice el título de la página.', 1),
  ('22222222-2222-4222-8222-222222220002', '11111111-1111-4111-8111-111111110002', 'Tu primer Dockerfile', 'Un Dockerfile describe cómo construir tu imagen.\n\n```dockerfile\nFROM node:18-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm install\nCOPY . .\nEXPOSE 3000\nCMD ["npm", "start"]\n```\n\nCada instrucción crea una capa. Las capas se cachean para builds rápidos.\n\nPractica: dockeriza tu proyecto actual con este template.', 1),
  ('22222222-2222-4222-8222-222222220003', '11111111-1111-4111-8111-111111110003', 'De Developer a Líder', 'El error #1 de un nuevo tech lead: seguir programando todo el día.\n\nTu rol ahora es **multiplicar** la productividad del equipo, no solo la tuya.\n\n3 prioridades del primer mes:\n1. Escucha antes de cambiar\n2. Establece 1-on-1s semanales\n3. Define un "definition of done" compartido\n\nRecuerda: tu código más importante ahora es la comunicación.', 1),
  ('22222222-2222-4222-8222-222222220004', '11111111-1111-4111-8111-111111110004', 'Micro-copy que convierte', 'Las palabras en tu interfaz son diseño.\n\nMalas: "Error: campo inválido"\nBuenas: "Ingresa un correo válido (ej: tu@email.com)"\n\n3 principios:\n1. **Claro** antes que creativo\n2. **Breve** (cada palabra cuenta)\n3. **Humano** (habla como persona, no como sistema)\n\nEjercicio: reescribe los mensajes de error de tu app actual.', 1),
  ('22222222-2222-4222-8222-222222220005', '11111111-1111-4111-8111-111111110005', 'Tablas dinámicas en 5 pasos', '1. Selecciona tus datos (Ctrl+T para tabla)\n2. Insertar → Tabla dinámica\n3. Arrastra campos a Filas/Columnas/Valores\n4. Click derecho → Agrupar (por mes, trimestre)\n5. Insertar → Gráfico dinámico\n\nTruco pro: usa Segmentación de datos para filtros visuales interactivos.\n\nDesafío: crea un dashboard de ventas con 3 gráficos que se filtren juntos.', 1)
ON CONFLICT (id) DO NOTHING;

-- ═══ EMPLEOS SEMILLA ═══
-- job_postings.company_id es NOT NULL con FK a profiles. El perfil demo de la
-- empresa puede no existir en una DB fresca, así que insertamos de forma
-- tolerante: solo si el perfil '00000000-0000-0000-0000-000000000001' existe.
DO $seed_jobs$
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000001') THEN
    INSERT INTO job_postings (id, company_id, title, description, category, tags, required_node_level, budget_usd, time_limit_hours, status, published_at)
    VALUES
      ('33333333-3333-4333-8333-333333330001', '00000000-0000-0000-0000-000000000001', 'Frontend Developer (React)', 'Buscamos desarrollador frontend con experiencia en React, TypeScript y diseño responsivo. Proyecto de 3 meses, remoto.', 'desarrollo', ARRAY['React', 'TypeScript', 'CSS'], 1, 3000, 480, 'OPEN', now()),
      ('33333333-3333-4333-8333-333333330002', '00000000-0000-0000-0000-000000000001', 'Product Designer UX/UI', 'Diseñador de producto para app mobile. Figma, research, prototipado rápido. Startup en crecimiento.', 'diseño', ARRAY['Figma', 'UX', 'Mobile'], 1, 3500, 320, 'OPEN', now()),
      ('33333333-3333-4333-8333-333333330003', '00000000-0000-0000-0000-000000000001', 'Tech Lead — Full Stack', 'Líder técnico para equipo de 5 devs. Arquitectura, code review, mentoring. Stack: Node + React + PostgreSQL.', 'liderazgo', ARRAY['Node.js', 'Arquitectura', 'Liderazgo'], 2, 5500, 720, 'OPEN', now())
    ON CONFLICT (id) DO NOTHING;
  ELSE
    RAISE NOTICE 'Seed empleos omitido: perfil empresa 00000000-0000-0000-0000-000000000001 no existe.';
  END IF;
END;
$seed_jobs$;

-- ═══ SERVICIOS SEMILLA (MERCADO) ═══
-- market_services.seller_id es NOT NULL (con FK a profiles). En vez de null,
-- usamos un vendedor disponible (perfil demo empresa si existe, si no cualquier
-- perfil). Si no hay ningún perfil, se omite para no romper la FK/NOT NULL.
DO $seed_svc$
DECLARE
  v_seller uuid;
BEGIN
  SELECT id INTO v_seller FROM public.profiles
   WHERE id = '00000000-0000-0000-0000-000000000001';
  IF v_seller IS NULL THEN
    SELECT id INTO v_seller FROM public.profiles ORDER BY id LIMIT 1;
  END IF;

  IF v_seller IS NOT NULL THEN
    INSERT INTO market_services (id, seller_id, title, description, category, tags, price, rating, total_reviews, is_active)
    VALUES
      ('44444444-4444-4444-8444-444444440001', v_seller, 'Desarrollo de Landing Page', 'Landing page profesional, responsive, optimizada para conversión. Entrega en 5 días.', 'desarrollo', ARRAY['React', 'Landing', 'Web'], 500, 4.8, 12, true),
      ('44444444-4444-4444-8444-444444440002', v_seller, 'Diseño de Sistema de Diseño', 'Tokens, componentes Figma, documentación. Para equipos que quieren escalar su UI.', 'diseño', ARRAY['Figma', 'Design System', 'UI'], 800, 4.9, 8, true),
      ('44444444-4444-4444-8444-444444440003', v_seller, 'Mentoría Tech (4 sesiones)', '4 sesiones 1-on-1 de 1 hora. Para devs que quieren llegar a senior. Stack agnostic.', 'mentoría', ARRAY['Mentoría', 'Carrera', 'Senior'], 200, 5.0, 15, true),
      ('44444444-4444-4444-8444-444444440004', v_seller, 'Consultoría de Arquitectura', 'Revisión de arquitectura + recomendaciones documentadas. Ideal pre-escala.', 'consultoría', ARRAY['Arquitectura', 'Escalabilidad', 'Cloud'], 400, 4.7, 6, true),
      ('44444444-4444-4444-8444-444444440005', v_seller, 'Dashboard de Datos (Excel/BI)', 'Dashboard interactivo con tus datos. Power BI o Excel avanzado. Entrega en 3 días.', 'datos', ARRAY['Excel', 'Dashboard', 'Data'], 300, 4.6, 9, true)
    ON CONFLICT (id) DO NOTHING;
  ELSE
    RAISE NOTICE 'Seed servicios omitido: no existe ningún perfil para asignar como seller_id.';
  END IF;
END;
$seed_svc$;

NOTIFY pgrst, 'reload schema';
