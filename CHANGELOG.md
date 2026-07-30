# Changelog — Sistema Omicrom

Todos los cambios notables del proyecto se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).
Este proyecto aún no sigue versionado semántico formal — se organiza por PRs y fases.

---

## [2026-07-30] — Consolidación de documentación

### Agregado
- `ROADMAP.md` — Roadmap completo con 6 milestones, timeline mensual, dependencias y KPIs.
- `CHANGELOG.md` — Este archivo.

### Actualizado
- `PLAN_PRODUCCION.md` — Agregado PR #106, timeline para Fase 2/3, prioridades, tabla de pendientes.
- `PANEL_DE_CONTROL.md` — Checklist actualizado con PRs reales (#90–#106) en vez de los obsoletos (#80–#82).
- `GUIA_ACTIVACION_PRODUCCION.md` — Paso 1 simplificado (ya no pide mergear PRs antiguos).
- `DEFINICION_OMICROM_v8_BACKEND.md` — Anotaciones de estado de implementación en cada sección.
- `README.md` — Referencias a ROADMAP.md y CHANGELOG.md.

---

## [2026-07-27] — Fase de Emergencia: UX front-end (PRs #97, #98)

### Corregido
- **Orbe unificado** (PR #97): 5 sistemas de orbe distintos → 1 único `ParticleOrb` (canvas 2.5D).
  Eliminados los 4 sistemas muertos que causaban inconsistencia visual.
- **Nodos arrastrables** (PR #97): Nodos de navegación ahora son libres, arrastrables y
  reposicionables alrededor del núcleo, con persistencia de posición.
- **Bug: arrastrar = navegar** (PR #98): Arrastrar un nodo ya no dispara la navegación
  (se distingue drag vs tap).
- **Pantallas planas** (PR #98): `CyberCard` mejorado con blur, gradiente y glow
  para igualar el tratamiento visual de `OmicronCard` sin tocar la lógica de cada pantalla.

---

## [2026-07-26] — Remoción real de candados Premium (PR #96)

### Corregido
- **Candados Premium fantasma**: PR #92 se había marcado como mergeado en GitHub pero
  sus commits nunca llegaron a `main` (por mixup de ramas). PR #96 re-aplicó la remoción
  de todos los candados via cherry-pick limpio. Verificado con grep: 0 referencias a
  `Premium` en `src/` después del fix.

---

## [2026-07-25] — Refactorización de contexto (PR #95)

### Cambiado
- **AppContext split**: `AppContext.tsx` separado en `ProfileContext.tsx` (auth + profile +
  gemelo) y `NavigationContext.tsx` (activeTab + unreadCount). `AppContext.tsx` queda como
  facade puro de compatibilidad — `useApp()` sigue funcionando igual para los 39 consumidores.

### Nota
- La ganancia de performance no aplica todavía (todos los consumidores usan `useApp()`).
  El beneficio aparece cuando migren a `useProfile()`/`useNavigation()` directamente.

---

## [2026-07-24] — Tests unitarios (PR #94)

### Agregado
- **82 tests nuevos** para libs puras:
  - `reputationService.test.ts` — Fórmula canónica, ejes, momentum, niveles.
  - `cvAnalyzer.test.ts` — Análisis y extracción de CV.
  - `jobMatcher.test.ts` — Matching de ofertas.
  - `omicronCoach.test.ts` — Lógica del coach IA.
  - `oraculo.test.ts` — Motor del Oráculo.

---

## [2026-07-23] — Activación de funcionalidades (PRs #91, #92)

### Agregado
- **Hubs ocultos activados** (PR #91): Mercado, Mensajes, Gobernanza, Billetera y
  Habilidades ahora son accesibles desde la navegación principal.
- **Reposicionamiento de mensaje** (PR #91): "reputación imposible de falsificar" como
  mensaje central in-app.

### Cambiado
- **IA gratis para siempre** (PR #92): Eliminados todos los candados Premium de las 7
  funciones de IA. Decisión de negocio: todo gratis, sin modelo free/premium.

---

## [2026-07-22] — CI en verde (PR #90)

### Corregido
- **CI arreglado**: Fix de lint para archivos `.cjs` + actualización de GitHub Actions a v5.
  Pipeline verde por primera vez tras los cambios de infraestructura.

---

## [2026-07-21] — Documentación inicial (PR #93)

### Agregado
- `PLAN_PRODUCCION.md` — Primer documento vivo con el plan de producción por fases.

---

## [2026-07-27] — Limpieza de producción (PR #106)

### Cambiado
- Limpieza final de código para producción (`prod/final-clean`).

---

## Pre-julio 2026 — Fundamentos (sin PR tracking formal)

### Implementado (acumulado)
- 63 migraciones SQL cubriendo: perfiles, reputación (4 ejes), skill tree, market,
  wallet, empleos, chat, bóveda (pgvector), gobernanza, penalties, credentials,
  stripe, security hardening, performance indexes.
- 21 Edge Functions: coach, tutor, examen-ia, arbiter-ai, vault-oracle, market-match,
  carta-ia, chat-assist, stripe-webhook, crear-checkout, verificar-pago, ghost-approval,
  embed, run-code, simulador-universal, analizar-cv, credential, blackbox-open,
  chat-history, chat-send.
- Frontend completo: React 18 + TypeScript + Vite 5 + Tailwind CSS.
- PWA instalable con deploy automático en Vercel.
- Sistema de reputación canónico (`DEFINICION_REPUTACION_OMICROM.md`).
- Red en tiempo real con Supabase Realtime.
- Documentos de visión: `DEFINICION_OMICROM.md`, `VISION_OMICROM.md`.
- Documentos legales placeholder: `TERMINOS_SERVICIO.md`, `POLITICA_PRIVACIDAD.md`.
