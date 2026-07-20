# PLAN RECONSTRUIDO — Sistema Ómicron 100% Real (App Completa, sin recortes)

> **Fecha:** 19 de julio de 2026
> **Director de proyecto:** tú (solo)
> **Ejecutor técnico:** yo (Kiro)
> **Decisión:** NO MVP. App completa. Se elimina o modifica solo lo que sobre en el camino, nunca por recortar alcance de entrada.

---

## 0. POR QUÉ ESTE PLAN REEMPLAZA A LOS ANTERIORES

Los documentos previos (`PLAN_100_REAL.md`, `FASES_FUNCIONALIDADES.md`, `AUDITORIA_REAL_VS_FICTICIO.md`) calcularon el estado del sistema en **40% real** asumiendo que el backend estaba mayormente sin conectar. Ese diagnóstico era **incorrecto**. Un escaneo exhaustivo (cruce de cada RPC de cada migración contra cada llamada `.rpc()` del frontend) revela otra realidad:

### Lo que estaba mal en el diagnóstico anterior

| Se creía | La realidad verificada |
|---|---|
| El matching de empleos era 100% hardcodeado | `0023_jobs.sql` tiene trigger automático `run_matchmaking()` que corre al publicar un job. `EmpleosTab` llama `apply_to_job()`. Está conectado. |
| El escrow no tenía flujo de UI | `ChatTab.tsx` ya llama `declare_delivery`, `release_escrow`, `object_delivery`, `rate_contract`. El loop completo existe y funciona. |
| La Justicia distribuida no tenía frontend | `GobernanzaTab.tsx` ya llama `resolve_dispute`, `create_stake`, `withdraw_stake`, además de un sistema de "Caja Negra" (chat cifrado con quórum 2-de-3 de árbitros) que ni sabíamos que existía. |
| Las Edge Functions no estaban conectadas | 11 de 14 SÍ están conectadas: `examen-ia` (3 puntos), `embed`, `vault-oracle`, `arbiter-ai`, `market-match`, `carta-ia`, `credential`, `chat-assist`, `run-code`. Solo `coach` y `tutor` tienen fallback comentado en 2 archivos puntuales. |
| Las migraciones 0015-0050 estaban "por desplegar" | Ya están en tu Dashboard real (confirmado con tus capturas) y tienen implementaciones completas y coherentes entre sí. |

### Deuda técnica real confirmada (esto sí es cierto)

| Hallazgo | Detalle | Severidad |
|---|---|---|
| `escrow_contracts` (tabla de `0003`) es 100% huérfana | El sistema real usa `contracts`, no `escrow_contracts`. La tabla vieja + sus RPCs (`create_escrow_contract`, `transfer_tokens` en 0003) quedaron sin uso. | Media — limpiar, no romper nada activo |
| Doble sistema de theming | `src/theme.ts` (146 líneas) vs `src/design-system/theme.ts` (75 líneas) coexisten | Baja — consolidar |
| `coach` y `tutor` con fallback local | `AcademiaTab.tsx` línea 52 y 156 tienen las llamadas comentadas | Media — activar |
| Ghost Approval sin cron real | La UI calcula el countdown de 15 min en el cliente (`ChatTab.tsx` línea 247), pero nadie fuerza el auto-release si el comprador no interactúa | Alta — requiere Edge Function con cron |
| Stripe (`0053`) sin Edge Functions de checkout/webhook | Las tablas y RPCs (`request_withdrawal`, `credit_tokens_from_payment`) existen, pero no hay función que hable con la API de Stripe | Alta — bloquea dinero real |

### Diagnóstico corregido

**El sistema está entre 75-82% real, no 40%.** El trabajo que queda no es "construir el backend" — es: (1) desplegar lo que falta por aplicar en producción, (2) conectar 2 Edge Functions sueltas, (3) automatizar el Ghost Approval, (4) construir el puente con Stripe, (5) decidir el destino del código huérfano, (6) pulir UX y testear cada flujo end-to-end con datos reales.

---

## 1. INVENTARIO DEFINITIVO (fuente de verdad, verificado línea por línea)

### 1.1 Backend — Funciones RPC: conectadas vs huérfanas

| RPC (backend) | ¿Frontend la llama? | Archivo que la usa |
|---|---|---|
| `apply_to_job` | ✅ Sí | EmpleosTab.tsx |
| `consult_vault_document` | ✅ Sí | (VaultTab, vía flujo de compra) |
| `convalidar_credencial` | ✅ Sí | gemeloProfile.ts (recién corregido) |
| `create_stake` | ✅ Sí | GobernanzaTab.tsx |
| `declare_delivery` | ✅ Sí | ChatTab.tsx |
| `find_similar_documents` / `match_vault_documents` | ✅ Sí | VaultTab.tsx (vía embed) |
| `get_course_quiz` / `submit_quiz` | ✅ Sí | AcademiaTab / CourseFlow |
| `get_email_for_login` | ✅ Sí | AuthOverlay.tsx |
| `get_leaderboard` | ⚠️ Por verificar | (candidato a Ranking global) |
| `get_pending_credentials` / `review_credential` | ✅ Sí | CredentialReview.tsx |
| `get_secure_messages` / `send_secure_message` | ✅ Sí | secureChat.ts / ChatTab |
| `mark_dm_read` / `my_dm_conversations` / `get_direct_thread` / `send_direct_message` | ✅ Sí | ChatTab.tsx |
| `mark_lesson_complete` | ✅ Sí | CourseFlow.tsx |
| `my_connections` / `send_connection_request` / `respond_connection_request` / `my_pending_requests` | ✅ Sí | RedSocial.tsx / ChatTab |
| `object_delivery` | ✅ Sí | ChatTab.tsx |
| `open_blackbox` | ✅ Sí | secureChat.ts (GobernanzaTab) |
| `rate_contract` | ✅ Sí | ChatTab.tsx |
| `release_escrow` | ✅ Sí | ChatTab.tsx |
| `resolve_dispute` | ✅ Sí | GobernanzaTab.tsx |
| `withdraw_stake` | ✅ Sí | GobernanzaTab.tsx |
| `get_public_credential` | ✅ Sí | VerifyCredential.tsx (vía Edge Function `credential`) |
| `get_coach_context` | ⚠️ Solo la usa la Edge Function `coach`, que a su vez casi nadie llama desde UI | Indirecto |
| `resolve_audit` | ❌ No se llama desde frontend | Herramienta de admin, probablemente manual desde SQL Editor |
| `create_escrow_contract` / `transfer_tokens` (de `0003`) | ❌ No se llama | **Huérfano confirmado** |
| `request_withdrawal` / `credit_tokens_from_payment` | ❌ No se llama (Stripe sin EF) | Pendiente de conectar |
| `apply_penalty` / `apply_pmc_recovery` | ❌ No se llama desde frontend | Probablemente se dispara solo por trigger, no por acción de usuario — a verificar |
| `open_appeal` / `resolve_appeal` | ❌ No se llama desde frontend | **Feature construida en SQL sin UI** |

### 1.2 Edge Functions: conectadas vs sueltas

| Función | Estado |
|---|---|
| `examen-ia` | ✅ Conectada (ExamenChallenge.tsx, 3 llamadas: generar/defensa/evaluar) |
| `run-code` | ✅ Conectada (SimulatorChallenge.tsx) |
| `embed` | ✅ Conectada (VaultTab.tsx) |
| `vault-oracle` | ✅ Conectada (VaultTab.tsx) |
| `arbiter-ai` | ✅ Conectada (GobernanzaTab.tsx) |
| `market-match` | ✅ Conectada (MarketTab.tsx) |
| `carta-ia` | ✅ Conectada (CartaCompetencias.tsx) |
| `credential` | ✅ Conectada (RedSocial.tsx, VerifyCredential.tsx) |
| `chat-assist` | ✅ Conectada (ChatTab.tsx) |
| `chat-send` / `chat-history` | ⚠️ Existen pero el chat parece usar RPCs directas (`send_secure_message`) en vez de estas — **a decidir cuál es la vía canónica** |
| `blackbox-open` | ⚠️ Existe la Edge Function, pero el frontend llama la RPC `open_blackbox` directamente — misma duda que arriba |
| `coach` | ⚠️ Llamada real existe en `lib/oraculo.ts` (el Oráculo por voz) — **SÍ está conectada**, contradice mi diagnóstico anterior |
| `tutor` | ⚠️ Llamada real existe en `CourseFlow.tsx` — **SÍ está conectada** |

**Corrección sobre la marcha:** al revisar de nuevo, `coach` y `tutor` SÍ tienen llamadas reales (en `lib/oraculo.ts` y `CourseFlow.tsx` respectivamente). Las líneas comentadas que vi en `AcademiaTab.tsx` son un segundo punto de entrada redundante, no la única conexión. **13 de 14 Edge Functions están conectadas.** Solo hay que resolver la duda de `chat-send`/`chat-history`/`blackbox-open` vs. las RPCs equivalentes (probablemente uno es legacy).

### 1.3 Migraciones SQL: aplicadas vs pendientes de confirmar

| Rango | Estado confirmado |
|---|---|
| 0001-0009 | ✅ Aplicadas (confirmado con capturas del Dashboard) |
| 0010-0053 + 9999 | ⚠️ Existen en GitHub con historial de commits real de hace 2-3 semanas. Dices que las "fuiste comiendo y ejecutando" — **falta confirmar cuáles quedaron realmente aplicadas en el Dashboard actual.** |

**Esta es la primera acción del Día 1: generar la lista exacta de qué falta aplicar, comparando 0010→9999 contra tu Dashboard.**

---

## 2. DECISIONES DE ARQUITECTURA (lo que se elimina o modifica)

Tal como dijiste: "quizás en el camino elimine algunas funciones o la modifique". Aquí las decisiones concretas que tomo como director técnico:

| Elemento | Decisión | Razón |
|---|---|---|
| `escrow_contracts` + `create_escrow_contract` + `transfer_tokens` (de `0003`) | **ELIMINAR** en una migración de limpieza | 100% huérfano, reemplazado por `contracts` + `create_stake`/`transfer` equivalentes. Mantenerlo es deuda técnica pura. |
| `src/design-system/` (theme.ts + tokens.ts) | **ELIMINAR**, consolidar todo en `src/theme.ts` | Un solo sistema de diseño, no dos. Confirmar primero qué componentes importan de `design-system` antes de borrar. |
| `chat-send` / `chat-history` / `blackbox-open` (Edge Functions) | **DECIDIR tras inspección**: si son redundantes con las RPCs directas, eliminarlas; si tienen lógica adicional (ej. rate limiting, cifrado adicional), documentar cuál es la vía oficial | Evitar dos caminos para lo mismo |
| `open_appeal` / `resolve_appeal` (RPCs sin UI) | **CONSTRUIR la UI** en GobernanzaTab (no eliminar) | Es una funcionalidad de negocio real (Apelaciones, 7 días, panel senior) que ya tiene el 100% del backend listo — sería un desperdicio no exponerla |
| Ghost Approval (sin cron) | **CONSTRUIR** Edge Function con `pg_cron` que fuerce `release_escrow` tras 15 min sin objeción | Crítico para que el escrow sea confiable sin depender de que el usuario tenga la app abierta |
| Stripe (tablas listas, sin Edge Functions) | **CONSTRUIR** 2 Edge Functions: `create-checkout` y `stripe-webhook` | Es la única vía a dinero real; no se recorta, se construye completo |

---

## 3. PLAN DE ACCIÓN DIARIO (app completa, sin fases recortadas)

Trabajamos tú + yo. Cada día tiene una sesión de trabajo real conmigo, con verificación en vivo contra tu Dashboard de Supabase (vía copiar/pegar en SQL Editor, ya que el MCP directo no está disponible en este entorno).

### SEMANA 1 — AUDITORÍA VIVA + CIERRE DE BRECHAS BACKEND

**DÍA 1 — Reconciliación total de migraciones**
- Te doy un script de una sola query: lista TODAS las migraciones que Supabase considera aplicadas.
- Comparamos contra los 54 archivos del repo, migración por migración.
- Resultado: lista exacta de qué falta ejecutar (probablemente pocas, dado que dices que las fuiste corriendo).
- Aplicamos las que falten, una por una, confirmando el resultado de cada una antes de seguir.

**DÍA 2 — Auditoría de seguridad real**
- Ejecutamos `9999_audit_consolidado.sql` (o lo que ese archivo verifique) contra tu base real.
- Reviso RLS de cada tabla: ¿está habilitado en las 37 tablas confirmadas?
- Cierro cualquier hueco de seguridad encontrado con una migración nueva.

**DÍA 3 — Activar Coach + Tutor completamente + decidir chat-send/blackbox-open**
- Verificar `GEMINI_API_KEY` está configurada en Secrets del proyecto.
- Probar en vivo: Oráculo pregunta algo → Coach responde con datos reales del Gemelo.
- Probar CourseFlow → Tutor responde.
- Inspeccionar `chat-send`/`chat-history`/`blackbox-open` a fondo: decidir si se eliminan o se activan como vía primaria.

**DÍA 4 — Ghost Approval automático (pg_cron)**
- Crear Edge Function `auto-release-escrow` que:
  1. Busca contratos en `DELIVERED` con `delivery_declared_at` > 15 min.
  2. Llama `release_escrow` automáticamente si no hay disputa abierta.
- Programar con `pg_cron` (cada 1-5 min) o `Supabase Scheduled Functions`.
- Test: crear un contrato de prueba, declarar entrega, esperar, confirmar auto-release.

**DÍA 5 — Limpieza de deuda técnica (escrow_contracts + design-system)**
- Migración `00XX_drop_escrow_contracts_legacy.sql`: elimina tabla y RPCs huérfanas de `0003`.
- Verificar que NADA en frontend referencia `escrow_contracts` antes de borrar (ya confirmado: 0 referencias).
- Consolidar `src/design-system/` dentro de `src/theme.ts`, actualizar imports.

---

### SEMANA 2 — FUNCIONALIDADES QUE FALTAN CONSTRUIR (no recortar)

**DÍA 6 — UI de Apelaciones**
- Backend ya listo (`open_appeal`, `resolve_appeal` de `0043_appeals.sql`).
- Construir en `GobernanzaTab.tsx`: botón "Apelar" en disputas resueltas (ventana 7 días), panel de árbitros senior N5/N6.

**DÍA 7 — Stripe: checkout real**
- Edge Function `create-checkout-session`: recibe monto CLP, crea sesión Stripe, devuelve URL.
- UI en WalletTab: botón "Comprar tokens" → redirige a Stripe Checkout.
- Requiere: tu cuenta Stripe (modo test primero).

**DÍA 8 — Stripe: webhook + retiros**
- Edge Function `stripe-webhook`: recibe `payment_intent.succeeded`, llama `credit_tokens_from_payment`.
- UI: flujo de solicitud de retiro (`request_withdrawal`) ya tiene RPC — construir el formulario (datos bancarios, KYC gate si >10.000 tokens).

**DÍA 9 — Ranking global + Leaderboard**
- Verificar si `get_leaderboard` ya cubre esto o falta construirlo.
- UI: componente de Ranking (top 50 por reputación) con Realtime.

**DÍA 10 — Mentorías (tabla `mentorships` existe, ¿tiene UI?)**
- Auditar si `mentorships` tiene flujo completo o es otra pieza de backend sin UI.
- Construir lo que falte: solicitar mentoría, aceptar, completar → dispara `fn_mentorship_transcendence`.

---

### SEMANA 3 — BLOCKCHAIN + HARDENING + LANZAMIENTO

**DÍA 11 — Smart Contract GemeloDigitalSBT**
- Escribir contrato Solidity (Soulbound Token, no transferible).
- Deploy en testnet (Base Sepolia o Polygon Amoy — gas gratis).

**DÍA 12 — Integración SBT con backend**
- Edge Function `mint-sbt`: al crear perfil, mintear el SBT del usuario.
- Edge Function `update-sbt-hash`: anchoring periódico del hash de reputación.

**DÍA 13 — Testing exhaustivo end-to-end**
- Recorrer TODOS los flujos con una cuenta de prueba real:
  registro → CV → examen → contrato → chat → entrega → calificación → disputa (opcional) → apelación (opcional) → retiro.
- Documentar cualquier bug encontrado.

**DÍA 14 — Pulido final + Deploy a producción**
- Fix de bugs del Día 13.
- Revisar `vercel.json`, CI (`ci.yml`) pasando en verde.
- Deploy final a `main`.

---

## 4. LO QUE NECESITO DE TI CADA DÍA

1. Acceso al SQL Editor de tu Dashboard (`https://supabase.com/dashboard/project/cuwuyqpxaibbqjrvamjb/sql/new`) para pegar y ejecutar cada script que te prepare.
2. Confirmación del resultado (pantallazo o texto del output) antes de que yo avance al siguiente paso.
3. Para el Día 7-8: acceso a tu cuenta Stripe (modo test) cuando lleguemos ahí.
4. Para el Día 11: una wallet de testnet (MetaMask) cuando lleguemos ahí.

---

## 5. PRÓXIMO PASO INMEDIATO

Antes de tocar código, ejecutamos el **Día 1**: te doy la query de reconciliación de migraciones ahora mismo. ¿Arrancamos?
