# 🚀 Plan de Producción — Sistema Ómicron

> Documento vivo. Se actualiza cada vez que se completa una fase o cambia una
> decisión de negocio. Última actualización: **30 de julio de 2026** (consolidación
> de documentación + roadmap, post PR #106).

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
| Migraciones SQL | 63 (+ audit consolidado) | ✅ Implementado |
| Edge Functions | 21 (coach, tutor, examen-ia, arbiter-ai, vault-oracle, market-match, carta-ia, chat-assist, stripe-webhook...) | ✅ Implementado, con rate limiting propio por IP en cada función |
| Hubs de navegación | 6 (Inicio, Academia, Empleos, Mercado, Mensajes, Gobernanza) | ✅ Todos activos |
| Funciones de IA gratuitas | 7 (ver tabla abajo) | ✅ Todas sin candado — **confirmado en `main` real** (PR #96) |
| Sistema de orbe / núcleo visual | 1 único (`ParticleOrb`) | ✅ Unificado (PR #97) — antes había 5 sistemas distintos sin consolidar |
| Nodos de navegación (Home) | Arrastrables/reposicionables, con persistencia | ✅ Hecho (PR #97 + fix PR #98) |
| Tests | 5 archivos (`reputationService`, `cvAnalyzer`, `jobMatcher`, `omicronCoach`, `oraculo`) | 🟡 Mejorando — faltan tests de componentes |
| Skills Kiro instaladas | 13 (creator, superpowers, gsd, review-ultra, context-mode, claude-mem, + suite UI/UX Pro Max) | ✅ Listas |
| Limpieza de producción | PR #106 (final-clean) | ✅ Mergeado |

---

## ✅ FASE 0 — Cimientos

| # | Tarea | Estado |
|---|-------|--------|
| 0.1 | CI en verde (fix de lint `.cjs` + actions v5) | ✅ **Hecho** — PR #90 mergeado |
| 0.2 | Tests unitarios de libs puras (`oraculo`, `cvAnalyzer`, `jobMatcher`, `omicronCoach`) | ✅ **Hecho** — PR #94 (82 tests nuevos) |
| 0.3 | Splitear `AppContext.tsx` en `ProfileContext` + `NavigationContext` (facade de compatibilidad) | ✅ **Hecho** — PR #95 (mergeado) |
| 0.4 | Unificar design system (`theme.ts` vs `design-system/tokens.ts`) | ✅ **Hecho** — PR #109 (eliminado design-system/, tailwind alineado con theme.ts) |

---

## ✅ FASE 1 — Activar lo construido + reposicionar mensaje

| # | Tarea | Estado |
|---|-------|--------|
| 1.1 | Activar hubs ocultos (Mercado, Mensajes, Gobernanza, Billetera, Habilidades) | ✅ **Hecho** — PR #91 |
| 1.2 | Activar Stripe en producción | ⬜ Pendiente (ver `GUIA_ACTIVACION_PRODUCCION.md`) |
| 1.3 | Reposicionar mensaje in-app ("reputación imposible de falsificar") | ✅ **Hecho** — PR #91 |
| 1.4 | Activar Tribunal de Pares end-to-end (`arbiter-ai`) | ⬜ Pendiente de verificación en producción |
| 1.5 | **[Nuevo]** Eliminar todo candado Premium — IA gratis para siempre | ✅ **Hecho de verdad** — PR #96 (ver nota abajo) |

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

> ⚠️ **Nota de la corrección (PR #96):** PR #92 se había marcado "mergeado"
> en GitHub, pero por un mixup de ramas (la rama base ya estaba fusionada a
> `main` antes de agregarle los commits de PR #92) esos commits **nunca
> llegaron realmente a `main`**. Esto explicaba las capturas del usuario
> mostrando 🔒 PREMIUM todavía en Mercado/Bóveda/Gobernanza. PR #96 re-aplicó
> los mismos commits (cherry-pick limpio, sin conflictos) directamente sobre
> el `main` real. Verificado con grep: 0 referencias a `Premium` en `src/`
> tras el fix.

---

## 🚨 FASE DE EMERGENCIA — Front-end (disparada por el usuario, julio 2026)

Tras activar los hubs y liberar las funciones de IA, el usuario reportó con
capturas de pantalla un front-end "un desastre, un caos, no se puede
interactuar desde el celular como app". Se abrió esta fase fuera de la
secuencia original del plan para atender eso antes de seguir con Fase 2.

| # | Tarea | Estado |
|---|-------|--------|
| E.1 | Diagnóstico: por qué el front se ve inconsistente entre pantallas | ✅ **Hecho** — se encontraron 5 sistemas de "orbe" distintos en el código (solo 2 realmente conectados a la navegación; 3 eran restos de un rediseño "Holo-Gemelo" nunca conectado a `App.tsx`) |
| E.2 | Unificar en un único sistema de orbe (`ParticleOrb`) en toda la app + borrar los 4 sistemas muertos | ✅ **Hecho** — PR #97 |
| E.3 | Nodos de navegación arrastrables/reposicionables alrededor del núcleo ("todo es sinergia", pedido explícito del usuario) con persistencia | ✅ **Hecho** — PR #97 |
| E.4 | Fix: arrastrar un nodo también disparaba la navegación (abría la pestaña sola) | ✅ **Hecho** — PR #98 |
| E.5 | Fix: pantallas "planas" en Gobernanza/Mensajes — se detectaron 2 sistemas de tarjeta (`OmicronCard` premium vs `CyberCard` plano); se mejoró `CyberCard` para heredar el mismo tratamiento visual (blur, gradiente, glow) sin tocar la lógica de cada pantalla | ✅ **Hecho** — PR #98 |
| E.6 | Confirmar en un celular real si el problema de interacción táctil quedó resuelto | ⬜ **Pendiente — bloqueado en confirmación del usuario** (el sandbox de este agente no tiene acceso a internet para probar la app en vivo) |
| E.7 | Revisión de experiencia de usuario más amplia (el usuario reporta que "tiene muchos problemas de vivencia de usuario" más allá de lo ya corregido) | ⬜ **Pendiente — en definición** |
| E.8 | Limpieza técnica menor: `gsap` quedó como dependencia huérfana en `package.json` tras borrar `Orb.tsx` (no se removió en PR #97 para no romper `package-lock.json` sin acceso a `npm install` en el sandbox) | ✅ **Hecho** — PR #110 |

---

## ⬜ FASE 2 — Las innovaciones brutales del mercado 2026

> **Timeline estimado:** Q3–Q4 2026 (agosto–diciembre), una vez estabilizado el front-end.
> Prerequisito: Fase de Emergencia cerrada + Stripe activo en producción.

| # | Tarea | Innovación de mercado | Prioridad | Estado |
|---|-------|------------------------|-----------|--------|
| 2.1 | Cerrar el loop de auto-postulación (Ómicron postula por ti cuando el match supera un umbral) | Agentic AI | 🔴 Alta | ⬜ Pendiente |
| 2.2 | Emitir el Pasaporte Gemelo como W3C Verifiable Credential (JSON-LD estándar) | Verifiable Credentials / Open Badges 3.0 | 🟡 Media | ⬜ Pendiente |
| 2.3 | Matching en tiempo real server-side (trigger al publicarse una oferta) | Real-time labor market | 🔴 Alta | ⬜ Pendiente |
| 2.4 | Evaluación de código en vivo como parte del examen de nivel (no solo multiple choice) | AI-verified skills en tiempo real | 🟡 Media | ⬜ Pendiente |
| 2.5 | Preparar el hash on-chain (`offchainStateHash`) sin desplegar el contrato aún | On-chain reputation / SBT (preparación) | 🟢 Baja | ⬜ Pendiente |

---

## ⬜ FASE 3 — Escala y pulido

> **Timeline estimado:** Q1–Q2 2027 (enero–junio). Se inicia solo cuando Fase 2 tenga
> tracción real (usuarios activos, contratos ejecutados, feedback de mercado).

| # | Tarea | Prioridad | Estado |
|---|-------|-----------|--------|
| 3.1 | Lazy-load de engines pesados (`proactiveEngine`, `gemeloMemory`) | 🟡 Media | ⬜ Pendiente |
| 3.2 | Accesibilidad completa (landmarks, contraste, keyboard nav) | 🔴 Alta | ⬜ Pendiente |
| 3.3 | Auditoría de seguridad formal antes de escalar tráfico | 🔴 Alta | ⬜ Pendiente |
| 3.4 | Desplegar `GemeloDigitalSBT` on-chain (con tracción suficiente) | 🟡 Media | ⬜ Pendiente |
| 3.5 | Multi-idioma (cuando se decida expandir más allá de español) | 🟢 Baja | ⬜ Pendiente |
| 3.6 | Revisión legal de `TERMINOS_SERVICIO.md` / `POLITICA_PRIVACIDAD.md` (hoy 100% jurisdicción chilena, a ajustar al final del proceso a propósito) | 🟡 Media | ⬜ Pendiente, explícitamente al final |

---

## 📋 Historial de Pull Requests de este plan

| PR | Título | Fase | Estado |
|----|--------|------|--------|
| [#90](https://github.com/paillamilm-blip/Sistema-omicrom/pull/90) | fix(ci): resolver fallos de CI en main | 0.1 | ✅ Mergeado |
| [#91](https://github.com/paillamilm-blip/Sistema-omicrom/pull/91) | feat: activar hubs ocultos + reposicionar mensaje | 1.1 + 1.3 | ✅ Mergeado |
| [#92](https://github.com/paillamilm-blip/Sistema-omicrom/pull/92) | feat: eliminar candados Premium (IA gratis para siempre) | 1.5 | ✅ Mergeado |
| [#93](https://github.com/paillamilm-blip/Sistema-omicrom/pull/93) | docs: crear PLAN_PRODUCCION.md | — (documentación) | ✅ Mergeado |
| [#94](https://github.com/paillamilm-blip/Sistema-omicrom/pull/94) | test: agregar tests unitarios de libs puras | 0.2 | ✅ Mergeado |
| [#95](https://github.com/paillamilm-blip/Sistema-omicrom/pull/95) | refactor: splitear AppContext en Profile + Navigation | 0.3 | ✅ Mergeado |
| [#96](https://github.com/paillamilm-blip/Sistema-omicrom/pull/96) | fix: re-aplicar remoción de candados Premium (PR #92 nunca llegó a main) | 1.5 | ✅ Mergeado |
| [#97](https://github.com/paillamilm-blip/Sistema-omicrom/pull/97) | feat: unificar orbe + nodos libres arrastrables (sinergia) | Emergencia E.1-E.3 | ✅ Mergeado |
| [#98](https://github.com/paillamilm-blip/Sistema-omicrom/pull/98) | fix: nodo abre pestaña sola al arrastrarlo + pantallas planas | Emergencia E.4-E.5 | ✅ Mergeado |
| [#106](https://github.com/paillamilm-blip/Sistema-omicrom/pull/106) | prod: limpieza final de producción | Producción | ✅ Mergeado |
| [#108](https://github.com/paillamilm-blip/Sistema-omicrom/pull/108) | feat: activar 16 skills + combos TITAN/RAYO/FORJA/GUARDIAN/OMEGA/NEXUS | Skills/Steering | ✅ Mergeado |
| [#109](https://github.com/paillamilm-blip/Sistema-omicrom/pull/109) | feat: unificar design system + ADN digital helicoidal | 0.4 + Visual | ✅ Mergeado |
| [#110](https://github.com/paillamilm-blip/Sistema-omicrom/pull/110) | feat: sesión intensiva — visual + conexión total | E.8 + Realtime + BottomNav | 🟡 Pendiente merge |

### Detalle 0.3 — Decisión de diseño y pendientes abiertos (Ultra Review)

**Decisión:** el plan original proponía 3 contextos independientes
(auth/profile/navigation). Se implementaron **2**: `ProfileContext.tsx`
(auth + profile + gemelo, genuinamente acoplados — `authStatus` depende de
si el perfil existe en la BD) y `NavigationContext.tsx` (activeTab +
unreadCount). `AppContext.tsx` quedó como facade puro; `useApp()` no cambió
de forma para ninguno de los ~39 consumidores existentes.

**Pendientes explícitos que dejó el Ultra Review de PR #95** (no bloquean
el merge, pero hay que volver a ellos):
- La ganancia de performance **no aplica todavía a código existente** —
  `useApp()` sigue suscribiéndose a ambos contextos nuevos, así que los 39
  consumidores actuales re-renderizan igual que antes de este PR. El
  beneficio real solo aparece cuando un componente migra a usar
  `useProfile()`/`useNavigation()` directamente en vez de `useApp()`.
  Ningún componente lo hace aún — queda como tarea de seguimiento.
- No se pudo confirmar con un profiler si `NavigationProviderBridge` (que
  lee `useProfile()` para pasarle `profileId` a `NavigationProvider`)
  realmente aísla los re-renders del árbol de navegación, o si React
  igual re-renderiza sus hijos por inestabilidad referencial de `children`.
- Cero tests para `AppContext`/`ProfileContext`/`NavigationContext` — es
  el archivo de mayor blast-radius de la app; sigue siendo un gap abierto.

---

## ▶️ En curso ahora

Con PR #106 mergeado (limpieza final de producción), el código está estable.
La Fase de Emergencia de front-end está **parcialmente resuelta**: se corrigió la
inconsistencia visual (orbe unificado, tarjetas planas) y bugs de interacción
concretos (candados Premium fantasma, nodo que navegaba solo al arrastrarse).

**Pendientes inmediatos (bloqueantes para avanzar a Fase 2):**

| # | Pendiente | Bloqueado por |
|---|-----------|---------------|
| 1 | Confirmar UX en celular real (E.6) | Feedback del usuario |
| 2 | Relevar problemas de UX restantes (E.7) | Capturas/casos del usuario |
| 3 | ~~Unificar design system — `theme.ts` vs `design-system/tokens.ts` (0.4)~~ | ✅ **Hecho** — PR #109 |
| 4 | Activar Stripe en producción (1.2) | Configuración de claves |
| 5 | Verificar Tribunal de Pares end-to-end (1.4) | Test manual en producción |
| 6 | ~~Remover dependencia huérfana `gsap` (E.8)~~ | ✅ **Hecho** — PR #110 |

## ❓ Después de esto

1. **Cerrar Fase de Emergencia:** E.6 + E.7 (requiere input del usuario con capturas reales).
2. ~~**Cerrar Fase 0.4:** unificar design system~~ → ✅ **Hecho** (PR #109).
3. **Cerrar Fase 1:** Stripe activo + Tribunal verificado.
4. **Fase 2 — innovaciones de mercado** (ver tabla arriba) — recién después de
   que Stripe esté activo y se confirme la UX en celular real.

### Logros de la sesión intensiva (5 agosto 2026, PR #110):
- ✅ ADN digital helicoidal como núcleo visual (reemplaza esfera)
- ✅ Nodos orbitan vertical alrededor del ADN con interacción suave (touch + mouse)
- ✅ BottomNav montado con los 6 hubs (transiciones fluidas, touch-friendly)
- ✅ "Ver Bóveda" conectado en PerfilTab
- ✅ Demo fallback eliminado de MarketTab (solo datos reales)
- ✅ Realtime en EmpleosTab y MarketTab (postgres_changes)
- ✅ gsap eliminado de dependencias (E.8 cerrada)
- ✅ 16 skills + 6 combos nombrados activos via steering

> 📌 Para el roadmap completo con timeline, dependencias y milestones, ver
> [`ROADMAP.md`](./ROADMAP.md).
