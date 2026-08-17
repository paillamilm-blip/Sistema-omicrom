# 📋 CHANGELOG — Sesión de Refactorización + UX Premium

> **Fecha**: 17 agosto 2026  
> **Scope**: Arquitectura completa + Design System + Innovaciones UX  
> **Commits**: 12  
> **Archivos tocados**: ~260+

---

## 🏗️ Arquitectura Modular (PR #254)

La app pasó de una estructura plana a **10 feature modules** independientes.

### Antes → Después
```
ANTES:                          DESPUÉS:
src/lib/ (35 archivos flat)     src/features/ (10 dominios)
src/components/shared/ (31)     src/infrastructure/ (supabase, ai, voice, pwa, query)
src/components/tabs/ (10)       src/shared/ (solo UI genérico)
src/types/index.ts (322 líneas) src/theme/ (6 archivos modulares)
src/theme.ts (230 líneas)       src/types/ (9 archivos por dominio)
```

### Features modules:
- `academia/` — cursos, retos, simulador
- `auth/` — login, reset password
- `chat/` — mensajería segura
- `empleos/` — job matching, postulaciones
- `gemelo/` — perfil digital IA
- `gobernanza/` — disputas, arbitraje
- `market/` — servicios marketplace
- `omicron/` — orbe IA, oráculo, coach
- `perfil/` — profile, CV, credentials
- `wallet/` — tokens, transacciones

### Infrastructure:
- `supabase/` — cliente, realtime
- `ai/` — OpenRouter, Gemini, streaming
- `voice/` — TTS, speech recognition
- `pwa/` — push, install, update
- `query/` — TanStack Query client + keys
- `router/` — route config (preparado para React Router futuro)

---

## 🎨 Design System "Holo-Gemelo Premium"

### Tokens (`src/theme/`)
| Archivo | Contenido |
|---------|-----------|
| `tokens.ts` | Paleta de colores (C.cyan, C.gold, C.purple...) |
| `typography.ts` | Escala SIZE (9→32px), FONT, FONT_STYLE presets |
| `layout.ts` | SP grid (4px), RADIUS (8→999), Z-index, BORDER, BASE |
| `animations.ts` | EASE, TIMING, SPRING, KEYFRAMES, ANIM |
| `shadows.ts` | SHADOW (layered), GLOW (accent) |

### Reglas del sistema:
1. Font sizes SOLO de SIZE scale: `9/11/13/15/17/20/24/32`
2. Spacing SOLO múltiplos de 4px
3. Border-radius SOLO de RADIUS: `8/12/16/22/999`
4. Colores SIEMPRE de tokens C.xxx
5. Touch targets mínimo 44px
6. Animaciones via CSS variables (`var(--ease-default)`, etc.)

---

## ✨ Innovaciones UX

| # | Feature | Archivo |
|---|---------|---------|
| 1 | **Haptic Feedback** | `shared/utils/haptics.ts` |
| 2 | **Morphing Input Bar** | OrbShell (spring on focus) |
| 3 | **HoloSkeleton** | `shared/components/HoloSkeleton.tsx` |
| 4 | **Dynamic Island** | `shared/components/DynamicIsland.tsx` |
| 5 | **AI Micro-copy** | `shared/utils/microcopy.ts` |
| 6 | **Page Transitions** | OrbShell `@keyframes pageEnter` |
| 7 | **Stagger Children** | `shared/utils/stagger.ts` + CSS |

---

## 🎬 Motion System (Emil Kowalski compliance)

### CSS Custom Properties (`:root`)
```css
--ease-default: cubic-bezier(0.32, 0.72, 0, 1);
--ease-enter:   cubic-bezier(0.25, 0.46, 0.45, 0.94);
--ease-exit:    cubic-bezier(0.55, 0.085, 0.68, 0.53);
--ease-spring:  cubic-bezier(0.34, 1.56, 0.64, 1);
--timing-fast:   150ms;
--timing-normal: 250ms;
--timing-enter:  300ms;
--timing-exit:   200ms;
```

### Principios:
- ✅ ease-out para entradas
- ✅ Exit más rápido que enter (200ms < 300ms)
- ✅ Spring para interacciones (overshoot)
- ✅ Nunca >1s para UI
- ✅ Active state en todos los botones (scale 0.97, 60ms)
- ✅ Stagger para listas (50ms step)

---

## 📊 Métricas de limpieza

| Métrica | Antes | Después |
|---------|-------|---------|
| CSS (index.css) | ~480 líneas | 339 líneas (-30%) |
| Clases CSS muertas | 13 | 0 |
| Fuentes cargadas | 4 familias, 11 weights | 2 familias, 5 weights |
| Hardcoded cubic-bezier | 16 | 0 |
| Tabs sin animación | 4 | 0 |
| Touch targets < 44px | 8 | 0 |
| Design system tokens no usados | 5/7 | 1/7 (SP still unused inline) |

---

## 🔮 Mejoras futuras recomendadas

1. **Migrar tabs de CyberComponents → OmicronChrome** (un solo UI kit)
2. **React Router** (URLs reales — requiere refactor cuidadoso del orbe)
3. **Shared Element Transitions** (ícono vuela al header)
4. **Adaptive Color** (cyan cambia según skill principal)
5. **Confetti/Particles** en logros
6. **Unificar onboarding + oráculo** en una sola barra (intentado, crasheó — needs more work)
