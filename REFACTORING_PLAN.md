# 🏗️ Plan de Refactorización — Sistema Ómicron

> **Objetivo**: Transformar una app de ~30K líneas con estructura plana y mezclada en una arquitectura modular por dominio, mantenible, escalable y con boundaries claros.

---

## 📊 Diagnóstico Actual

| Problema | Impacto |
|----------|---------|
| `src/lib/` es un bucket plano de 35+ archivos | Imposible encontrar qué pertenece a qué dominio |
| `components/shared/` mezcla UI genérico con features completas | Reutilización confusa, acoplamiento oculto |
| `components/tabs/` son las "pages" pero no se llaman así | Confuso para nuevos devs |
| Un solo `types/index.ts` de 322 líneas | Todo importa de todo |
| Sin path aliases (`../../..` everywhere) | Imports frágiles y largos |
| No hay service layer real | Lógica de negocio desperdigada en lib/ |

---

## 🎯 Arquitectura Target

```
src/
├── app/                          # Shell de la aplicación
│   ├── App.tsx                   # Root component
│   ├── AppShell.tsx              # Shell con auth/guest logic
│   └── providers.tsx             # Todos los providers compuestos
│
├── config/                       # Configuración estática
│   ├── hubs.ts
│   ├── nodes.ts
│   └── constants.ts
│
├── features/                     # ⭐ MÓDULOS POR DOMINIO
│   ├── perfil/
│   │   ├── components/           # UI específica del perfil
│   │   ├── hooks/                # Hooks del dominio
│   │   ├── services/             # Lógica de negocio
│   │   ├── types.ts              # Tipos del dominio
│   │   └── index.ts              # Barrel export
│   │
│   ├── academia/
│   │   ├── components/
│   │   ├── services/
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── empleos/
│   │   ├── components/
│   │   ├── services/
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── market/
│   │   ├── components/
│   │   ├── services/
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── wallet/
│   │   ├── components/
│   │   ├── services/
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── chat/
│   │   ├── components/
│   │   ├── services/
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── gobernanza/
│   │   ├── components/
│   │   ├── services/
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── gemelo/                   # El Gemelo Digital (AI twin)
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── omicron/                  # El orbe / asistente IA
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   └── auth/
│       ├── components/
│       ├── services/
│       ├── types.ts
│       └── index.ts
│
├── shared/                       # ⭐ SOLO UI GENÉRICO REUTILIZABLE
│   ├── components/
│   │   ├── Modal.tsx
│   │   ├── Toast.tsx
│   │   ├── Skeleton.tsx
│   │   ├── EmptyState.tsx
│   │   ├── ErrorBoundary.tsx
│   │   └── ConnectionBanner.tsx
│   ├── hooks/
│   │   └── useBroadcastAchievement.ts
│   └── utils/
│       ├── analytics.ts
│       └── guestMode.ts
│
├── infrastructure/               # ⭐ CAPA TÉCNICA (sin lógica de negocio)
│   ├── supabase/
│   │   ├── client.ts             # Instancia de Supabase
│   │   └── realtime.ts           # Subscripciones realtime
│   ├── ai/
│   │   ├── client.ts             # OpenRouter/Gemini wrapper
│   │   ├── stream.ts             # Streaming helpers
│   │   └── personalization.ts    # Context/prompt engineering
│   ├── voice/
│   │   ├── engine.ts
│   │   ├── recognition.ts
│   │   └── tts.ts
│   ├── pwa/
│   │   ├── install.ts
│   │   ├── push.ts
│   │   └── update.ts
│   └── storage/
│       └── localStorage.ts
│
├── store/                        # Estado global
│   ├── AppContext.tsx             # Facade (mantener por compat)
│   ├── ProfileContext.tsx
│   ├── NavigationContext.tsx
│   └── RealtimeContext.tsx
│
├── theme/                        # Design System
│   ├── tokens.ts                 # Colores, spacing, etc.
│   ├── typography.ts             # Fuentes y estilos de texto
│   ├── animations.ts             # Keyframes, springs, easings
│   ├── shadows.ts                # Sombras y glows
│   └── index.ts                  # Re-export todo (compat con import { C } from '@/theme')
│
├── types/                        # Tipos compartidos entre dominios
│   ├── common.ts                 # AuthStatus, TabId, etc.
│   ├── profile.ts                # Profile, GemeloDigital, Reputation
│   ├── skills.ts                 # SkillTreeNode, UserSkillProgress, Tests
│   ├── jobs.ts                   # JobPosting, JobMatch, EscrowContract
│   ├── chat.ts                   # ChatRoom, ChatMessage
│   ├── notifications.ts          # Notification, NotificationType
│   ├── governance.ts             # Dispute, etc.
│   └── index.ts                  # Barrel re-export (compat)
│
└── pages/                        # Páginas estáticas/legales
    └── TerminosServicio.tsx
```

---

## 🔄 Mapeo: Archivos Actuales → Nueva Ubicación

### `src/lib/` → Split por dominio

| Archivo actual | Nueva ubicación |
|---------------|-----------------|
| `supabase.ts` | `infrastructure/supabase/client.ts` |
| `aiClient.ts` | `infrastructure/ai/client.ts` |
| `aiStream.ts` | `infrastructure/ai/stream.ts` |
| `aiPersonalization.ts` | `infrastructure/ai/personalization.ts` |
| `geminiClient.ts` | `infrastructure/ai/gemini.ts` |
| `voiceAI.ts`, `voiceEngine.ts` | `infrastructure/voice/engine.ts` |
| `speechRecognition.ts` | `infrastructure/voice/recognition.ts` |
| `pushNotifications.ts` | `infrastructure/pwa/push.ts` |
| `pwaUpdate.ts` | `infrastructure/pwa/update.ts` |
| `analytics.ts` | `shared/utils/analytics.ts` |
| `guestMode.ts` | `shared/utils/guestMode.ts` |
| `omicronBrain.ts` | `features/omicron/services/brain.ts` |
| `omicronCoach.ts` | `features/omicron/services/coach.ts` |
| `omicronTools.ts` | `features/omicron/services/tools.ts` |
| `omicronVoice.ts` | `features/omicron/services/voice.ts` |
| `oraculo.ts` | `features/omicron/services/oraculo.ts` |
| `orbNotify.ts` | `features/omicron/services/notify.ts` |
| `gemeloProfile.ts` | `features/gemelo/services/profile.ts` |
| `gemeloMemory.ts` | `features/gemelo/services/memory.ts` |
| `gemeloComprador.ts` | `features/gemelo/services/comprador.ts` |
| `progressiveProfile.ts` | `features/gemelo/services/progressive.ts` |
| `proactiveEngine.ts` | `features/gemelo/services/proactive.ts` |
| `jobMatcher.ts` | `features/empleos/services/matcher.ts` |
| `empleosSinteticos.ts` | `features/empleos/services/sinteticos.ts` |
| `cartaPostulacion.ts` | `features/empleos/services/postulacion.ts` |
| `cvAnalyzer.ts` | `features/perfil/services/cvAnalyzer.ts` |
| `cvExtract.ts` | `features/perfil/services/cvExtract.ts` |
| `dailyChallenge.ts` | `features/academia/services/dailyChallenge.ts` |
| `academiaGenerativa.ts` | `features/academia/services/generativa.ts` |
| `secureChat.ts` | `features/chat/services/secureChat.ts` |
| `mercadoPotencial.ts` | `features/market/services/potencial.ts` |
| `emotionDetector.ts` | `features/omicron/services/emotion.ts` |

### `src/components/shared/` → Split

| Archivo | ¿Genérico? | Nueva ubicación |
|---------|------------|-----------------|
| `Modal.tsx` | ✅ | `shared/components/Modal.tsx` |
| `Toast.tsx` | ✅ | `shared/components/Toast.tsx` |
| `Skeleton.tsx` | ✅ | `shared/components/Skeleton.tsx` |
| `EmptyState.tsx` | ✅ | `shared/components/EmptyState.tsx` |
| `ErrorBoundary.tsx` | ✅ | `shared/components/ErrorBoundary.tsx` |
| `ConnectionBanner.tsx` | ✅ | `shared/components/ConnectionBanner.tsx` |
| `BottomNav.tsx` | ✅ (navigation) | `shared/components/BottomNav.tsx` |
| `HubSubNav.tsx` | ✅ (navigation) | `shared/components/HubSubNav.tsx` |
| `ExamenChallenge.tsx` | ❌ Academia | `features/academia/components/ExamenChallenge.tsx` |
| `CourseFlow.tsx` | ❌ Academia | `features/academia/components/CourseFlow.tsx` |
| `SimulatorChallenge.tsx` | ❌ Academia | `features/academia/components/SimulatorChallenge.tsx` |
| `UniversalSimulator.tsx` | ❌ Academia | `features/academia/components/UniversalSimulator.tsx` |
| `DailyChallengeCard.tsx` | ❌ Gamification/Academia | `features/academia/components/DailyChallengeCard.tsx` |
| `DashboardVivo.tsx` | ❌ Perfil | `features/perfil/components/DashboardVivo.tsx` |
| `LiveRanking.tsx` | ❌ Perfil | `features/perfil/components/LiveRanking.tsx` |
| `LivePresence.tsx` | ❌ Social | `features/perfil/components/LivePresence.tsx` |
| `IncomingJobs.tsx` | ❌ Empleos | `features/empleos/components/IncomingJobs.tsx` |
| `Onboarding.tsx` | ❌ Onboarding | `features/omicron/components/Onboarding.tsx` |
| `GemeloBadge.tsx` | ❌ Gemelo | `features/gemelo/components/Badge.tsx` |
| `GemeloGuidance.tsx` | ❌ Gemelo | `features/gemelo/components/Guidance.tsx` |
| `HoloGemeloScreen.tsx` | ❌ Gemelo | `features/gemelo/components/HoloScreen.tsx` |
| `ProgressRadar.tsx` | ❌ Gemelo | `features/gemelo/components/ProgressRadar.tsx` |
| `JourneyProgress.tsx` | ❌ Gemelo | `features/gemelo/components/JourneyProgress.tsx` |
| `Premium.tsx` | ❌ Billing | `features/wallet/components/Premium.tsx` |
| `InstallPWA.tsx` | ❌ PWA | `shared/components/InstallPWA.tsx` |
| `PushPermissionBanner.tsx` | ❌ PWA | `shared/components/PushPermissionBanner.tsx` |
| `NoAccess.tsx` | ❌ Auth | `features/auth/components/NoAccess.tsx` |
| `StreakBanner.tsx` | ❌ Gamification | `features/academia/components/StreakBanner.tsx` |
| `CyberComponents.tsx` | ✅ UI Kit | `shared/components/CyberComponents.tsx` |
| `NotificationsPanel.tsx` | ❌ Cross-domain | `shared/components/NotificationsPanel.tsx` |

### `src/components/tabs/` → `features/*/`

| Tab | Nueva ubicación |
|-----|-----------------|
| `PerfilTab.tsx` | `features/perfil/components/PerfilTab.tsx` |
| `AcademiaTab.tsx` | `features/academia/components/AcademiaTab.tsx` |
| `MaxSkillTab.tsx` | `features/academia/components/MaxSkillTab.tsx` |
| `EmpleosTab.tsx` | `features/empleos/components/EmpleosTab.tsx` |
| `ChatTab.tsx` | `features/chat/components/ChatTab.tsx` |
| `MarketTab.tsx` | `features/market/components/MarketTab.tsx` |
| `VaultTab.tsx` | `features/market/components/VaultTab.tsx` |
| `WalletTab.tsx` | `features/wallet/components/WalletTab.tsx` |
| `GobernanzaTab.tsx` | `features/gobernanza/components/GobernanzaTab.tsx` |
| `RedSocialTab.tsx` | `features/perfil/components/RedSocialTab.tsx` |

---

## 🔧 Cambios Técnicos

### 1. Path Aliases (`@/`)

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

```ts
// vite.config.ts
import path from 'path';
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  }
});
```

**Antes**: `import { supabase } from '../../../lib/supabase'`  
**Después**: `import { supabase } from '@/infrastructure/supabase/client'`

### 2. Barrel Exports por Feature

Cada `features/*/index.ts`:
```ts
// features/empleos/index.ts
export { EmpleosTab } from './components/EmpleosTab';
export { IncomingJobs } from './components/IncomingJobs';
export type { JobPosting, JobMatch } from './types';
```

### 3. Split de `theme.ts`

El monolito `theme.ts` (230+ líneas) se divide en módulos semánticos:
- `theme/tokens.ts` — colores (C), estados
- `theme/typography.ts` — FONT, FONT_STYLE
- `theme/animations.ts` — KEYFRAMES, ANIM, EASE, TIMING, SPRING
- `theme/shadows.ts` — SHADOW, GLOW
- `theme/layout.ts` — SP, SPACING, Z, BLUR, RADIUS, BORDER, BASE
- `theme/index.ts` — re-exporta todo (0 breaking changes)

### 4. Split de `types/index.ts`

El archivo de 322 líneas se divide en:
- `types/common.ts` — AuthStatus, TabId, AppState
- `types/profile.ts` — Profile, GemeloDigital, ReputationHistoryEntry, NodeLevel/Status/Type
- `types/skills.ts` — SkillTreeNode, UserSkillProgress, SkillTest, SkillTestAttempt, ExamGenerated, etc.
- `types/jobs.ts` — JobPosting, JobMatch, EscrowContract
- `types/chat.ts` — ChatRoom, ChatMessage
- `types/notifications.ts` — Notification, NotificationType
- `types/governance.ts` — Dispute
- `types/index.ts` — barrel re-export (mantiene compat)

---

## 📋 Orden de Ejecución

| Fase | Tarea | Riesgo |
|------|-------|--------|
| 1 | Añadir path aliases (`@/`) | 🟢 Nulo — solo config |
| 2 | Split `types/index.ts` en domain files | 🟢 Bajo — barrel mantiene compat |
| 3 | Crear estructura `features/` vacía | 🟢 Nulo |
| 4 | Mover `lib/` → `infrastructure/` + `features/*/services/` | 🟡 Medio — muchos imports |
| 5 | Mover `components/shared/` domain-specific → `features/` | 🟡 Medio |
| 6 | Mover `components/tabs/` → `features/*/components/` | 🟡 Medio |
| 7 | Split `theme.ts` → `theme/` | 🟢 Bajo — barrel mantiene compat |
| 8 | Crear `app/` shell | 🟢 Bajo |
| 9 | Verificar build + typecheck | ✅ Gate |
| 10 | Limpiar imports no usados | 🟢 Bajo |

---

## ✅ Reglas del Refactor

1. **Zero breaking changes**: barrel exports mantienen compatibilidad
2. **Un commit por fase**: rollback fácil
3. **Build verde después de cada fase**: `vite build && tsc --noEmit`
4. **No cambiar lógica**: solo mover archivos y actualizar imports
5. **Tests pasan**: `vitest --run` verde en cada paso

---

## 🚀 Beneficios Esperados

- **Navegabilidad**: un dev nuevo encuentra cualquier archivo en <5s
- **Ownership claro**: cada feature tiene boundaries explícitos
- **Menos re-renders**: features importan solo lo que necesitan
- **Code splitting futuro**: cada feature puede ser un lazy chunk
- **Testing aislado**: cada service se testea sin mockear el mundo
- **Escalabilidad**: agregar un nuevo dominio = crear `features/nuevo/`
