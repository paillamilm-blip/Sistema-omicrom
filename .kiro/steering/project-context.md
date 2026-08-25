# 🧠 Sistema Ómicron — Project Context (actualizado agosto 2026)

> **Fuente única de verdad** para cualquier agente o desarrollador que trabaje en este repositorio.
> Última actualización: 25 de agosto de 2026.

---

## 1. ¿Qué es?

**Sistema Ómicron** es una plataforma de aprendizaje continuo en tiempo real para la Industria 5.0.
Permite construir un **Gemelo Digital** — un perfil de reputación profesional verificable e infalsificable — y conectar esa reputación con oportunidades laborales reales al instante.

**Concepto central:** El usuario sube su CV → la IA lo analiza → se crea un Orbe Neuronal 3D con sus habilidades → un "Oráculo" por voz guía al usuario → las oportunidades de empleo llegan automáticamente.

**Posicionamiento:**
- NO es freemium: todas las funciones son gratis para siempre (incluida la IA).
- Idioma: español. Alcance: global.
- Diferenciador: reputación imposible de falsificar (evidencia real, validada entre pares).

---

## 2. Tech Stack

| Capa | Tecnología | Versión |
|------|-----------|---------|
| **Lenguaje** | TypeScript | 5.6 |
| **Frontend** | React | 18.3 |
| **Build** | Vite | 5.4 |
| **3D** | Three.js + @react-three/fiber + drei + postprocessing | 0.170 |
| **Animaciones** | Framer Motion | 11.x |
| **Estilos** | Design system propio (`src/theme/`) — NO TailwindCSS en runtime | tokens + shadows + typography + animations + layout |
| **Backend** | Supabase (Postgres + Auth + Realtime + Edge Functions) | 2.45 |
| **Estado** | React Context (split: Profile + Navigation + Realtime) + TanStack React Query | v5.60 |
| **IA primaria** | Google Gemini 3.6 Flash (directo) con fallback a OpenRouter (modelos gratuitos) | |
| **Validación** | Zod | 3.23 |
| **Math precisión** | decimal.js | 10.4 |
| **Iconos** | Lucide React | 0.456 |
| **Testing** | Vitest (unit) + Playwright (e2e) | |
| **Linting** | ESLint 9 (react-hooks + react-refresh + typescript-eslint) | |
| **CI/CD** | GitHub Actions (Node 22, checkout v5, setup-node v5) | |
| **Deploy** | Vercel (PWA instalable) | |
| **Package manager** | npm | |

---

## 3. Arquitectura

```
src/ (203 archivos TS/TSX)
├── App.tsx                    → Root: providers + auth flow + AppShell
├── main.tsx                   → Entry point + PWA registration
├── config/                    → hubs.ts, nodes.ts (configuración estática)
├── features/                  → 9 módulos por dominio (auto-contenidos)
│   ├── academia/              → Cursos, skill trees, tutoring IA
│   ├── auth/                  → Overlays: login, reset password, NoAccess
│   ├── chat/                  → Mensajería, red social
│   ├── empleos/               → Job matching, incoming job push
│   ├── gemelo/                → Gemelo Digital: reputación, credenciales, CV, perfil
│   ├── gobernanza/            → Votación, arbitraje, propuestas
│   ├── market/                → Marketplace servicios + Bóveda de conocimiento
│   ├── omicron/               → CORE: orbe 3D, oráculo, brain, coach, emotion, tools
│   └── wallet/                → Tokens, Stripe, premium
├── infrastructure/            → Concerns transversales
│   ├── ai/                    → client.ts (proxy), gemini.ts (CV analysis), stream.ts, personalization.ts, schemas/
│   ├── pwa/                   → Service worker registration
│   ├── query/                 → React Query client config
│   ├── router/                → routes.ts (TabId ↔ URL paths para deep linking)
│   ├── supabase/              → Singleton del cliente Supabase
│   └── voice/                 → engine.ts, recognition.ts, voiceAI.ts
├── shared/                    → Componentes UI + hooks + utils + motion
│   ├── components/            → 21 componentes reutilizables
│   ├── hooks/                 → useGemeloAging, useProgressiveBlur, useUserColor
│   ├── motion/                → Animaciones compartidas
│   └── utils/                 → analytics, haptics, spatialAudio, ambientDrone, guidance, guestMode, microcopy
├── store/                     → 4 providers globales
│   ├── AppContext.tsx         → FACADE que compone Profile + Navigation (useApp())
│   ├── ProfileContext.tsx     → Auth + perfil + Gemelo Digital + realtime updates
│   ├── NavigationContext.tsx  → activeTab + unreadCount
│   └── RealtimeContext.tsx    → Presencia multi-usuario + broadcast de progresión
├── hooks/                     → useBroadcastAchievement, useGemeloActivation, useIdleEscalation, useRealtimeNetwork
├── types/                     → 11 archivos de tipos (barrel re-export en index.ts)
├── theme/                     → tokens.ts, typography.ts, animations.ts, shadows.ts, layout.ts
├── styles/                    → CSS (responsive)
└── pages/                     → TerminosServicio.tsx

supabase/
├── migrations/                → 75 migraciones SQL (idempotentes, con RLS + triggers)
├── functions/                 → 22 Edge Functions (Deno, 26 archivos TS)
│   ├── _shared/               → rateLimit.ts, iaCredits.ts, cors.ts (compartido)
│   ├── proxy-ai/              → Gateway centralizado IA (Gemini-first + OpenRouter fallback)
│   ├── proxy-tts/             → Text-to-speech
│   ├── analizar-cv/           → Análisis de CV con IA
│   ├── tutor/                 → Tutor IA
│   ├── examen-ia/             → Exámenes IA
│   ├── carta-ia/              → Generación de cartas de postulación
│   ├── chat-assist/           → Asistencia en chat
│   ├── arbiter-ai/            → Árbitro IA para gobernanza
│   ├── vault-oracle/          → Oráculo de la Bóveda de conocimiento
│   ├── market-match/          → Matching de mercado
│   ├── simulador-universal/   → Simulador universal
│   ├── run-code/              → Sandbox de ejecución de código
│   ├── credential/            → Verificación de credenciales
│   ├── embed/                 → Embeddings semánticos
│   ├── ghost-approval/        → Aprobación automática
│   ├── notify-matches/        → Notificación de matches
│   ├── send-push/             → Push notifications
│   ├── sync-jobs/             → Sincronización de empleos
│   ├── crear-checkout/        → Stripe checkout
│   ├── stripe-webhook/        → Webhook de Stripe
│   └── verificar-pago/        → Verificación de pagos
├── schema.sql                 → Schema consolidado
├── seed.sql + seed_demo.sql   → Seeds de desarrollo
└── *.sql                      → Scripts de auditoría y puesta en marcha
```

---

## 4. Patrones Arquitectónicos Clave

1. **Feature-based modules**: Cada feature (gemelo, empleos, academia...) es auto-contenido con sus propios components/, services/, hooks/.
2. **Split Context (anti re-render)**: `ProfileContext` (cambia poco) separado de `NavigationContext` (cambia en cada tap). `AppContext` es solo un facade con `useApp()`.
3. **Edge Function Proxy (seguridad)**: La API key de IA NUNCA se expone al cliente. Todo pasa por `proxy-ai` server-side.
4. **Gemini-first con fallback**: El proxy intenta Gemini 3.6 Flash directamente, si falla baja a OpenRouter con 6 modelos gratuitos en cascada.
5. **Server-side reputation**: Los ejes de reputación se calculan SOLO en triggers SQL (`SECURITY DEFINER`). El cliente NO puede escribirlos (trigger `protect_profile_columns` los revierte).
6. **Lazy loading**: Todos los tabs se cargan con `React.lazy()` para minimizar el bundle inicial.
7. **Realtime subscriptions**: Canal Supabase Realtime para actualizaciones de perfil (debounced 300ms) + presencia multi-usuario + broadcast de progresión.
8. **Emotion-aware AI**: El detector de emociones (heurístico, 0 latencia) adapta el tono de Ómicron en tiempo real.
9. **Tool-calling agent**: Ómicron puede sugerir herramientas ([EXAMEN:react], [BÓVEDA], etc.) que el frontend ejecuta.
10. **AI personalization**: Perfil de IA en localStorage que aprende tono, estilo y debilidades del usuario.

---

## 5. Modelo de Reputación (Gemelo Digital)

```
experience_score = promedio(Ejecución, Calidad, Trascendencia, Fundamento)   # 0-100
base             = 0.20 × traditional_score + 0.80 × experience_score
momentum         = min(15, sqrt(pe_points) / 4)
reputation_score = min(100, base + momentum)
```

### Los 4 Ejes:
| Eje | Qué mide | Se alimenta de |
|-----|----------|----------------|
| 🛠️ Ejecución | Entregas y cierras trabajo | Contratos `RELEASED` |
| ⭐ Calidad | Qué tan bien lo haces | Calificaciones 1-5 del comprador |
| 🌱 Trascendencia | Cuánto aportas al ecosistema | Servicios + docs Bóveda + mentorías |
| 📚 Fundamento | Base de conocimiento | Nodos skill `VALIDATED`/`MASTERED` |

### Niveles del Nodo:
| Nivel | Nombre | Umbral (reputación) |
|-------|--------|---------------------|
| N1 | 🌱 Estudiante | 0-49 |
| N2 | 🔧 Técnico | 50-79 |
| N3 | 🏛️ Arquitecto | 80-100 |

**Reglas de oro:**
- Reputación se calcula SOLO server-side (triggers SQL).
- `experience_score` es DERIVADO (promedio de 4 ejes). Nunca se acumula a mano.
- 20/80 es sagrado: credenciales 20%, desempeño demostrado 80%.
- El cliente lee, no escribe.

---

## 6. Navegación

- **9 Tabs (TabId)**: `perfil`, `maxskill`, `academia`, `empleos`, `chat`, `market`, `wallet`, `gobernanza`, `vault`
- **Orbe Neuronal 3D**: Los 9 hubs son nodos permanentes del orbe. Los skills del CV se convierten en nodos de conocimiento adicionales.
- **Deep linking**: Cada tab tiene URL path (`/academia`, `/empleos`, `/mercado`, etc.) en `infrastructure/router/routes.ts`.
- **Navegación por voz**: El Oráculo (`services/oraculo.ts`) interpreta lenguaje natural → intent → acción.
- **Lazy loading**: Todos los tab components via `React.lazy()`.

---

## 7. Sistema de IA

### Componentes:
| Archivo | Responsabilidad |
|---------|----------------|
| `infrastructure/ai/client.ts` | Proxy seguro (callAI → Edge Function) |
| `infrastructure/ai/stream.ts` | Streaming token-by-token |
| `infrastructure/ai/gemini.ts` | Análisis de CV (structured output + Zod) |
| `infrastructure/ai/personalization.ts` | Aprendizaje adaptativo del usuario |
| `features/omicron/services/brain.ts` | Cerebro unificado (coach + tutor + motivador) |
| `features/omicron/services/oraculo.ts` | Parser de intención (lenguaje natural → acción) |
| `features/omicron/services/emotion.ts` | Detector emocional heurístico (0 latencia) |
| `features/omicron/services/tools.ts` | Tool-calling (Ómicron como agente) |
| `features/omicron/services/coach.ts` | Motor de mejora determinista (sin IA, siempre responde) |

### Modelo LLM:
- **Primary**: Google Gemini 3.6 Flash (directo via API key server-side)
- **Fallback**: OpenRouter con modelos gratuitos: `google/gemma-4-31b-it:free`, `nvidia/nemotron-3-super-120b-a12b:free`, etc.
- **Límite diario**: 20 interacciones/día (client-side complementario + server-side real)

---

## 8. Estado del Proyecto (agosto 2026)

**Progreso**: ~75% del core implementado.

### ✅ Completado:
- 9 hubs navegación activos (orbe 3D)
- 7+ funciones IA gratuitas
- Reputación canónica con 4 ejes (server-side)
- Red en tiempo real (presence + broadcast + rankings)
- 75 migraciones SQL + 22 Edge Functions
- Orbe neuronal 3D con nodos dinámicos del CV
- Convalidación de CV con IA
- Skills con nivel real (pct IA) + sinergia
- Onboarding + flujo conversacional robusto
- CI/CD en verde

### ⏳ Pendiente:
- Activar Stripe (pagos reales)
- Verificar Tribunal de Pares e2e
- Confirmar UX en celular real

### 🔮 Roadmap:
- M1 (agosto 2026): Producción estable
- M2 (septiembre 2026): Primeros 50+ usuarios reales
- M3 (octubre 2026): Auto-postulación (Agentic AI)
- M4 (noviembre 2026): Credencial W3C verificable
- M5 (Q1 2027): Auditoría seguridad + accesibilidad
- M6 (Q2 2027): SBT on-chain

---

## 9. Comandos

| Comando | Uso |
|---------|-----|
| `npm run dev` | Servidor de desarrollo (localhost:5173) |
| `npm run build` | Build de producción (vite build) |
| `npm run typecheck` | Verificación TypeScript (tsc --noEmit) |
| `npm run lint` | ESLint |
| `npm run test` | Tests unitarios (vitest --run) |
| `npm run test:e2e` | Tests e2e (playwright test) |
| `npm run preview` | Preview del build |

---

## 10. Documentos del Proyecto

| Documento | Contenido |
|-----------|-----------|
| `DEFINICION_OMICROM.md` | Visión, pilares, modelo económico |
| `DEFINICION_OMICROM_v8_BACKEND.md` | Arquitectura técnica backend |
| `DEFINICION_REPUTACION_OMICROM.md` | Fórmula canónica del Gemelo Digital (FUENTE ÚNICA DE VERDAD) |
| `PLAN_PRODUCCION.md` | Roadmap + estado operativo + KPIs |
| `GUIA_ACTIVACION_PRODUCCION.md` | Pasos para activar Stripe, Sentry, SMTP |
| `CHANGELOG.md` | Historial de cambios |
| `REFACTORING_PLAN.md` | Plan de refactorización |
| `TERMINOS_SERVICIO.md` | Términos legales |
| `POLITICA_PRIVACIDAD.md` | Política de privacidad |

---

## 11. Convenciones de Código

- **Idioma del código**: TypeScript, nombres de variables en inglés, comentarios en español.
- **Imports**: Path alias `@/` apunta a `src/`.
- **Componentes**: Functional components con hooks. Sin clases.
- **Estilos**: Inline styles con constantes del design system (`C`, `FONT`, `ANIM` de `@/theme`). NO se usa TailwindCSS en componentes (solo en utilidades internas de reputación).
- **Tests**: Co-locados (`*.test.ts` junto al archivo que prueban).
- **Tipos**: Barrel re-export en `src/types/index.ts`. Granular en archivos individuales.
- **Edge Functions**: Deno runtime con imports JSR (`jsr:@supabase/...`).
- **Git**: Branch + PR hacia `main`. CI automático (typecheck, lint, test, build).

---

## 12. Variables de Entorno

```bash
VITE_SUPABASE_URL=https://<proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_OPENROUTER_KEY=<key-openrouter>      # Solo para dev local (producción usa server-side)
# Server-side (Edge Functions):
OPENROUTER_KEY=<key>
GEMINI_API_KEY=<key>
SUPABASE_SERVICE_ROLE_KEY=<key>
PUBLIC_SITE_URL=https://sistema-omicrom.vercel.app
```
