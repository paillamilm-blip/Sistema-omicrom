-- =====================================================================
-- 0054_multidisciplina_skill_nodes.sql
-- Expande el árbol de habilidades para cubrir TODAS las disciplinas:
-- Ingeniería Industrial, Automatización (PLC/SCADA), Procesos (PET/Inyección),
-- Diseño UX/UI, Gestión de Proyectos, Ciencia de Datos, Electrónica.
--
-- El Simulador Universal detecta la categoría y adapta el modo de evaluación:
-- - SOFTWARE/DATA → modo CÓDIGO (sandbox)
-- - INGENIERIA/PROCESOS/AUTOMATIZACION/DISEÑO/GESTION → modo ANÁLISIS (IA)
--
-- Idempotente (ON CONFLICT DO NOTHING en cada insert).
-- =====================================================================

-- ── 1) Ampliar el constraint de categoría ────────────────────────────
-- El constraint original solo permite FOUNDATION/SPECIALIZATION/ADVANCED.
-- Lo reemplazamos por uno que soporte categorías de disciplina.
ALTER TABLE public.skill_tree_nodes DROP CONSTRAINT IF EXISTS skill_tree_nodes_category_check;
ALTER TABLE public.skill_tree_nodes ADD CONSTRAINT skill_tree_nodes_category_check
  CHECK (category IN (
    'FOUNDATION', 'SPECIALIZATION', 'ADVANCED',
    'SOFTWARE', 'DATA', 'INGENIERIA', 'AUTOMATIZACION',
    'PROCESOS', 'ELECTRONICA', 'DISEÑO', 'GESTION', 'ENERGIA'
  ));


-- ── 2) Nodos raíz por disciplina ─────────────────────────────────────

-- INGENIERÍA INDUSTRIAL
INSERT INTO public.skill_tree_nodes (id, title, description, category, difficulty_level, pe_reward, estimated_hours, icon, color, order_index)
VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Ingeniería Industrial', 'Fundamentos de ingeniería de procesos, optimización y mejora continua.', 'INGENIERIA', 1, 100, 8, 'Factory', 'cyan', 100),
  ('a1000000-0000-0000-0000-000000000002', 'Lean Manufacturing', 'Eliminación de desperdicios, flujo continuo, value stream mapping.', 'INGENIERIA', 2, 150, 12, 'TrendingUp', 'green', 101),
  ('a1000000-0000-0000-0000-000000000003', 'Six Sigma', 'Control estadístico de procesos, DMAIC, capacidad de proceso.', 'INGENIERIA', 3, 200, 16, 'Target', 'purple', 102),
  ('a1000000-0000-0000-0000-000000000004', 'Gestión de Calidad (ISO 9001)', 'Sistemas de gestión de calidad, auditorías internas, no conformidades.', 'INGENIERIA', 2, 150, 10, 'ShieldCheck', 'gold', 103)
ON CONFLICT (id) DO NOTHING;

-- AUTOMATIZACIÓN (PLC/SCADA)
INSERT INTO public.skill_tree_nodes (id, title, description, category, difficulty_level, pe_reward, estimated_hours, icon, color, order_index)
VALUES
  ('a2000000-0000-0000-0000-000000000001', 'Fundamentos PLC', 'Programación de controladores lógicos, ladder, bloques de función.', 'AUTOMATIZACION', 2, 150, 14, 'Cpu', 'cyan', 200),
  ('a2000000-0000-0000-0000-000000000002', 'SCADA y HMI', 'Sistemas de supervisión, diseño de pantallas, comunicación industrial.', 'AUTOMATIZACION', 3, 200, 18, 'Monitor', 'green', 201),
  ('a2000000-0000-0000-0000-000000000003', 'Redes Industriales', 'Protocolos Modbus, Profibus, EtherNet/IP, OPC-UA.', 'AUTOMATIZACION', 3, 200, 14, 'Network', 'purple', 202),
  ('a2000000-0000-0000-0000-000000000004', 'Robótica Industrial', 'Programación de brazos robóticos, trayectorias, integración con PLC.', 'AUTOMATIZACION', 4, 250, 20, 'Bot', 'gold', 203),
  ('a2000000-0000-0000-0000-000000000005', 'IoT Industrial (IIoT)', 'Sensores conectados, telemetría, edge computing, plataformas cloud.', 'AUTOMATIZACION', 3, 200, 16, 'Wifi', 'cyan', 204)
ON CONFLICT (id) DO NOTHING;

-- PROCESOS (PET / Inyección / Manufactura)
INSERT INTO public.skill_tree_nodes (id, title, description, category, difficulty_level, pe_reward, estimated_hours, icon, color, order_index)
VALUES
  ('a3000000-0000-0000-0000-000000000001', 'Inyección de Plásticos', 'Parámetros de proceso, defectos comunes, optimización de ciclo.', 'PROCESOS', 2, 150, 12, 'Droplets', 'cyan', 300),
  ('a3000000-0000-0000-0000-000000000002', 'Proceso PET (Soplado)', 'Preformas, temperaturas, presiones, cristalización.', 'PROCESOS', 3, 200, 16, 'Cylinder', 'green', 301),
  ('a3000000-0000-0000-0000-000000000003', 'Mantenimiento Industrial', 'TPM, mantenimiento preventivo vs correctivo, indicadores OEE.', 'PROCESOS', 2, 150, 10, 'Wrench', 'gold', 302),
  ('a3000000-0000-0000-0000-000000000004', 'Metrología y Calibración', 'Instrumentos de medición, incertidumbre, patrones de referencia.', 'PROCESOS', 3, 200, 14, 'Ruler', 'purple', 303)
ON CONFLICT (id) DO NOTHING;


-- ELECTRÓNICA
INSERT INTO public.skill_tree_nodes (id, title, description, category, difficulty_level, pe_reward, estimated_hours, icon, color, order_index)
VALUES
  ('a4000000-0000-0000-0000-000000000001', 'Electrónica Analógica', 'Circuitos con amplificadores operacionales, filtros, fuentes reguladas.', 'ELECTRONICA', 2, 150, 14, 'Zap', 'cyan', 400),
  ('a4000000-0000-0000-0000-000000000002', 'Electrónica Digital', 'Compuertas lógicas, flip-flops, máquinas de estado, FPGA básico.', 'ELECTRONICA', 2, 150, 12, 'Binary', 'green', 401),
  ('a4000000-0000-0000-0000-000000000003', 'Diseño de PCB', 'Esquemáticos, ruteo, reglas de diseño, fabricación (KiCad/Altium).', 'ELECTRONICA', 3, 200, 18, 'CircuitBoard', 'purple', 402),
  ('a4000000-0000-0000-0000-000000000004', 'Microcontroladores (ESP32/STM32)', 'Programación embebida, periféricos, comunicación serial, PWM.', 'ELECTRONICA', 3, 200, 16, 'Cpu', 'gold', 403)
ON CONFLICT (id) DO NOTHING;

-- DISEÑO UX/UI
INSERT INTO public.skill_tree_nodes (id, title, description, category, difficulty_level, pe_reward, estimated_hours, icon, color, order_index)
VALUES
  ('a5000000-0000-0000-0000-000000000001', 'Fundamentos UX', 'Investigación de usuarios, journey maps, wireframing, usabilidad.', 'DISEÑO', 1, 100, 8, 'Palette', 'cyan', 500),
  ('a5000000-0000-0000-0000-000000000002', 'UI Visual Design', 'Tipografía, color, espaciado, sistemas de diseño, Figma avanzado.', 'DISEÑO', 2, 150, 12, 'Paintbrush', 'green', 501),
  ('a5000000-0000-0000-0000-000000000003', 'Design Systems', 'Componentes reutilizables, tokens, documentación, atomic design.', 'DISEÑO', 3, 200, 16, 'Layers', 'purple', 502),
  ('a5000000-0000-0000-0000-000000000004', 'Prototipado Interactivo', 'Prototipos de alta fidelidad, micro-interacciones, testing con usuarios.', 'DISEÑO', 3, 200, 14, 'Smartphone', 'gold', 503)
ON CONFLICT (id) DO NOTHING;

-- GESTIÓN DE PROYECTOS
INSERT INTO public.skill_tree_nodes (id, title, description, category, difficulty_level, pe_reward, estimated_hours, icon, color, order_index)
VALUES
  ('a6000000-0000-0000-0000-000000000001', 'Gestión de Proyectos', 'Planificación, alcance, cronograma, riesgos, PMI/PMBOK.', 'GESTION', 2, 150, 12, 'Gantt', 'cyan', 600),
  ('a6000000-0000-0000-0000-000000000002', 'Scrum y Agilidad', 'Sprints, ceremonies, roles, métricas ágiles, escalado.', 'GESTION', 2, 150, 10, 'Repeat', 'green', 601),
  ('a6000000-0000-0000-0000-000000000003', 'Liderazgo Técnico', 'Mentoría, delegación, gestión de conflictos, comunicación efectiva.', 'GESTION', 4, 250, 20, 'Users', 'purple', 602),
  ('a6000000-0000-0000-0000-000000000004', 'Emprendimiento Tecnológico', 'Validación de mercado, MVP, modelo de negocio, pitch, fundraising.', 'GESTION', 3, 200, 16, 'Rocket', 'gold', 603)
ON CONFLICT (id) DO NOTHING;

-- CIENCIA DE DATOS
INSERT INTO public.skill_tree_nodes (id, title, description, category, difficulty_level, pe_reward, estimated_hours, icon, color, order_index)
VALUES
  ('a7000000-0000-0000-0000-000000000001', 'Estadística Aplicada', 'Distribuciones, pruebas de hipótesis, regresión, intervalos de confianza.', 'DATA', 2, 150, 14, 'BarChart', 'cyan', 700),
  ('a7000000-0000-0000-0000-000000000002', 'Machine Learning', 'Modelos supervisados/no supervisados, evaluación, pipelines.', 'DATA', 3, 200, 20, 'Brain', 'green', 701),
  ('a7000000-0000-0000-0000-000000000003', 'Visualización de Datos', 'Dashboards, storytelling con datos, herramientas (Power BI, D3.js).', 'DATA', 2, 150, 12, 'PieChart', 'purple', 702),
  ('a7000000-0000-0000-0000-000000000004', 'SQL y Bases de Datos', 'Consultas avanzadas, optimización, modelado relacional, NoSQL.', 'DATA', 2, 150, 12, 'Database', 'gold', 703)
ON CONFLICT (id) DO NOTHING;

-- ENERGÍA
INSERT INTO public.skill_tree_nodes (id, title, description, category, difficulty_level, pe_reward, estimated_hours, icon, color, order_index)
VALUES
  ('a8000000-0000-0000-0000-000000000001', 'Energía Solar Fotovoltaica', 'Dimensionamiento, inversores, reguladores, instalación on/off grid.', 'ENERGIA', 2, 150, 14, 'Sun', 'gold', 800),
  ('a8000000-0000-0000-0000-000000000002', 'Eficiencia Energética', 'Auditorías energéticas, gestión de la demanda, normativa.', 'ENERGIA', 3, 200, 16, 'Leaf', 'green', 801),
  ('a8000000-0000-0000-0000-000000000003', 'Sistemas Eléctricos Industriales', 'Tableros, protecciones, motores, variadores de frecuencia.', 'ENERGIA', 3, 200, 18, 'Zap', 'cyan', 802)
ON CONFLICT (id) DO NOTHING;


-- ── 3) Jerarquía: conectar nodos hijos a sus raíces ──────────────────
-- (Los nodos de nivel 2+ apuntan a su padre para el árbol visual)

UPDATE public.skill_tree_nodes SET parent_node_id = 'a1000000-0000-0000-0000-000000000001'
WHERE id IN ('a1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000004');

UPDATE public.skill_tree_nodes SET parent_node_id = 'a2000000-0000-0000-0000-000000000001'
WHERE id IN ('a2000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000003', 'a2000000-0000-0000-0000-000000000004', 'a2000000-0000-0000-0000-000000000005');

UPDATE public.skill_tree_nodes SET parent_node_id = 'a3000000-0000-0000-0000-000000000001'
WHERE id IN ('a3000000-0000-0000-0000-000000000002', 'a3000000-0000-0000-0000-000000000003', 'a3000000-0000-0000-0000-000000000004');

UPDATE public.skill_tree_nodes SET parent_node_id = 'a4000000-0000-0000-0000-000000000001'
WHERE id IN ('a4000000-0000-0000-0000-000000000002', 'a4000000-0000-0000-0000-000000000003', 'a4000000-0000-0000-0000-000000000004');

UPDATE public.skill_tree_nodes SET parent_node_id = 'a5000000-0000-0000-0000-000000000001'
WHERE id IN ('a5000000-0000-0000-0000-000000000002', 'a5000000-0000-0000-0000-000000000003', 'a5000000-0000-0000-0000-000000000004');

UPDATE public.skill_tree_nodes SET parent_node_id = 'a6000000-0000-0000-0000-000000000001'
WHERE id IN ('a6000000-0000-0000-0000-000000000002', 'a6000000-0000-0000-0000-000000000003', 'a6000000-0000-0000-0000-000000000004');

UPDATE public.skill_tree_nodes SET parent_node_id = 'a7000000-0000-0000-0000-000000000001'
WHERE id IN ('a7000000-0000-0000-0000-000000000002', 'a7000000-0000-0000-0000-000000000003', 'a7000000-0000-0000-0000-000000000004');

UPDATE public.skill_tree_nodes SET parent_node_id = 'a8000000-0000-0000-0000-000000000001'
WHERE id IN ('a8000000-0000-0000-0000-000000000002', 'a8000000-0000-0000-0000-000000000003');

-- ── 4) Actualizar la función de detección de modo en el Simulador ────
-- NOTA: La Edge Function simulador-universal ya detecta estas categorías
-- automáticamente. SOFTWARE y DATA → modo CÓDIGO. Todo lo demás → modo
-- ANÁLISIS (IA adaptativa genera retos de cada disciplina con contexto
-- industrial real).
--
-- Categorías soportadas por el Simulador Universal:
--   SOFTWARE    → editor de código + sandbox + análisis IA de calidad
--   DATA        → editor de código (Python/SQL) + análisis IA
--   INGENIERIA  → caso práctico + defensa IA (lean, calidad, procesos)
--   AUTOMATIZACION → caso práctico (PLC, SCADA, redes) + defensa
--   PROCESOS    → caso práctico (inyección, PET, mantenimiento) + defensa
--   ELECTRONICA → caso práctico (circuitos, PCB, embebidos) + defensa
--   DISEÑO      → caso práctico (UX, UI, design systems) + defensa
--   GESTION     → caso práctico (liderazgo, agile, emprendimiento) + defensa
--   ENERGIA     → caso práctico (solar, eficiencia, eléctrica) + defensa

-- Fin de la migración.
