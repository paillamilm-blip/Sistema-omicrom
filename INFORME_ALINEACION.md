# INFORME ANALITICO DE ALINEACION: Codigo vs. Vision de Negocio

> **Rol:** CTO / Auditor de Producto
> **Fecha:** 18 de julio de 2026
> **Alcance:** Cruce funcional entre documentacion oficial (DEFINICION_OMICROM.md, DEFINICION_REPUTACION_OMICROM.md, DEFINICION_v8_BACKEND.md) y codigo fuente actual.

---

## DIAGNOSTICO GENERAL DE ALINEACION

### Porcentaje estimado: **62%** (coherencia parcial con brechas criticas)

| Dimension | Coherencia | Veredicto |
|-----------|-----------|-----------|
| Calculo de reputacion (formula 20/80 + momentum) | **85%** | La formula esta correctamente implementada en `reputationService.ts` y `gemeloProfile.ts`. El trigger SQL se referencia pero NO existe en el repositorio (directorio `supabase/migrations/` no esta incluido). |
| Los 4 ejes del Gemelo Digital | **45%** | Los ejes EXISTEN en el tipo `Profile` y se leen del servidor, pero los **triggers reales que los calculan a partir de eventos** (contratos, calificaciones, nodos, publicaciones) NO son ejecutables desde el codigo fuente. Los deltas se escriben desde el cliente (`updateReputationInDatabase`) aunque un comentario dice que el trigger los revierte. |
| Nucleo 3D conectado a datos reales | **90%** | `HoloNucleo3D.tsx` recibe `reputation`, `axes`, `chips`, `livePeers` como props data-driven. Los valores vienen de `useGemeloProfile` que mergea Supabase + local. La visualizacion refleja datos reales. |
| Red multiusuario (Realtime) | **80%** | Presence + Broadcast estan implementados correctamente via `useRealtimeNetwork.ts`. Contador de nodos online, lista de conectados, y broadcast de eventos funcionan. Falta: ranking en vivo por `postgres_changes` sobre `profiles` no se consume en ningun componente de ranking global. |
| Oraculo por voz | **75%** | SpeechRecognition + SpeechSynthesis nativos ($0). Coach IA solo por trigger explicito. El motor proactivo funciona localmente. La brecha: no hay Edge Function `coach` desplegada en el repo; `askCoach()` degrada con gracia pero nunca devuelve consejo real. |
| "El trabajo te busca" | **55%** | `EmpleosTab` consulta `job_postings` y `job_matches` reales de Supabase. Pero `HoloGemeloHome` usa un motor de matching **local** (`jobMatcher.ts`) con un banco de 11 trabajos **hardcodeados** (JOBS[]). El push "una empresa te busca" muestra datos del matcher local, no de `job_postings`. |
| Escrow / Contratos | **40%** | `ChatTab` y `GobernanzaTab` consultan la tabla `contracts`. Pero la logica de escrow (lock/release/refund) no existe en el frontend. No hay flujo de pago visible. Los contratos que se muestran son los existentes en BD sin workflow de creacion→negociacion→escrow→release. |
| Boveda de Conocimiento | **50%** | `VaultTab` consulta `knowledge_vault_documents` y permite publicar. Pero regalias encadenadas, deteccion de similitud (pgvector), y `content_lineage` no estan implementados en el codigo. |
| Arbol de Habilidades | **70%** | `MaxSkillTab` consulta `skill_tree_nodes` y `user_skill_progress` con Realtime. Sin embargo, la conexion eje-Fundamento (trigger 0015) no existe en el repo. Validar un nodo no dispara recalculo de reputacion. |
| Justicia / Tribunal de Pares | **30%** | `GobernanzaTab` muestra disputas y arbitrajes existentes. Pero el flujo real (asignacion de arbitros, votacion 72h, Ghost Approval, ejecucion de fallo) NO esta implementado. Es lectura pura de tablas. |

---

## FUNCIONALIDADES HUERFANAS (UI sin backend conectado)

Componentes que **prometen** funcionalidad pero **no tienen logica de backend operativa**:

| # | Componente / Zona | Que muestra al usuario | Realidad en backend |
|---|---|---|---|
| 1 | **"UNA EMPRESA TE BUSCA"** (HoloGemeloHome) | Push con titulo de trabajo + % afinidad | Usa `jobMatcher.ts` con 11 trabajos **hardcodeados**. No consulta `job_postings` real. Es una fachada de engagement. |
| 2 | **Convalidacion de CV → Ejes reales** (gemeloProfile.ts) | "Tu reputacion refleja tus N anos" | `gemeloActions.addCV()` suma PE y modifica ejes **localmente** con formula fija. El `updateReputationInDatabase` se llama pero el trigger `protect_profile_columns` lo **revierte** segun comentario. Efecto real: **nulo en el servidor**. |
| 3 | **OpportunitiesSheet** | Lista de oportunidades con % de match | Proviene 100% del banco local `JOBS[]`. Boton "Postular" no crea aplicacion en BD (solo suma PE local + cierra sheet). |
| 4 | **ProactivePushes** ("MEJORA CONTINUA", "RED EN VIVO") | Notificaciones con acciones | Textos generados localmente con `Math.random()`. No reflejan actividad real de la red (el counter es real, el mensaje es inventado). |
| 5 | **Coach IA** (OraculoBar → `askCoach()`) | "Consultando al Coach IA..." | Invoca Edge Function `coach` que **no existe** en el repo ni se referencia a un deployment. Siempre retorna error o fallback. |
| 6 | **Boveda: Regalias Encadenadas** | Prometido en DEFINICION | Ni `content_lineage` ni calculo de regalias implementados. VaultTab es CRUD basico. |
| 7 | **Tribunal de Pares / Gobernanza** | Panel de disputas y arbitrajes | Solo lectura. No hay flujo de creacion de disputa, asignacion de arbitros, votacion, ni ejecucion de fallo. |
| 8 | **Escrow workflow** (ChatTab rooms=contracts) | Lista contratos con estados | No hay transicion de estados (LOCKED→APPROVED→RELEASED). No hay Ghost Approval timer. Solo se lee lo que ya existe en BD. |
| 9 | **Depreciacion de Tokens (H-07)** | Prometido en DEFINICION | No hay cron, trigger ni logica que deprecie tokens inactivos. |
| 10 | **Examinador IA** (tipos definidos en types/index.ts) | Tipos `ExamGenerated`, `ActaEvidencia` | Edge Function `examiner` no existe. `AcademiaTab` solo consulta cursos/lecciones, no genera examenes IA. |

---

## DESVIACIONES DE NEGOCIO

Logicas programadas que **contradicen** el proposito de Omicron como marketplace de capital intelectual:

### 1. Sistema de reputacion dual contradictorio

**Vision:** "Una sola fuente de verdad (Supabase `profiles`)."
**Realidad:** Coexisten **dos fuentes**:
- `gemeloProfile.ts` (localStorage) — store local con formula `recompute()` que calcula PE/rep/ejes a partir de `{ cv, titles, years, vault }`.
- `AppContext.tsx` → `profiles` (Supabase) — con campos `reputation_score`, `execution_score`, etc.

El hook `useGemeloProfile.ts` los **mergea** priorizando Supabase. Pero las acciones del usuario (convalidar CV, titulo) solo modifican el store local. El `pushToSupabase()` escribe a `gemelo_profiles` (tabla secundaria), no a `profiles`. Y el trigger `protect_profile_columns` revierte los cambios a los scores en `profiles`.

**Consecuencia:** El usuario ve cambios inmediatos (local), pero su reputacion **real en el ranking y matching** no cambia porque el servidor la protege. Es una **ilusion de progreso**.

### 2. Matching de empleos desconectado de la BD

**Vision:** "El trabajo te busca a ti" — matching en vivo basado en `job_matches` + `job_postings` + Realtime.
**Realidad:** El componente principal (`HoloGemeloHome`) usa `getTopJobs()` de `jobMatcher.ts` con 11 trabajos estaticos. El `EmpleosTab` si consulta `job_postings` reales, pero el push proactivo "UNA EMPRESA TE BUSCA" que es la experiencia core **miente**: muestra datos fake como si fueran oportunidades reales.

**Impacto en confianza:** Si un estudiante se emociona con "96% de afinidad · 120-200 Omega/hora" y descubre que no es real, la credibilidad del sistema se destruye.

### 3. PE como mecanismo de engagement sin impacto real

**Vision:** "Los PE suman a la reputacion como momentum (+15 max)."
**Realidad en el store local:** `pe += 200` por subir CV, `pe += 250` por titulo. Estos PE mueven la reputacion LOCAL pero **no** la de Supabase. El trigger server-side calcula PE a partir de eventos validados (examenes, contratos). El PE del store local es una metrica fantasma.

### 4. Acciones "Ejecutar → [label]" sin efecto verificable

Los botones "Ejecutar" en HoloGemeloHome llaman `gemeloActions.addTitle()` que hace:
1. Incrementa `titles` en localStorage.
2. Recalcula PE/rep localmente.
3. Llama `pushToSupabase()` a tabla `gemelo_profiles` (no `profiles`).

No hay verificacion, evidencia, ni flujo de convalidacion real. El usuario "sube su nivel" con un clic, contradiciendo "imposible de falsear".

---

## PLAN DE RECTIFICACION: 3 COMPONENTES CRITICOS

### Prioridad 1: `src/lib/gemeloProfile.ts` → REESCRIBIR como facade de solo-lectura

**Problema:** Es un store de escritura local que simula progreso sin respaldo server-side.
**Solucion:**
- Eliminar toda logica de `mutate()`, `persist()`, `gemeloActions.*`.
- Convertirlo en un **hook de solo lectura** que consume exclusivamente `profiles` via `useApp()`.
- Las acciones de convalidacion deben invocar **RPCs SECURITY DEFINER** en Supabase que validen evidencia y disparen los triggers de ejes.
- El "siguiente mejor paso" se calcula a partir del perfil real, no del local.

**Por que primero:** Este componente es la raiz de la dualidad de fuentes. Mientras exista, el usuario recibe feedback falso y la promesa "imposible de falsear" es una mentira tecnica.

### Prioridad 2: `src/components/perfil/HoloGemeloHome.tsx` → Conectar matching a datos reales

**Problema:** El push "UNA EMPRESA TE BUSCA" usa un banco hardcodeado de 11 jobs ficticios.
**Solucion:**
- Reemplazar `getTopJobs(analyzedProfile, rep, 1)` por una consulta a `job_matches` filtrado por `user_id` y ordenado por `match_score DESC`.
- Si no hay matches en BD, mostrar "No hay oportunidades nuevas" (honesto) en vez de un titulo inventado.
- El scoring del servidor (`calculateMatchScore` en un trigger/RPC) debe alimentar `job_matches` cuando se publica un job.
- Los pushes proactivos deben distinguir entre datos reales (badge "verificado") y sugerencias genericas (sin badge).

**Por que segundo:** "El trabajo te busca" es la propuesta de valor central para el usuario. Si es falsa, no hay retencion real.

### Prioridad 3: `supabase/migrations/` → Materializar los triggers de ejes en el repositorio

**Problema:** Los archivos SQL referenciados en DEFINICION_REPUTACION_OMICROM.md (0015, 0016, 0017, 0018, 0050) **no existen** en el repositorio. No hay evidencia de que esten desplegados.
**Solucion:**
- Crear y versionar en el repo todos los triggers que calculan cada eje:
  - `0015_foundation_from_skills.sql` — cuando `user_skill_progress.status` → VALIDATED/MASTERED
  - `0016_execution_from_contracts.sql` — cuando `contracts.status` → RELEASED
  - `0017_quality_from_ratings.sql` — cuando se inserta en `contract_ratings`
  - `0018_transcendence.sql` — cuando se inserta en `market_services` / `knowledge_vault_documents`
  - `0050_reputacion_canonica.sql` — trigger maestro de recalculo
  - `protect_profile_columns` — blindaje anti-escritura del cliente
- Incluir test de integracion que verifique: (1) insertar contrato RELEASED → execution_score sube, (2) insertar rating → quality_score cambia, (3) cliente intenta UPDATE de scores → se revierte.

**Por que tercero:** Sin triggers reales, la reputacion "en tiempo real" que promete la documentacion no existe. El servidor es un almacen pasivo, no un motor de validacion.

---

## CONCLUSION

El Sistema Omicron tiene una **arquitectura visual y de experiencia de usuario sobresaliente** (nucleo 3D, oraculo por voz, presencia en tiempo real), pero su **logica de negocio critica opera en modo demostrativo**: los datos que alimentan la experiencia son mayoritariamente locales, hardcodeados o sin validacion server-side.

La brecha principal no es de UI/UX ni de stack tecnologico — es de **integridad de datos**. El sistema promete "reputacion imposible de falsear" pero permite al usuario incrementar sus metricas con un clic local sin evidencia. Esto convierte la promesa central en una **deuda tecnica existencial** que debe resolverse antes de cualquier traccion real con usuarios o inversionistas.

**Siguiente paso recomendado:** Implementar la Prioridad 1 (eliminar store local de escritura) y la Prioridad 3 (materializar triggers) en un sprint de 2 semanas. Sin esto, el sistema es un prototipo visual, no un marketplace funcional.

---

*Informe generado sin modificar codigo fuente. Solo lectura y analisis.*
