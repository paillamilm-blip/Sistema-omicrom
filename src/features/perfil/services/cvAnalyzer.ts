// lib/cvAnalyzer.ts
// ═══════════════════════════════════════════════════════════════════════
// MOTOR DE CONOCIMIENTO: Analiza CV → extrae skills, años, seniority,
// creatividad, arquitectura (estudiante/junior/mid/senior/lead).
// Calcula ejes del Gemelo Digital y posicionamiento en la red.
// ═══════════════════════════════════════════════════════════════════════

export interface SkillDetail {
  name: string;
  pct: number; // 0-100, nivel de dominio estimado
}

export interface AnalyzedProfile {
  name: string;
  seniorLabel: string;
  seniorLevel: number; // 1=junior, 2=mid, 3-4=senior, 5=lead
  years: number;
  skills: string[]; // IDs de skills (react, typescript, etc)
  labels: string[]; // Nombres legibles
  skillsDetail: SkillDetail[]; // labels + % de dominio (heurístico o de la IA)
  summary: string; // resumen de 2 párrafos (heurístico o de la IA)
  creativity: number; // 0-1
  arch: 'estudiante' | 'junior' | 'mid' | 'senior' | 'lead' | 'pro';
  axes: {
    exec: number;
    qual: number;
    trans: number;
    fund: number;
  };
  avatar?: { type: 'grad' | 'img'; v: number | string };
}

// Diccionario de skills: palabras clave → ID de skill
const SKILLS: Record<string, string[]> = {
  react: ['react', 'next.js', 'nextjs', 'next ', 'jsx', 'redux', 'remix'],
  typescript: ['typescript', 'tsx', 'tipado'],
  javascript: ['javascript', 'es6', 'ecmascript', ' js,', ' js '],
  frontend: ['frontend', 'front-end', 'front end', 'html', 'css', 'tailwind', 'sass', 'scss', 'styled-components', 'vue', 'angular', 'svelte'],
  node: ['node', 'node.js', 'express', 'nestjs', 'nest.js', 'fastify'],
  python: ['python', 'django', 'flask', 'fastapi', 'pandas'],
  backend: ['backend', 'back-end', 'back end', ' api', 'rest', 'graphql', 'microservic', 'grpc'],
  sql: ['sql', 'postgres', 'postgre', 'mysql', 'mongo', 'database', 'base de datos', 'redis', 'supabase', 'firebase'],
  mobile: ['react native', 'flutter', 'swift', 'kotlin', 'android', 'ios ', 'expo'],
  devops: ['docker', 'kubernetes', 'k8s', 'aws', 'gcp', 'azure', 'ci/cd', 'terraform', 'devops', 'cloud', 'vercel'],
  ml: ['machine learning', 'tensorflow', 'pytorch', 'data science', 'deep learning', 'inteligencia artificial', 'llm', 'nlp'],
  design: ['figma', 'ux', 'ui/ux', 'diseñ', 'design', 'adobe', 'photoshop', 'illustrator', 'branding', 'brand', 'sketch'],
  animation: ['animaci', 'motion', 'gsap', 'framer', 'transition', 'lottie'],
  '3d': ['three.js', 'threejs', 'webgl', '3d', 'blender', 'shader', 'r3f'],
  product: ['product', 'producto', '0 a 1', '0->1', 'mvp', 'startup', 'emprend', 'growth'],
  architecture: ['arquitect', 'architecture', 'escalab', 'system design', 'patrones de diseño', 'clean code', 'solid'],
  teaching: ['mentor', 'docent', 'teach', 'profes', 'instructor', 'facilit', 'conferen', 'charla', 'workshop'],
  agile: ['agile', 'scrum', 'kanban', 'jira'],
  testing: ['test', 'jest', 'vitest', 'cypress', 'tdd', 'qa ', 'playwright'],
  // Skills no-tech / operaciones / industria
  operations: ['operacion', 'planta', 'producción', 'produccion', 'logística', 'logistica', 'bodega', 'inventario', 'abastecimiento', 'supply chain', 'calidad', 'turno', 'manufactura'],
  leadership: ['liderazgo', 'líder', 'lider', 'equipo', 'coordinación', 'coordinacion', 'supervisión', 'supervision', 'gestión', 'gestion', 'jefatura'],
  agriculture: ['agrícola', 'agricola', 'vendimia', 'fruta', 'viña', 'vino', 'cosecha', 'campo', 'riego'],
  hospitality: ['turismo', 'hotel', 'recepción', 'recepcion', 'atención al cliente', 'atencion al cliente', 'servicio', 'gastronomía', 'gastronomia'],
  sales: ['ventas', 'comercial', 'negociación', 'negociacion', 'cliente', 'marketing', 'retail'],
  safety: ['seguridad', 'prevención', 'prevencion', 'riesgo', 'emergencia', 'salud ocupacional', 'sso', 'iso'],
};

// Etiquetas legibles para cada skill
export const SKILL_LABELS: Record<string, string> = {
  react: 'React',
  typescript: 'TypeScript',
  javascript: 'JavaScript',
  frontend: 'Frontend',
  node: 'Node.js',
  python: 'Python',
  backend: 'Backend / APIs',
  sql: 'Bases de datos',
  mobile: 'Mobile',
  devops: 'DevOps / Cloud',
  ml: 'IA / ML',
  design: 'Diseño UI/UX',
  animation: 'Motion / Animación',
  '3d': '3D / WebGL',
  product: 'Producto',
  architecture: 'Arquitectura',
  teaching: 'Mentoría',
  agile: 'Agile',
  testing: 'Testing / QA',
  operations: 'Operaciones',
  leadership: 'Liderazgo',
  agriculture: 'Agroindustria',
  hospitality: 'Turismo / Hotelería',
  sales: 'Ventas / Comercial',
  safety: 'Seguridad / Prevención',
};

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * Analiza un texto de CV y extrae perfil completo del profesional.
 */
export function analyzeCV(text: string): AnalyzedProfile {
  const t = (' ' + String(text || '').toLowerCase() + ' ').replace(/[|/\\]/g, ' ');

  // 1. SKILLS: detectar cuáles menciona (y cuántas veces, para estimar dominio)
  const found: string[] = [];
  const labels: string[] = [];
  const mentionCount: Record<string, number> = {};
  Object.keys(SKILLS).forEach((k) => {
    const hits = SKILLS[k].reduce((n, keyword) => n + (t.split(keyword).length - 1), 0);
    if (hits > 0) {
      found.push(k);
      labels.push(SKILL_LABELS[k] || k);
      mentionCount[k] = hits;
    }
  });

  // 2. AÑOS DE EXPERIENCIA
  const yearMatch = t.match(/(\d{1,2})\s*\+?\s*(años|año|years|year|yrs)/);
  const years = yearMatch ? Math.min(30, parseInt(yearMatch[1], 10)) : 0;

  // 3. NIVEL DE SENIORITY
  let seniorLevel = 2; // default: mid
  let seniorLabel = 'Desarrollador Mid';

  // Detectar título profesional (boost importante)
  const hasProfessionalTitle = /ingenier[oa]|licenciad[oa]|técnic[oa]|profesional|magíster|máster|master|mba|phd|doctor[a]?[\s,]/.test(t);

  // Lead/Arquitecto/Principal
  if (
    /lead|líder|lider|principal|staff|head of|cto|arquitect|director|gerente|jefe de|coordinador|supervisor/.test(t)
  ) {
    seniorLevel = 5;
    seniorLabel = 'Tech Lead / Arquitecto';
  }
  // Senior
  else if (
    /senior|sr\.|experto|especialista/.test(t) || years >= 5 || (hasProfessionalTitle && years >= 3)
  ) {
    seniorLevel = 4;
    seniorLabel = 'Profesional Senior';
  }
  // Mid (con título)
  else if (hasProfessionalTitle) {
    seniorLevel = 3;
    seniorLabel = 'Profesional Mid';
  }
  // Junior
  else if (
    /junior|jr\.|trainee|becari|practican|estudiante/.test(t) &&
    years < 3 &&
    seniorLevel < 4
  ) {
    seniorLevel = 1;
    seniorLabel = 'Profesional Junior';
  }

  // 4. CREATIVIDAD (0-1): palabras relacionadas con diseño/UX/motion/product
  const creativeWords = [
    'creativ',
    'diseñ',
    'design',
    'ux',
    'ui',
    'motion',
    'animaci',
    'brand',
    'arte',
    'innovaci',
    '3d',
    'product',
  ];
  const creativeCount = creativeWords.filter((w) => t.includes(w)).length;
  const creativity = clamp(creativeCount / 6, 0, 1);

  // 5. EXTRAER NOMBRE (primera línea si es válida)
  let name = '';
  const firstLine = (String(text).split('\n')[0] || '').trim();
  if (
    firstLine.length > 2 &&
    firstLine.length < 38 &&
    /[a-záéíóúñ]/i.test(firstLine) &&
    !/curriculum|resume|^cv\b|desarroll|ingenier/i.test(firstLine)
  ) {
    name = firstLine;
  }

  // Si no detectó skills, asignar defaults básicos
  if (found.length === 0) {
    found.push('frontend', 'javascript');
    labels.push('Frontend', 'JavaScript');
    mentionCount.frontend = 1;
    mentionCount.javascript = 1;
  }

  // 6. EDUCACIÓN (boost fundamento si hay certificaciones/universidad)
  const eduBonus = /licenci|ingenier|master|máster|magíster|phd|doctor|universidad|bootcamp|certific|diplomad/.test(
    t
  )
    ? 10
    : 0;

  // 7. ARQUITECTURA DEL PERFIL
  let arch: AnalyzedProfile['arch'] = 'pro';
  if (
    !hasProfessionalTitle &&
    (/estudiante|student|cursando actualmente|sin experiencia laboral|reci[eé]n egres/.test(t) ||
    (years < 1 && found.length < 2 && !hasProfessionalTitle))
  ) {
    arch = 'estudiante';
    seniorLevel = 1;
    seniorLabel = 'Estudiante · Aprendiz';
  } else if (seniorLevel >= 5) {
    arch = 'lead';
  } else if (seniorLevel >= 4) {
    arch = 'senior';
  } else if (seniorLevel <= 1 || (years < 2 && !hasProfessionalTitle)) {
    arch = 'junior';
  } else {
    arch = 'mid';
  }

  // 8. CALCULAR EJES DEL GEMELO DIGITAL
  // Ejecución: años + arquitectura + skills técnicas
  const exec = clamp(
    Math.round(
      32 +
        years * 4.5 +
        (found.includes('architecture') ? 8 : 0) +
        (seniorLevel >= 4 ? 6 : 0)
    ),
    20,
    96
  );

  // Calidad: seniority + testing + arquitectura
  const qual = clamp(
    Math.round(
      28 +
        seniorLevel * 7 +
        (found.includes('testing') ? 7 : 0) +
        (found.includes('architecture') ? 5 : 0)
    ),
    20,
    95
  );

  // Trascendencia: teaching + creatividad + 3D + producto
  const trans = clamp(
    Math.round(
      12 +
        (found.includes('teaching') ? 20 : 0) +
        creativity * 14 +
        (found.includes('3d') ? 5 : 0) +
        (found.includes('product') ? 6 : 0)
    ),
    8,
    92
  );

  // Fundamento: cantidad de skills + educación
  const fund = clamp(Math.round(26 + found.length * 3.4 + eduBonus), 20, 97);

  // Si es estudiante, limitar fundamento
  const axes = {
    exec,
    qual,
    trans,
    fund: arch === 'estudiante' ? clamp(fund, 20, 60) : fund,
  };

  // 9. SKILLS CON % DE DOMINIO (heurístico): base según seniority general +
  // boost por cantidad de menciones en el CV — cada skill queda diferenciado
  // según su propia evidencia, no todos al mismo nivel.
  const baseDominion = 30 + seniorLevel * 8; // seniority general como piso
  const skillsDetail: SkillDetail[] = found.map((k, i) => {
    const mentions = mentionCount[k] ?? 1;
    const pct = clamp(Math.round(baseDominion + Math.min(mentions, 5) * 6), 25, 96);
    return { name: labels[i], pct };
  });

  // 10. RESUMEN HEURÍSTICO en 2 párrafos (se sobreescribe si la IA responde
  // con uno más específico — ver ConvalidaOmicron.tsx).
  const topSkills = labels.slice(0, 3).join(', ') || 'tecnologías generales';
  const summary =
    `${name || 'Este perfil'} se posiciona como ${seniorLabel.toLowerCase()}` +
    `${years > 0 ? `, con ${years} ${years === 1 ? 'año' : 'años'} de experiencia declarada` : ''}` +
    `, con foco principal en ${topSkills}.\n\n` +
    `Ejecución ${axes.exec}/100 y Calidad ${axes.qual}/100 según la profundidad técnica detectada; ` +
    `Trascendencia ${axes.trans}/100 y Fundamento ${axes.fund}/100 según la evidencia de impacto y base ` +
    `formal encontrada en el CV. Estos valores suben con evidencia real adicional (contratos, aportes, nodos validados).`;

  return {
    name,
    seniorLabel,
    seniorLevel,
    years,
    skills: found,
    labels,
    skillsDetail,
    summary,
    creativity,
    arch,
    axes,
    avatar: { type: 'grad', v: 0 }, // default: primer gradiente
  };
}

/**
 * CV de ejemplo para testing/demo
 */
export const DEMO_CV = `Desarrollador Frontend Senior con 6 años de experiencia. Experto en React, TypeScript, Next.js y Tailwind CSS. Alta creatividad en UI/UX, motion y animaciones con Framer y GSAP. Proyectos de creative technology y 3D con Three.js y WebGL. Node.js y APIs REST. He liderado equipos y soy mentor de desarrolladores junior. Bootcamp + certificaciones cloud (AWS).`;
