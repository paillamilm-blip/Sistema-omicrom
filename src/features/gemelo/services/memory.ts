// lib/gemeloMemory.ts
// ═══════════════════════════════════════════════════════════════════════
// ÓMICRON · MEMORIA DEL GEMELO — Sistema de contexto persistente
// El Gemelo RECUERDA conversaciones, aprende preferencias, detecta patrones.
// Mejora con cada interacción. Como Jarvis para Tony Stark.
// ═══════════════════════════════════════════════════════════════════════

interface Conversation {
  id: string;
  timestamp: number;
  userQuery: string;
  gemeloResponse: string;
  context: {
    tab: string;
    reputation: number;
    mood?: 'curious' | 'urgent' | 'casual';
    // Metadatos adicionales de contexto (targetTab, action, queryType, etc.)
    [key: string]: unknown;
  };
}

interface UserPreference {
  key: string;
  value: string;
  confidence: number; // 0-1, sube con repetición
  learnedAt: number;
  lastSeen: number;
}

interface UserPattern {
  pattern: string; // "pregunta sobre empleos los lunes"
  frequency: number;
  lastOccurrence: number;
}

interface UserGoal {
  goal: string; // "subir a Nodo 3"
  priority: number; // 1-5
  progress: number; // 0-100
  createdAt: number;
}

interface GemeloMemory {
  conversations: Conversation[];
  preferences: UserPreference[];
  patterns: UserPattern[];
  goals: UserGoal[];
  personality: {
    communicationStyle: 'technical' | 'casual' | 'mixed';
    preferredTone: 'friendly' | 'professional' | 'mentor';
    verbosity: 'concise' | 'detailed';
  };
  metadata: {
    firstInteraction: number;
    totalInteractions: number;
    lastActive: number;
  };
}

const MEMORY_KEY = 'omicron_gemelo_memory_v1';
const MAX_CONVERSATIONS = 50; // Últimas 50 conversaciones
const PREFERENCE_THRESHOLD = 0.6; // Confianza mínima para considerar preferencia

// ══════════════════════════════════════════════════════════════════════
// PERSISTENCIA
// ══════════════════════════════════════════════════════════════════════

function loadMemory(): GemeloMemory {
  try {
    const stored = localStorage.getItem(MEMORY_KEY);
    if (stored) {
      return JSON.parse(stored) as GemeloMemory;
    }
  } catch (err) {
    console.warn('[GemeloMemory] Error loading memory:', err);
  }
  
  // Memoria vacía inicial
  return {
    conversations: [],
    preferences: [],
    patterns: [],
    goals: [],
    personality: {
      communicationStyle: 'mixed',
      preferredTone: 'friendly',
      verbosity: 'detailed',
    },
    metadata: {
      firstInteraction: Date.now(),
      totalInteractions: 0,
      lastActive: Date.now(),
    },
  };
}

function saveMemory(memory: GemeloMemory): void {
  try {
    localStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
  } catch (err) {
    console.warn('[GemeloMemory] Error saving memory:', err);
  }
}

let memoryCache: GemeloMemory | null = null;

function getMemory(): GemeloMemory {
  if (!memoryCache) {
    memoryCache = loadMemory();
  }
  return memoryCache;
}

// ══════════════════════════════════════════════════════════════════════
// API PÚBLICA
// ══════════════════════════════════════════════════════════════════════

/**
 * Registra una conversación en la memoria.
 */
export function remember(
  userQuery: string,
  gemeloResponse: string,
  context: { tab: string; reputation: number; mood?: 'curious' | 'urgent' | 'casual'; [key: string]: unknown }
): void {
  const memory = getMemory();
  
  const conversation: Conversation = {
    id: `conv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    timestamp: Date.now(),
    userQuery,
    gemeloResponse,
    context,
  };
  
  memory.conversations.unshift(conversation);
  
  // Mantener solo las últimas MAX_CONVERSATIONS
  if (memory.conversations.length > MAX_CONVERSATIONS) {
    memory.conversations = memory.conversations.slice(0, MAX_CONVERSATIONS);
  }
  
  memory.metadata.totalInteractions++;
  memory.metadata.lastActive = Date.now();
  
  // Aprender de la interacción
  learnFromConversation(conversation);
  
  saveMemory(memory);
}

/**
 * Recupera el historial reciente de conversaciones.
 */
export function recall(limit = 5): Conversation[] {
  const memory = getMemory();
  return memory.conversations.slice(0, limit);
}

/**
 * Recupera todas las preferencias aprendidas.
 */
export function getPreferences(): UserPreference[] {
  const memory = getMemory();
  return memory.preferences.filter(p => p.confidence >= PREFERENCE_THRESHOLD);
}

/**
 * Recupera los patrones de comportamiento detectados.
 */
export function getPatterns(): UserPattern[] {
  const memory = getMemory();
  return memory.patterns.filter(p => p.frequency >= 2); // Al menos 2 veces
}

/**
 * Recupera los goals/objetivos del usuario.
 */
export function getGoals(): UserGoal[] {
  const memory = getMemory();
  return memory.goals.sort((a, b) => b.priority - a.priority);
}

/**
 * Infiere la personalidad del usuario basándose en el historial.
 */
export function inferPersonality(): GemeloMemory['personality'] {
  const memory = getMemory();
  
  // Si ya hay interacciones suficientes, usar la inferida
  if (memory.metadata.totalInteractions > 10) {
    return memory.personality;
  }
  
  // Analizar conversaciones recientes para inferir
  const recent = memory.conversations.slice(0, 10);
  
  // Detectar estilo de comunicación
  const technicalWords = recent.filter(c => 
    /api|código|función|componente|algoritmo|performance/i.test(c.userQuery)
  ).length;
  
  const casualWords = recent.filter(c =>
    /hola|gracias|porfa|oye|dale/i.test(c.userQuery)
  ).length;
  
  memory.personality.communicationStyle = 
    technicalWords > casualWords * 2 ? 'technical' :
    casualWords > technicalWords * 2 ? 'casual' : 'mixed';
  
  // Detectar verbosidad preferida
  const avgQueryLength = recent.reduce((sum, c) => sum + c.userQuery.length, 0) / Math.max(recent.length, 1);
  memory.personality.verbosity = avgQueryLength > 50 ? 'detailed' : 'concise';
  
  saveMemory(memory);
  return memory.personality;
}

/**
 * Agrega o actualiza un goal del usuario.
 */
export function setGoal(goal: string, priority: number = 3): void {
  const memory = getMemory();
  
  const existing = memory.goals.find(g => g.goal.toLowerCase() === goal.toLowerCase());
  
  if (existing) {
    existing.priority = priority;
  } else {
    memory.goals.push({
      goal,
      priority,
      progress: 0,
      createdAt: Date.now(),
    });
  }
  
  saveMemory(memory);
}

/**
 * Actualiza el progreso de un goal.
 */
export function updateGoalProgress(goal: string, progress: number): void {
  const memory = getMemory();
  const existing = memory.goals.find(g => g.goal.toLowerCase().includes(goal.toLowerCase()));
  
  if (existing) {
    existing.progress = Math.min(100, Math.max(0, progress));
    saveMemory(memory);
  }
}

/**
 * Obtiene el contexto completo para una consulta al Oráculo.
 */
export function getContextForQuery(_currentTab: string, _reputation: number): {
  recentConversations: Conversation[];
  preferences: UserPreference[];
  patterns: UserPattern[];
  goals: UserGoal[];
  personality: GemeloMemory['personality'];
  metadata: GemeloMemory['metadata'];
} {
  const memory = getMemory();
  
  return {
    recentConversations: recall(5),
    preferences: getPreferences(),
    patterns: getPatterns(),
    goals: getGoals(),
    personality: memory.personality,
    metadata: memory.metadata,
  };
}

/**
 * Genera un saludo contextual basado en la memoria.
 */
export function generateContextualGreeting(
  userName: string,
  currentHour: number,
  reputation: number,
  daysSinceLastLogin: number
): string {
  const personality = inferPersonality();
  const goals = getGoals();
  const topGoal = goals[0];
  
  // Saludo base según hora
  let greeting = '';
  if (currentHour >= 5 && currentHour < 12) greeting = 'Buenos días';
  else if (currentHour >= 12 && currentHour < 19) greeting = 'Buenas tardes';
  else greeting = 'Buenas noches';
  
  // Personalizar según estilo
  const style = personality.communicationStyle;
  const casual = style === 'casual' || style === 'mixed';
  
  if (daysSinceLastLogin === 0) {
    // Primera vez hoy
    if (casual) {
      greeting += `, ${userName || 'operador'}. `;
    } else {
      greeting += `. `;
    }
  } else if (daysSinceLastLogin === 1) {
    greeting += `. Te extrañé ayer. `;
  } else if (daysSinceLastLogin > 1) {
    greeting += `. Han pasado ${daysSinceLastLogin} días. `;
  }
  
  // Mencionar goal si existe
  if (topGoal && topGoal.progress < 100) {
    if (casual) {
      greeting += `Sigues trabajando en "${topGoal.goal}", ¿verdad? `;
    } else {
      greeting += `Tu objetivo principal: ${topGoal.goal}. `;
    }
  }
  
  // Mencionar reputación
  if (reputation >= 80) {
    greeting += 'Tu reputación está excelente. ';
  } else if (reputation >= 50) {
    greeting += 'Tu reputación va bien. ';
  } else {
    greeting += 'Trabajemos en subir tu reputación. ';
  }
  
  return greeting.trim();
}

// ══════════════════════════════════════════════════════════════════════
// APRENDIZAJE AUTOMÁTICO
// ══════════════════════════════════════════════════════════════════════

/**
 * Aprende de una conversación: detecta preferencias, patrones, ajusta personalidad.
 */
function learnFromConversation(conversation: Conversation): void {
  const memory = getMemory();
  const query = conversation.userQuery.toLowerCase();
  
  // PREFERENCIAS: detectar keywords repetitivos
  const preferenceKeywords = {
    'remoto': 'preferencia_trabajo_remoto',
    'mañana': 'preferencia_horario_mañana',
    'tarde': 'preferencia_horario_tarde',
    'react': 'preferencia_tech_react',
    'python': 'preferencia_tech_python',
    'senior': 'preferencia_seniority_senior',
  };
  
  Object.entries(preferenceKeywords).forEach(([keyword, prefKey]) => {
    if (query.includes(keyword)) {
      learnPreference(prefKey, `Usuario menciona/prefiere: ${keyword}`);
    }
  });
  
  // PATRONES: detectar comportamientos repetitivos
  const hour = new Date(conversation.timestamp).getHours();
  const day = new Date(conversation.timestamp).getDay();
  
  if (query.includes('empleo') || query.includes('contrato') || query.includes('trabajo')) {
    const patternKey = `consulta_empleos_${getDayName(day)}_${getTimeOfDay(hour)}`;
    learnPattern(patternKey);
  }
  
  if (query.includes('token') || query.includes('billetera') || query.includes('saldo')) {
    const patternKey = `consulta_tokens_${getDayName(day)}_${getTimeOfDay(hour)}`;
    learnPattern(patternKey);
  }
  
  // GOALS: detectar menciones de objetivos
  if (query.includes('quiero') || query.includes('objetivo') || query.includes('meta')) {
    // Extraer posible goal (simplificado)
    const goalMatch = query.match(/quiero (.+?)(\.|$)/);
    if (goalMatch && goalMatch[1]) {
      setGoal(goalMatch[1].trim(), 3);
    }
  }
  
  saveMemory(memory);
}

/**
 * Aprende o refuerza una preferencia.
 */
function learnPreference(key: string, value: string): void {
  const memory = getMemory();
  const existing = memory.preferences.find(p => p.key === key);
  
  if (existing) {
    existing.confidence = Math.min(1, existing.confidence + 0.1);
    existing.lastSeen = Date.now();
  } else {
    memory.preferences.push({
      key,
      value,
      confidence: 0.3,
      learnedAt: Date.now(),
      lastSeen: Date.now(),
    });
  }
}

/**
 * Detecta y registra un patrón de comportamiento.
 */
function learnPattern(pattern: string): void {
  const memory = getMemory();
  const existing = memory.patterns.find(p => p.pattern === pattern);
  
  if (existing) {
    existing.frequency++;
    existing.lastOccurrence = Date.now();
  } else {
    memory.patterns.push({
      pattern,
      frequency: 1,
      lastOccurrence: Date.now(),
    });
  }
}

// ══════════════════════════════════════════════════════════════════════
// UTILIDADES
// ══════════════════════════════════════════════════════════════════════

function getDayName(day: number): string {
  const days = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  return days[day];
}

function getTimeOfDay(hour: number): string {
  if (hour >= 6 && hour < 12) return 'mañana';
  if (hour >= 12 && hour < 18) return 'tarde';
  if (hour >= 18 && hour < 22) return 'noche';
  return 'madrugada';
}

/**
 * Limpia la memoria (útil para testing o reset).
 */
export function clearMemory(): void {
  localStorage.removeItem(MEMORY_KEY);
  memoryCache = null;
}

/**
 * Exporta toda la memoria (para debug/analytics).
 */
export function exportMemory(): GemeloMemory {
  return getMemory();
}
