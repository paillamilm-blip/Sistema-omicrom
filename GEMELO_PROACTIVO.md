# Sistema Gemelo Proactivo con Memoria 🧠⚡️

## Innovación Estratosférica — Como Jarvis para Tony Stark

El Gemelo Digital de Ómicron ahora **anticipa necesidades**, **recuerda conversaciones**, **aprende preferencias** y **reacciona emocionalmente**. Un salto cuántico en experiencia de usuario.

---

## Arquitectura del Sistema

### 1. **Memoria Contextual** (`src/lib/gemeloMemory.ts`)

#### 📦 Almacenamiento
- **localStorage**: últimas 50 conversaciones
- Cada conversación incluye: query, response, context (timestamp, tab, reputation, etc)
- Persistente entre sesiones

#### 🧠 Aprendizaje
```typescript
// Preferencias aprendidas (confianza >= 0.6)
interface Preference {
  preference: string;    // "consulta_empleos_lunes"
  value: string;         // "true"
  confidence: number;    // 0.8 (alta confianza)
  lastUpdated: number;   // timestamp
}

// Patrones de comportamiento (frecuencia >= 2)
interface Pattern {
  pattern: string;       // "usa_oraculo_mañana"
  frequency: number;     // 5 veces detectado
  lastSeen: number;      // última ocurrencia
}

// Objetivos del usuario
interface Goal {
  goal: string;          // "subir a Nodo 3"
  priority: number;      // 1-5
  progress: number;      // 0-100%
  lastMentioned: number; // timestamp
}
```

#### 🎯 Inferencia de Personalidad
```typescript
inferPersonality() => {
  traits: ['technical', 'goal-oriented', 'curious'],
  communicationStyle: 'technical' | 'casual' | 'mixed',
  preferredTopics: ['empleos', 'academia', 'reputacion'],
  activityPattern: 'morning' | 'evening' | 'consistent',
  confidence: number
}
```

#### 💬 Saludo Contextual
```typescript
generateContextualGreeting(userName, hour, reputation, daysSinceLastLogin)
// → "¡Buenas noches, Pablo! Tu reputación está en 72."
// → "¡Bienvenido de vuelta! Han pasado 3 días. Tu Nodo 2 sigue sólido."
```

---

### 2. **Motor de Proactividad** (`src/lib/proactiveEngine.ts`)

#### 🔍 7 Detectores Contextuales

| Detector | Trigger | Prioridad | Throttle |
|----------|---------|-----------|----------|
| **greeting** | Primera apertura del día | 3 | 4h |
| **opportunity** | Oportunidad match >90% | 5 | 2h |
| **network_surge** | +3 nodos online | 4 | ninguno |
| **milestone** | Nodo 2/3, PE milestones | 4-5 | único por milestone |
| **reminder** | Goals pendientes | 2 | 24h |
| **inactivity** | 3-7 días offline | 3 | único |
| **suggestion** | Basado en patrones | 2-3 | contextual |

#### 🎲 Contexto de Evaluación
```typescript
interface ProactiveContext {
  currentHour: number;         // 0-23
  dayOfWeek: number;          // 0-6
  reputation: number;         // 0-100
  pe: number;                 // puntos experiencia
  onlineCount: number;        // nodos en red ahora
  lastOnlineCount: number;    // nodos hace 1 min
  daysSinceLastLogin: number; // inactividad
  currentTab: string;         // contexto navegación
  userName?: string;          // personalización
}
```

#### 📢 Eventos Proactivos
```typescript
interface ProactiveEvent {
  type: 'greeting' | 'opportunity' | 'network_surge' | 'milestone' | 'reminder' | 'inactivity' | 'suggestion';
  priority: number;      // 1-5 (5 = urgente)
  message: string;       // "¡Subiste a Nodo 2! Nuevas oportunidades premium."
  emotion: OrbEmotion;   // 'idle' | 'thinking' | 'excited' | 'alert' | 'celebrating'
  actions?: Array<{
    label: string;       // "Ver oportunidades"
    action: () => void;  // función ejecutable
  }>;
  timestamp: number;
}
```

#### ⚙️ Orquestador
```typescript
evaluateProactiveEvents(context, opportunities?) 
// → Ejecuta todos los detectores
// → Retorna el evento de MAYOR PRIORIDAD
// → null si no hay eventos relevantes
```

---

### 3. **Orbe Emocional 3D** (`src/components/HoloNucleo3D.tsx`)

#### 🎨 5 Emociones Visuales

| Emoción | Color Core | Color Halo | Pulso | Uso |
|---------|-----------|-----------|-------|-----|
| **idle** | cyan `#06B6D4` | `#22D3EE` | 1.2x | Reposo |
| **thinking** | purple `#8B5CF6` | `#A78BFA` | 0.6x | Procesando |
| **excited** | gold `#F59E0B` | `#FCD34D` | 2.4x | Oportunidad |
| **alert** | red `#EF4444` | `#FCA5A5` | 3.0x | Urgente |
| **celebrating** | green `#10B981` | `#6EE7B7` | 1.8x | Logro |

#### 🎵 Reactividad al Audio
```typescript
<HoloNucleo3D 
  emotion="thinking"
  audioLevel={0.7}  // 0-1, nivel micrófono
/>
// → Partículas vibran con la voz
// → Orbe late más rápido
// → Velocidad partículas aumenta
```

#### 💫 Efectos Dinámicos
- **Pulso emocional**: velocidad varía según emoción (0.6x - 3.0x)
- **Audio reactivo**: partículas aceleran con `audioLevel`
- **Colores dinámicos**: gradiente core/halo/accent cambia
- **Transiciones suaves**: sin parpadeos bruscos

---

### 4. **Notificaciones Inteligentes** (`src/components/GemeloProactive.tsx`)

#### 🔔 Toast Holográfico
- **Glass effect**: `backdrop-filter: blur(20px)` + transparencia
- **Iconos emocionales**: Sparkles (idle), Bell (thinking), TrendingUp (excited), AlertCircle (alert), Trophy (celebrating)
- **Colores dinámicos**: borde + sombra según emoción
- **Animación entrada**: slide desde derecha con bounce
- **Urgent pulse**: prioridad >= 4 pulsa el borde

#### ⏱ Auto-dismiss Inteligente
- **Con acciones**: NO se cierra solo, usuario debe elegir
- **Sin acciones**: cierre automático 15 segundos, barra de progreso
- **Dismissible**: botón X siempre disponible

#### 🔘 Botones de Acción
```typescript
actions: [
  { label: 'Postular ahora', action: () => { /* apply job */ } },
  { label: 'Ver detalles', action: () => { /* navigate */ } },
  { label: 'Ignorar', action: () => { /* dismiss */ } },
]
// → Primer botón: estilo primario (color emoción)
// → Resto: estilo secundario (ghost)
```

---

### 5. **Integración OraculoBar** (`src/components/OraculoBar.tsx`)

#### 💾 Persistencia de Conversaciones
Todas las interacciones se registran:
```typescript
// Navegación
remember("abre mi billetera", "Abriendo Billetera.", {
  timestamp: Date.now(),
  tab: 'oraculo',
  targetTab: 'wallet',
  reputation: 72,
  onlineCount: 5,
  communicationStyle: 'casual'
});

// Consulta datos
remember("cuánta reputación tengo", "Tu reputación es 72 sobre 100.", {
  timestamp: Date.now(),
  queryType: 'reputacion',
  ...context
});

// Coach IA
remember("dame un consejo", "Para tu Nodo 2, te conviene...", {
  timestamp: Date.now(),
  coachAdvice: true,
  ...context
});

// Convalidación
remember("registra mi CV", "Registré tu CV en tu Gemelo.", {
  timestamp: Date.now(),
  convalidationType: 'cv',
  ...context
});
```

#### 🎙 Saludo Proactivo Contextual
```typescript
function proactiveGreet() {
  const userName = profile?.display_name || 'operador';
  const hour = new Date().getHours();
  const reputation = profile?.reputation_score ?? 0;
  
  // ⭐ Usa memoria para personalizar
  const greeting = generateContextualGreeting(
    userName, 
    hour, 
    reputation, 
    daysSinceLastLogin
  );
  
  const next = bestNextStep(getProfile());
  const net = onlineCount > 0 
    ? `Hay ${onlineCount} nodos en línea. ` 
    : '';
  
  speak(`${greeting} ${net}${next.label}.`);
}
```

---

### 6. **Orquestador HoloGemeloHome** (`src/components/perfil/HoloGemeloHome.tsx`)

#### 🚀 Flujo de Inicialización
```typescript
useEffect(() => {
  // 1. Calcular días inactivo
  const daysSinceLastLogin = getDaysSinceLastLogin();
  
  // 2. Construir contexto completo
  const context = {
    currentHour: new Date().getHours(),
    dayOfWeek: new Date().getDay(),
    reputation: rep,
    pe,
    onlineCount,
    lastOnlineCount,
    daysSinceLastLogin,
    currentTab: 'perfil',
    userName: profile?.display_name,
  };
  
  // 3. Evaluar eventos proactivos
  const event = evaluateProactiveEvents(context);
  
  // 4. Mostrar evento (si existe)
  if (event) {
    setProactiveEvent(event);
    setEmotion(event.emotion);
    speak(event.message); // voz sincronizada
  }
}, []); // Solo al montar
```

#### 📡 Detección Network Surge en Tiempo Real
```typescript
useEffect(() => {
  if (onlineCount !== lastOnlineCount) {
    const surge = onlineCount - lastOnlineCount;
    
    if (surge >= 3) {
      const event = evaluateProactiveEvents(context);
      
      if (event?.type === 'network_surge') {
        setProactiveEvent(event);
        setEmotion('excited');
        speak(event.message);
      }
    }
    
    setLastOnlineCount(onlineCount);
  }
}, [onlineCount]);
```

#### 🎭 Sincronización Voz ↔ Emoción
```typescript
function speakOracle(text: string) {
  setEmotion('thinking');  // orbe piensa
  
  speak(text, 
    () => setSpeaking(true),  // inicia voz
    () => {
      setSpeaking(false);     // termina voz
      setEmotion('idle');     // orbe en reposo
    }
  );
}
```

#### 🔗 Conexión con HoloNucleo3D
```tsx
<HoloNucleo3D
  reputation={rep}
  axes={ax}
  chips={chips}
  emotion={emotion}          // ⭐ emoción dinámica
  audioLevel={audioLevel}    // ⭐ nivel audio (futuro: micrófono)
  onNavigate={(tab) => setActiveTab(tab)}
/>

<GemeloProactive
  event={proactiveEvent}     // ⭐ evento proactivo
  onDismiss={() => setProactiveEvent(null)}
  onAction={(index) => {
    proactiveEvent?.actions?.[index].action();
  }}
/>
```

---

## API Completa

### gemeloMemory

```typescript
// Registrar conversación
remember(query: string, response: string, context: Record<string, any>)

// Recuperar historial
recall(limit?: number): Conversation[]

// Obtener preferencias aprendidas
getPreferences(): Preference[]

// Obtener patrones detectados
getPatterns(): Pattern[]

// Obtener objetivos usuario
getGoals(): Goal[]

// Inferir personalidad
inferPersonality(): Personality

// Generar saludo contextual
generateContextualGreeting(
  userName: string, 
  hour: number, 
  reputation: number, 
  daysSinceLastLogin: number
): string

// Obtener contexto para consulta (futuro)
getContextForQuery(query: string): Record<string, any>
```

### proactiveEngine

```typescript
// Evaluar todos los detectores
evaluateProactiveEvents(
  context: ProactiveContext,
  opportunities?: Opportunity[]
): ProactiveEvent | null

// Calcular inactividad
getDaysSinceLastLogin(): number

// Resetear throttles (testing)
resetProactiveState(): void

// Detectores individuales (exportados para testing/extensión)
detectGreeting(context: ProactiveContext): ProactiveEvent | null
detectNetworkSurge(context: ProactiveContext): ProactiveEvent | null
detectOpportunity(context: ProactiveContext, opportunities: Opportunity[]): ProactiveEvent | null
detectMilestone(context: ProactiveContext): ProactiveEvent | null
detectReminder(context: ProactiveContext): ProactiveEvent | null
detectInactivity(context: ProactiveContext): ProactiveEvent | null
detectSuggestion(context: ProactiveContext): ProactiveEvent | null
```

---

## Ejemplos de Uso

### 1. Usuario abre la app por primera vez del día

```typescript
// HoloGemeloHome evalúa eventos al montar
const context = {
  currentHour: 9,
  dayOfWeek: 1, // lunes
  reputation: 72,
  pe: 1250,
  onlineCount: 8,
  lastOnlineCount: 8,
  daysSinceLastLogin: 0,
  currentTab: 'perfil',
  userName: 'Pablo',
};

const event = evaluateProactiveEvents(context);
// → type: 'greeting'
// → message: "¡Buenos días, Pablo! Tu reputación está en 72. Tu mejor paso: Completar curso React Avanzado."
// → emotion: 'idle'
// → priority: 3

// Orbe muestra cyan, toast aparece, voz habla saludo
```

### 2. Sube a Nodo 3 (milestone)

```typescript
// detectMilestone() detecta cruce umbral 80
localStorage.setItem('omicron_previous_rep', '79'); // antes
context.reputation = 80; // ahora

const event = evaluateProactiveEvents(context);
// → type: 'milestone'
// → message: "¡NODO 3 ALCANZADO! Eres élite. Contratos senior desbloqueados."
// → emotion: 'celebrating'
// → priority: 5

// Orbe verde, partículas rápidas, toast urgent-pulse, voz celebra
```

### 3. Nueva oportunidad premium

```typescript
const opportunities = [
  { title: 'Senior React Dev', company: 'TechCorp', match: 94 }
];

const event = evaluateProactiveEvents(context, opportunities);
// → type: 'opportunity'
// → message: "Nueva oportunidad: Senior React Dev en TechCorp con 94% de match. ¿Postulo por ti?"
// → emotion: 'alert'
// → priority: 5
// → actions: [
//     { label: 'Postular ahora', action: applyToJob },
//     { label: 'Ver detalles', action: navigate },
//     { label: 'Ignorar', action: dismiss },
//   ]

// Orbe rojo, toast urgent-pulse con botones, voz alerta
```

### 4. Network surge (actividad red)

```typescript
// useEffect en HoloGemeloHome detecta cambio
onlineCount = 12; // antes: 8
surge = 12 - 8 = 4; // >= 3 → detecta

const event = evaluateProactiveEvents(context);
// → type: 'network_surge'
// → message: "4 nodos nuevos entraron a la red. La actividad está alta, es buen momento para conectar."
// → emotion: 'excited'
// → priority: 4

// Orbe dorado, partículas rápidas, toast con acción "Ver red"
```

### 5. Usuario inactivo 5 días

```typescript
const context = {
  ...baseContext,
  daysSinceLastLogin: 5,
};

const event = evaluateProactiveEvents(context);
// → type: 'inactivity'
// → message: "Han pasado 5 días. Tu Gemelo te extraña. Te recomiendo: Completar curso pendiente. ¿Te ayudo?"
// → emotion: 'thinking'
// → priority: 3

// Orbe púrpura, pulso lento, toast invita a retomar
```

---

## Testing y Debugging

### Resetear Estado Proactivo
```typescript
import { resetProactiveState } from '../lib/proactiveEngine';

// En consola o test
resetProactiveState();
// → Limpia todos los throttles
// → Permite re-testear eventos inmediatamente
```

### Simular Milestone
```typescript
localStorage.setItem('omicron_previous_rep', '49');
// Luego subir reputación a 50 → detectará milestone Nodo 2
```

### Forzar Saludo
```typescript
localStorage.removeItem('omicron_last_greeting');
// Luego recargar página → saluda de nuevo
```

### Inspeccionar Memoria
```typescript
import { recall, getPreferences, getPatterns, inferPersonality } from '../lib/gemeloMemory';

console.log('Historial:', recall(10));
console.log('Preferencias:', getPreferences());
console.log('Patrones:', getPatterns());
console.log('Personalidad:', inferPersonality());
```

---

## Roadmap Futuro

### V2: Memoria Extendida
- [ ] **IndexedDB** para >500 conversaciones
- [ ] **Búsqueda semántica** con embeddings
- [ ] **Contexto multi-sesión** (resumir conversaciones pasadas)
- [ ] **Exportar memoria** a JSON (backup usuario)

### V3: Proactividad Avanzada
- [ ] **Predicción ML** de próximos pasos usuario
- [ ] **Calendario inteligente** (recordatorios basados en horario)
- [ ] **Integración calendario** (detectar deadlines)
- [ ] **Notificaciones push** (service worker)

### V4: Orbe Avanzado
- [ ] **Gestos 3D** (orbe se mueve según contexto)
- [ ] **Partículas complejas** (física realista)
- [ ] **Avatares 3D** (Gemelo con rostro/body)
- [ ] **Realidad aumentada** (AR con cámara)

### V5: Voz Avanzada
- [ ] **Análisis sentimiento** en voz usuario
- [ ] **Respuestas emocionales** (tono voz cambia)
- [ ] **Multilenguaje** (detectar idioma automático)
- [ ] **Voces personalizadas** (clonar voz usuario)

---

## Impacto del Sistema

### Antes (sin Gemelo Proactivo)
- ❌ Usuario debe recordar qué hacer
- ❌ Navegación manual constante
- ❌ No hay feedback de logros
- ❌ Orbe estático, sin vida
- ❌ Experiencia genérica

### Después (con Gemelo Proactivo)
- ✅ Sistema **anticipa necesidades**
- ✅ **Saluda personalizadamente**
- ✅ **Celebra logros** automáticamente
- ✅ **Detecta oportunidades** críticas
- ✅ **Recomienda** basado en patrones
- ✅ Orbe **vivo y emocional**
- ✅ Experiencia **premium única**

---

## Conclusión

El Sistema Gemelo Proactivo con Memoria transforma Ómicron de una plataforma pasiva a un **asistente inteligente proactivo** que:

1. **Te conoce**: recuerda tus conversaciones, aprende tus preferencias
2. **Te guía**: anticipa tu próximo paso, te recomienda acciones
3. **Te celebra**: detecta tus logros y los festeja contigo
4. **Te alerta**: te avisa oportunidades críticas antes que las pierdas
5. **Es humano**: responde emocionalmente, cambia según contexto

**Nivel de innovación**: ESTRATOSFÉRICO 🚀

Como Jarvis para Tony Stark. Como KITT para Michael Knight. Como HAL pero sin el lado oscuro.

Tu Gemelo Digital ahora es tu **partner en el ecosistema**.

---

**Implementado en**: PR #38 `feat/omicron-consolidado`  
**Commit**: `2b604e5` "feat(gemelo): sistema proactivo con memoria COMPLETO ⚡️🧠"  
**Preview**: https://sistema-omicrom-git-feat-omi-2afbb4-tuprofendustrial-s-projects.vercel.app

---

_Documentación actualizada: 2026-07-09_
