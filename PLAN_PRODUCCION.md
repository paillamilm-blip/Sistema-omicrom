# 🚀 Plan de Producción — Sistema Ómicron

> Documento vivo. Se actualiza cada vez que se completa una fase o cambia una
> decisión de negocio. Última actualización: **27 de julio de 2026**.

---

## 🎯 Posicionamiento del producto (fuente de verdad)

Ómicron es una **herramienta de aprendizaje continuo en tiempo real, para todo
el mundo**, sin restricción geográfica, que conecta esa capacidad demostrada
con **oportunidades reales del mercado** de forma instantánea (Industria 5.0).

- ❌ No es un proyecto pensado para CORFO ni inversionistas locales.
- ❌ No tiene modelo free/premium. **Todas las funciones son gratis para siempre**,
  incluidas todas las funciones de IA.
- ✅ Idioma actual: español. Alcance: global.
- ✅ Diferenciador central: **reputación imposible de falsificar** (evidencia
  real, validada entre pares — no CV auto-declarado, no reseñas compradas).

Ver `.kiro/steering/vision-producto.md` para el detalle completo de esta decisión.

---

## 📊 Estado real de la base de código (verificado, no estimado)

| Componente | Cantidad | Estado |
|------------|----------|--------|
| Migraciones SQL | 60 (+ audit consolidado) | ✅ Implementado |
| Edge Functions | 21 (coach, tutor, examen-ia, arbiter-ai, vault-oracle, market-match, carta-ia, chat-assist, stripe-webhook...) | ✅ Implementado, con rate limiting propio por IP en cada función |
| Hubs de navegación | 6 (Inicio, Academia, Empleos, Mercado, Mensajes, Gobernanza) | ✅ Todos activos |
| Funciones de IA gratuitas | 7 (ver tabla abajo) | ✅ Todas sin candado |
| Tests | 5 archivos (`reputationService`, `cvAnalyzer`, `jobMatcher`, `omicronCoach`, `oraculo`) | 🟡 Mejorando — faltan tests de componentes |
| Skills Kiro instaladas | 13 (creator, superpowers, gsd, review-ultra, context-mode, claude-mem, + suite UI/UX Pro Max) | ✅ Listas |

---

## ✅ FASE 0 — Cimientos

| # | Tarea | Estado |
|---|-------|--------|
| 0.1 | CI en verde (fix de lint `.cjs` + actions v5) | ✅ **Hecho** — PR #90 mergeado |
| 0.2 | Tests unitarios de libs puras (`oraculo`, `cvAnalyzer`, `jobMatcher`, `omicronCoach`) | ✅ **Hecho** — PR #94 (82 tests nuevos) |
| 0.3 | Splitear `AppContext.tsx` (auth/profile/navigation) | ⬜ Pendiente |
| 0.4 | Unificar design system (`theme.ts` vs `design-system/tokens.ts`) | ⬜ Pendiente |

---

## ✅ FASE 1 — Activar lo construido + reposicionar mensaje

| # | Tarea | Estado |
|---|-------|--------|
| 1.1 | Activar hubs ocultos (Mercado, Mensajes, Gobernanza, Billetera, Habilidades) | ✅ **Hecho** — PR #91 |
| 1.2 | Activar Stripe en producción | ⬜ Pendiente (ver `GUIA_ACTIVACION_PRODUCCION.md`) |
| 1.3 | Reposicionar mensaje in-app ("reputación imposible de falsificar") | ✅ **Hecho** — PR #91 |
| 1.4 | Activar Tribunal de Pares end-to-end (`arbiter-ai`) | ⬜ Pendiente de verificación en producción |
| 1.5 | **[Nuevo]** Eliminar todo candado Premium — IA gratis para siempre | ✅ **Hecho** — PR #92 |

### Detalle 1.5 — Funciones de IA liberadas (decisión de negocio: todo gratis)

| # | Función | Archivo | Qué hace |
|---|---------|---------|----------|
| 1 | Examinador IA + Examen de Rango IA | `MaxSkillTab.tsx` | Evalúa respuestas en el árbol de habilidades; sube el eje Fundamento |
| 2 | Carta de Competencias IA | `perfil/CartaCompetencias.tsx` | Resumen profesional desde el Gemelo + Actas de Evidencia |
| 3 | Redactor IA de Acuerdos | `ChatTab.tsx` | Mejora borradores de mensajes/contratos en el chat |
| 4 | Relator IA del Tribunal | `GobernanzaTab.tsx` | Análisis neutral de disputas para árbitros |
| 5 | Asesor IA de Contratación | `MarketTab.tsx` | Recomienda talento a empresas según evidencia |
| 6 | Oráculo de la Bóveda | `VaultTab.tsx` | Sugiere qué documento consultar y por qué |
| 7 | Coach IA + Tutor IA | `AcademiaTab.tsx` | Restaurados completos (estaban 100% deshabilitados) |

**Protección contra abuso:** no dependía del candado Premium — las 21 Edge
Functions ya tienen rate limiting propio por IP, independiente de esto.

---

## ⬜ FASE 2 — Las innovaciones brutales del mercado 2026

| # | Tarea | Innovación de mercado | Estado |
|---|-------|------------------------|--------|
| 2.1 | Cerrar el loop de auto-postulación (Ómicron postula por ti cuando el match supera un umbral) | Agentic AI | ⬜ Pendiente |
| 2.2 | Emitir el Pasaporte Gemelo como W3C Verifiable Credential (JSON-LD estándar) | Verifiable Credentials / Open Badges 3.0 | ⬜ Pendiente |
| 2.3 | Matching en tiempo real server-side (trigger al publicarse una oferta) | Real-time labor market | ⬜ Pendiente |
| 2.4 | Evaluación de código en vivo como parte del examen de nivel (no solo multiple choice) | AI-verified skills en tiempo real | ⬜ Pendiente |
| 2.5 | Preparar el hash on-chain (`offchainStateHash`) sin desplegar el contrato aún | On-chain reputation / SBT (preparación) | ⬜ Pendiente |

---

## ⬜ FASE 3 — Escala y pulido

| # | Tarea | Estado |
|---|-------|--------|
| 3.1 | Lazy-load de engines pesados (`proactiveEngine`, `gemeloMemory`) | ⬜ Pendiente |
| 3.2 | Accesibilidad completa (landmarks, contraste, keyboard nav) | ⬜ Pendiente |
| 3.3 | Auditoría de seguridad formal antes de escalar tráfico | ⬜ Pendiente |
| 3.4 | Desplegar `GemeloDigitalSBT` on-chain (con tracción suficiente) | ⬜ Pendiente |
| 3.5 | Multi-idioma (cuando se decida expandir más allá de español) | ⬜ Pendiente |
| 3.6 | Revisión legal de `TERMINOS_SERVICIO.md` / `POLITICA_PRIVACIDAD.md` (hoy 100% jurisdicción chilena, a ajustar al final del proceso a propósito) | ⬜ Pendiente, explícitamente al final |

---

## 📋 Historial de Pull Requests de este plan

| PR | Título | Fase | Estado |
|----|--------|------|--------|
| [#90](https://github.com/paillamilm-blip/Sistema-omicrom/pull/90) | fix(ci): resolver fallos de CI en main | 0.1 | ✅ Mergeado |
| [#91](https://github.com/paillamilm-blip/Sistema-omicrom/pull/91) | feat: activar hubs ocultos + reposicionar mensaje | 1.1 + 1.3 | ✅ Mergeado |
| [#92](https://github.com/paillamilm-blip/Sistema-omicrom/pull/92) | feat: eliminar candados Premium (IA gratis para siempre) | 1.5 | ✅ Mergeado |
| [#93](https://github.com/paillamilm-blip/Sistema-omicrom/pull/93) | docs: crear PLAN_PRODUCCION.md | — (documentación) | ✅ Mergeado |
| [#94](https://github.com/paillamilm-blip/Sistema-omicrom/pull/94) | test: agregar tests unitarios de libs puras | 0.2 | 🟡 Abierto |

---

## ▶️ En curso ahora

Con 0.2 recién entregado (pendiente de merge en PR #94), el siguiente paso
del bloque de cimientos es:

**Fase 0.3 — Splitear `AppContext.tsx`** (auth/profile/navigation en
providers separados, con `useApp()` como facade de compatibilidad para no
romper los 39 archivos que ya lo consumen).

## ❓ Después de esto

**Fase 0.4 — Unificar design system** (`theme.ts` vs `design-system/tokens.ts`)
cierra el bloque de cimientos antes de empezar la Fase 2.
