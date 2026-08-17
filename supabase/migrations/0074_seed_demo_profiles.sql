-- =====================================================================
-- 0074_seed_demo_profiles.sql — Cold Start: 15 perfiles demo
--
-- Estos perfiles aparecen en el ranking, presencia, y sugerencias de
-- conexión. Se marcan con is_ghost=true para distinguirlos de usuarios
-- reales. Tienen skills, ejes, reputación, y PE realistas.
--
-- Idempotente: usa ON CONFLICT DO NOTHING con username unique.
-- =====================================================================

-- Insertar perfiles demo (solo si no existen por username)
INSERT INTO public.profiles (id, username, full_name, avatar_url, bio, location, skills, skills_detail, execution_score, quality_score, transcendence_score, foundation_score, reputation_score, pe_points, node_type, node_level, is_ghost, cv_summary)
VALUES
  (gen_random_uuid(), 'maria_ux', 'María Fernanda López', null, 'Diseñadora UX con foco en producto digital y accesibilidad.', 'Santiago, Chile', ARRAY['Diseño UX', 'Figma', 'Research', 'Accesibilidad'], '[{"name":"Diseño UX","pct":88},{"name":"Figma","pct":92},{"name":"Research","pct":75},{"name":"Accesibilidad","pct":70}]'::jsonb, 62, 71, 45, 58, 64, 820, 'Nodo Core', '2', true, 'Diseñadora UX con 4 años de experiencia en producto digital. Especialista en investigación de usuarios y sistemas de diseño accesibles.'),

  (gen_random_uuid(), 'carlos_dev', 'Carlos Andrés Muñoz', null, 'Full-Stack Engineer. React + Node + AWS.', 'Medellín, Colombia', ARRAY['React', 'Node.js', 'TypeScript', 'AWS', 'PostgreSQL'], '[{"name":"React","pct":90},{"name":"Node.js","pct":85},{"name":"TypeScript","pct":88},{"name":"AWS","pct":72},{"name":"PostgreSQL","pct":78}]'::jsonb, 78, 72, 38, 65, 71, 1450, 'Nodo Core', '2', true, 'Full-Stack Engineer con 7 años construyendo aplicaciones escalables. Lidera equipos de 4-6 personas en contexto startup.'),

  (gen_random_uuid(), 'ana_data', 'Ana Martínez Reyes', null, 'Data Scientist. Python + ML + NLP.', 'Buenos Aires, Argentina', ARRAY['Python', 'Machine Learning', 'NLP', 'Pandas', 'TensorFlow'], '[{"name":"Python","pct":92},{"name":"Machine Learning","pct":80},{"name":"NLP","pct":75},{"name":"Pandas","pct":88},{"name":"TensorFlow","pct":70}]'::jsonb, 55, 80, 52, 82, 72, 1100, 'Nodo Core', '2', true, 'Data Scientist con 5 años en análisis predictivo y NLP. Publicó 3 papers en conferencias latinoamericanas.'),

  (gen_random_uuid(), 'diego_devops', 'Diego Alejandro Torres', null, 'DevOps Engineer. Docker, K8s, Terraform.', 'Lima, Perú', ARRAY['Docker', 'Kubernetes', 'Terraform', 'AWS', 'CI/CD'], '[{"name":"Docker","pct":90},{"name":"Kubernetes","pct":82},{"name":"Terraform","pct":78},{"name":"AWS","pct":85},{"name":"CI/CD","pct":88}]'::jsonb, 82, 75, 30, 70, 68, 950, 'Nodo Core', '2', true, 'DevOps con 6 años automatizando infraestructura cloud. Certificado AWS Solutions Architect.'),

  (gen_random_uuid(), 'valentina_pm', 'Valentina Rojas Castro', null, 'Product Manager. Scrum + Growth + Analytics.', 'Bogotá, Colombia', ARRAY['Product Management', 'Scrum', 'Analytics', 'Growth', 'UX'], '[{"name":"Product Management","pct":85},{"name":"Scrum","pct":80},{"name":"Analytics","pct":72},{"name":"Growth","pct":68},{"name":"UX","pct":60}]'::jsonb, 70, 65, 72, 60, 67, 780, 'Nodo Core', '2', true, 'Product Manager con 5 años llevando productos de 0 a 1. Scrum Master certificada. Obsesionada con métricas de impacto.'),

  (gen_random_uuid(), 'matias_mobile', 'Matías Ignacio Soto', null, 'Mobile Developer. Flutter + React Native.', 'Valparaíso, Chile', ARRAY['Flutter', 'React Native', 'Dart', 'TypeScript', 'Firebase'], '[{"name":"Flutter","pct":88},{"name":"React Native","pct":75},{"name":"Dart","pct":85},{"name":"TypeScript","pct":70},{"name":"Firebase","pct":80}]'::jsonb, 72, 68, 25, 55, 58, 620, 'Nodo Operativo', '1', true, 'Desarrollador mobile con 3 años. 4 apps publicadas en Play Store. Fan de Flutter y arquitectura limpia.'),

  (gen_random_uuid(), 'camila_mktg', 'Camila Paz Herrera', null, 'Marketing Digital. SEO + Content + Ads.', 'Ciudad de México', ARRAY['Marketing Digital', 'SEO', 'Content Strategy', 'Google Ads', 'Analytics'], '[{"name":"Marketing Digital","pct":82},{"name":"SEO","pct":78},{"name":"Content Strategy","pct":75},{"name":"Google Ads","pct":80},{"name":"Analytics","pct":70}]'::jsonb, 65, 60, 55, 50, 58, 540, 'Nodo Operativo', '1', true, 'Marketera digital con 4 años gestionando campañas B2B y B2C. Especialista en contenido y posicionamiento orgánico.'),

  (gen_random_uuid(), 'jorge_arch', 'Jorge Luis Mendoza', null, 'Solutions Architect. System Design + Cloud.', 'Quito, Ecuador', ARRAY['Arquitectura', 'System Design', 'AWS', 'Microservicios', 'DDD'], '[{"name":"Arquitectura","pct":90},{"name":"System Design","pct":88},{"name":"AWS","pct":82},{"name":"Microservicios","pct":85},{"name":"DDD","pct":75}]'::jsonb, 85, 82, 65, 88, 83, 2200, 'Nodo Arquitecto', '3', true, 'Arquitecto de Soluciones con 12 años. Ex-CTO de startup fintech. Diseña sistemas que escalan a millones de usuarios.'),

  (gen_random_uuid(), 'lucia_teach', 'Lucía Andrea Vargas', null, 'Docente + Mentora Tech. Enseña programación.', 'Montevideo, Uruguay', ARRAY['Educación', 'Python', 'Mentoría', 'Pedagogía', 'JavaScript'], '[{"name":"Educación","pct":90},{"name":"Python","pct":75},{"name":"Mentoría","pct":88},{"name":"Pedagogía","pct":85},{"name":"JavaScript","pct":70}]'::jsonb, 58, 70, 85, 75, 73, 1300, 'Nodo Core', '2', true, 'Profesora de programación con 8 años formando desarrolladores jr. Mentora en 3 bootcamps. Cree que el talento se construye, no se nace.'),

  (gen_random_uuid(), 'pedro_sec', 'Pedro Nicolás Guzmán', null, 'Cybersecurity Analyst. Pentesting + SOC.', 'Concepción, Chile', ARRAY['Ciberseguridad', 'Pentesting', 'SOC', 'Linux', 'Python'], '[{"name":"Ciberseguridad","pct":82},{"name":"Pentesting","pct":78},{"name":"SOC","pct":75},{"name":"Linux","pct":88},{"name":"Python","pct":72}]'::jsonb, 70, 78, 35, 72, 66, 880, 'Nodo Core', '2', true, 'Analista de ciberseguridad con 5 años en SOC y pentesting. Certificado CEH. Protege infraestructura crítica.'),

  (gen_random_uuid(), 'sofia_frontend', 'Sofía Alejandra Ríos', null, 'Frontend Developer. Vue + Tailwind + Motion.', 'Córdoba, Argentina', ARRAY['Vue.js', 'Tailwind CSS', 'Motion Design', 'TypeScript', 'Accesibilidad'], '[{"name":"Vue.js","pct":85},{"name":"Tailwind CSS","pct":90},{"name":"Motion Design","pct":72},{"name":"TypeScript","pct":78},{"name":"Accesibilidad","pct":68}]'::jsonb, 68, 72, 40, 55, 62, 700, 'Nodo Core', '2', true, 'Frontend developer con 4 años especializándose en interfaces accesibles y micro-interacciones. Contribuye a open source.'),

  (gen_random_uuid(), 'ricardo_lead', 'Ricardo Esteban Paredes', null, 'Engineering Manager. Escala equipos tech.', 'Santiago, Chile', ARRAY['Liderazgo', 'Gestión', 'Agile', 'Architecture', 'Hiring'], '[{"name":"Liderazgo","pct":88},{"name":"Gestión","pct":85},{"name":"Agile","pct":80},{"name":"Architecture","pct":72},{"name":"Hiring","pct":78}]'::jsonb, 80, 75, 82, 70, 79, 1800, 'Nodo Arquitecto', '3', true, 'Engineering Manager con 10 años. Escaló equipos de 3 a 30 personas. Cree en servant leadership y feedback continuo.'),

  (gen_random_uuid(), 'isabella_ai', 'Isabella García Moreno', null, 'AI/ML Engineer. LLMs + Computer Vision.', 'Guadalajara, México', ARRAY['Machine Learning', 'LLMs', 'Computer Vision', 'PyTorch', 'Python'], '[{"name":"Machine Learning","pct":85},{"name":"LLMs","pct":80},{"name":"Computer Vision","pct":78},{"name":"PyTorch","pct":82},{"name":"Python","pct":90}]'::jsonb, 72, 80, 48, 85, 75, 1200, 'Nodo Core', '2', true, 'AI Engineer con 4 años. Construyó sistemas de visión por computadora en producción. Ahora explora LLMs para automatización.'),

  (gen_random_uuid(), 'andres_student', 'Andrés Felipe Ruiz', null, 'Estudiante de Ing. Informática. Aprendiendo React.', 'Temuco, Chile', ARRAY['JavaScript', 'React', 'Git', 'HTML/CSS'], '[{"name":"JavaScript","pct":55},{"name":"React","pct":45},{"name":"Git","pct":50},{"name":"HTML/CSS","pct":65}]'::jsonb, 30, 35, 15, 40, 32, 180, 'Nodo Operativo', '1', true, 'Estudiante de 4to año de Ing. Informática. Aprendiendo React y construyendo su primer portafolio. Busca práctica profesional.'),

  (gen_random_uuid(), 'fernanda_freelance', 'Fernanda Catalina Mora', null, 'Freelance Designer + Illustrator. Branding.', 'Viña del Mar, Chile', ARRAY['Branding', 'Illustrator', 'Photoshop', 'Diseño Gráfico', 'Identidad Visual'], '[{"name":"Branding","pct":85},{"name":"Illustrator","pct":90},{"name":"Photoshop","pct":88},{"name":"Diseño Gráfico","pct":82},{"name":"Identidad Visual","pct":78}]'::jsonb, 72, 68, 55, 50, 62, 650, 'Nodo Core', '2', true, 'Diseñadora gráfica freelance con 5 años. Especialista en branding e identidad visual para startups y PYMEs.')

ON CONFLICT (username) DO NOTHING;

-- Asegurar que tienen el trigger de reputación actualizado
-- (el trigger recalc_reputation se ejecuta automáticamente al INSERT)

NOTIFY pgrst, 'reload schema';
