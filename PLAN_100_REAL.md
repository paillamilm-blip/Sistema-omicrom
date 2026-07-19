# PLAN 100% REAL — Acciones Diarias para Sistema Omicron

> **Fecha:** 18 de julio de 2026
> **Descubrimiento critico:** El repositorio tiene 54 migraciones SQL + 14 Edge Functions
> + esquema de produccion completo + seeds de demo. El sistema esta MUCHO mas avanzado
> de lo que la auditoria anterior detecto. El problema NO es "falta codigo" sino que
> hay piezas sin desplegar y sin conectar.

---

## REVISION DEL DIAGNOSTICO

### Lo que YA EXISTE en el repositorio (oculto en supabase/):

| Componente | Archivo | Estado |
|---|---|---|
| Regalias encadenadas (3 niveles) | `0044_vault_chained_royalties.sql` | SQL listo, falta deploy |
| Depreciacion de tokens (5% mensual/90 dias) | `0045_token_depreciation.sql` | SQL listo, falta deploy |
| Depreciacion de activos Boveda (H-07) | `0026_vault_depreciation.sql` | SQL listo, falta deploy |
| Busqueda semantica (pgvector + embeddings) | `0025_vault_semantic.sql` | SQL listo, falta deploy |
| Integracion Stripe (pagos reales) | `0053_stripe_integration.sql` | SQL listo, falta deploy |
| Penalizaciones PMC | `0042_penalties_pmc.sql` | SQL listo, falta deploy |
| Apelaciones | `0043_appeals.sql` | SQL listo, falta deploy |
| Examinador IA (generar + evaluar + acta) | `functions/examen-ia/index.ts` | Codigo listo, falta deploy |
| Coach IA (Gemini) | `functions/coach/index.ts` | Codigo listo, falta deploy |
| Arbitro IA | `functions/arbiter-ai/index.ts` | Codigo listo, falta deploy |
| Tutor IA | `functions/tutor/index.ts` | Codigo listo, falta deploy |
| Embed (vectores semanticos) | `functions/embed/index.ts` | Codigo listo, falta deploy |
| Market Match IA | `functions/market-match/index.ts` | Codigo listo, falta deploy |
| Vault Oracle IA | `functions/vault-oracle/index.ts` | Codigo listo, falta deploy |
| Chat cifrado (Caja Negra) | `functions/blackbox-open/index.ts` | Codigo listo, falta deploy |
| Chat Send/History | `functions/chat-send/`, `chat-history/` | Codigo listo, falta deploy |
| Run Code (sandbox) | `functions/run-code/index.ts` | Codigo listo, falta deploy |
| Ghost Approval (15 min auto) | Tabla `ghost_approval_log` + trigger en contratos | Parcial |
| Carta IA (carta de presentacion) | `functions/carta-ia/index.ts` | Codigo listo, falta deploy |
| Credenciales verificables | `functions/credential/index.ts` + `0013_credentials.sql` | SQL listo |
| Premium (is_premium flag) | `0039_premium.sql` | SQL listo |
| Login por username | `0041_login_by_username.sql` | SQL listo |
| Rate limiting | `0012_rate_limiting.sql` + `0031_rate_limiting.sql` | SQL listo |
| RLS seguridad completa | `0027–0032 + CERRAR_HALLAZGOS_SEGURIDAD.sql` | SQL listo |
| Empleos geo (lat/lng) | `0038_jobs_geo.sql` | SQL listo |
| Seeds de demo completas | `seed.sql` + `seed_demo.sql` | Listos |

### Nuevo diagnostico real: **El sistema esta al 75-80% CODIFICADO, al 40% DESPLEGADO.**

---

## PLAN DE ACCION DIARIO (14 dias para 100% real)

### SEMANA 1: DESPLIEGUE + CONEXION

---

#### DIA 1 (Lunes) — INFRAESTRUCTURA BASE

**Objetivo:** Tener Supabase 100% configurado con todas las migraciones aplicadas.

| Hora | Accion | Responsable | Resultado esperado |
|------|--------|-------------|-------------------|
| 09:00 | Verificar acceso a Supabase Dashboard (proyecto de produccion) | Dev | Login exitoso |
| 09:30 | Ejecutar `PUESTA_EN_MARCHA.sql` en SQL Editor | DBA | academy_courses, exam_sessions, actas creadas |
| 10:00 | Ejecutar `CERRAR_HALLAZGOS_SEGURIDAD.sql` | DBA | RLS en contracts, disputes, arbitration |
| 10:30 | Verificar migraciones 0001-0040 aplicadas (`SELECT * FROM supabase_migrations.schema_migrations`) | DBA | Todas presentes |
| 11:00 | Aplicar migraciones 0041-0053 pendientes (una por una, en orden) | DBA | 0 errores |
| 12:00 | Ejecutar `9999_audit_consolidado.sql` | DBA | Triggers de auditoria activos |
| 14:00 | Configurar secretos en Supabase Dashboard: `GEMINI_API_KEY` | Dev | Secret guardado |
| 14:30 | Habilitar extensiones: `CREATE EXTENSION IF NOT EXISTS vector` (pgvector) | DBA | pgvector activo |
| 15:00 | Ejecutar `seed.sql` (datos de demo) | DBA | 4 usuarios con datos variados |
| 15:30 | Verificar que `recalc_reputation` trigger funciona: UPDATE un score y ver reputacion recalculada | QA | OK |
| 16:00 | Verificar RLS: intentar UPDATE de reputation_score desde cliente anonimo → debe fallar | QA | Bloqueado |

**Entregable del dia:** BD de produccion con TODOS los triggers y tablas activos.

---

#### DIA 2 (Martes) — DEPLOY EDGE FUNCTIONS (IA)

**Objetivo:** Las 14 Edge Functions desplegadas y funcionales.

| Hora | Accion | Resultado |
|------|--------|-----------|
| 09:00 | Instalar Supabase CLI: `npm i -g supabase` + `supabase login` + `supabase link --project-ref <ref>` | CLI conectada |
| 09:30 | Deploy `coach`: `supabase functions deploy coach --no-verify-jwt` | Funcion live |
| 10:00 | Test: `curl -X POST <url>/functions/v1/coach -H "Authorization: Bearer <token>"` | Respuesta con advice |
| 10:30 | Deploy `examen-ia` | Funcion live |
| 11:00 | Deploy `tutor` | Funcion live |
| 11:30 | Deploy `arbiter-ai` | Funcion live |
| 12:00 | Deploy `embed` | Funcion live |
| 13:30 | Deploy `market-match` | Funcion live |
| 14:00 | Deploy `vault-oracle` | Funcion live |
| 14:30 | Deploy `carta-ia` | Funcion live |
| 15:00 | Deploy `run-code` | Funcion live |
| 15:30 | Deploy `blackbox-open`, `chat-send`, `chat-history` | 3 funciones live |
| 16:00 | Deploy `credential` | Funcion live |
| 16:30 | Test end-to-end: login → coach → examen-ia generar → evaluar → acta creada | Todo funciona |

**Entregable del dia:** Todas las Edge Functions desplegadas. Coach IA responde. Examenes se generan.

---

#### DIA 3 (Miercoles) — CONECTAR FRONTEND A FUNCIONES REALES

**Objetivo:** El frontend usa las funciones reales en vez de degradar con fallbacks.

| Hora | Accion | Archivo a modificar |
|------|--------|---------------------|
| 09:00 | Conectar MaxSkillTab: boton "Examinar" → `supabase.functions.invoke('examen-ia')` | MaxSkillTab.tsx |
| 10:00 | Conectar AcademiaTab: boton tutor → `supabase.functions.invoke('tutor')` | AcademiaTab.tsx |
| 11:00 | Conectar VaultTab: al publicar, generar embedding → `supabase.functions.invoke('embed')` | VaultTab.tsx |
| 12:00 | Conectar GobernanzaTab: boton "Crear disputa" → INSERT real en `disputes` | GobernanzaTab.tsx |
| 14:00 | Conectar ChatTab: enviar mensajes via `supabase.functions.invoke('chat-send')` (cifrado) | ChatTab.tsx |
| 15:00 | Conectar EmpleosTab: al publicar job → trigger de matching → `job_matches` se llena | EmpleosTab.tsx |
| 16:00 | Conectar OraculoBar: Coach IA ahora funciona realmente | OraculoBar.tsx (ya conectado) |

**Entregable:** El Coach responde consejos reales. Los examenes se generan con IA. Los chats se cifran.

---

#### DIA 4 (Jueves) — ESCROW FUNCIONAL + CALIFICACIONES

**Objetivo:** Loop completo de contrato: crear → lock → entregar → aprobar → release → calificar.

| Hora | Accion |
|------|--------|
| 09:00 | Crear flujo UI en ChatTab: boton "Entregar trabajo" → UPDATE contracts SET status='DELIVERED' |
| 10:00 | Crear flujo: "Aprobar entrega" → UPDATE status='RELEASED' (trigger recalc_execution dispara) |
| 11:00 | Crear componente de calificacion (1-5 estrellas) post-contrato → INSERT contract_ratings |
| 12:00 | Verificar: calificar → trigger recalc_quality → quality_score cambia → reputacion cambia |
| 14:00 | Ghost Approval: crear Edge Function cron que auto-aprueba contratos DELIVERED > 15 min |
| 15:00 | UI: mostrar timer de Ghost Approval en el chat del contrato |
| 16:00 | Test E2E: crear contrato → entregar → esperar/aprobar → calificar → ver scores actualizados |

**Entregable:** Primer loop completo verificable de la economia real.

---

#### DIA 5 (Viernes) — BOVEDA REAL + REGALIAS

**Objetivo:** La Boveda genera regalias reales con deteccion de similitud.

| Hora | Accion |
|------|--------|
| 09:00 | Verificar que 0044 (regalias encadenadas) esta aplicada y `content_lineage` existe |
| 10:00 | Al publicar en Boveda: llamar `supabase.functions.invoke('embed')` para generar vector |
| 11:00 | Detectar documentos similares (>85%): mostrar alerta "Contenido derivado detectado" |
| 12:00 | Si es derivado: registrar en `content_lineage` automaticamente |
| 14:00 | Verificar que `consult_vault_document()` distribuye regalias en cadena (hasta 3 niveles) |
| 15:00 | UI: mostrar en VaultTab cuantas regalias ha generado cada documento |
| 16:00 | Test: publicar doc derivado → consultar → verificar que el autor original recibe su % |

**Entregable:** La Boveda de Conocimiento es real: detecta plagio, distribuye regalias.

---

### SEMANA 2: ECOSISTEMA COMPLETO

---

#### DIA 6 (Lunes) — JUSTICIA DISTRIBUIDA

| Hora | Accion |
|------|--------|
| 09:00 | UI: boton "Disputar" en contrato DELIVERED → INSERT disputes |
| 10:00 | Backend: asignar 3 arbitros aleatorios (N3+ con staking) via RPC |
| 11:00 | UI: panel de arbitro en GobernanzaTab → ver evidencia → votar |
| 12:00 | Backend: al votar 2/3 → ejecutar fallo automatico (release o refund + PMC) |
| 14:00 | Conectar `arbiter-ai`: asistente que sugiere veredicto al arbitro |
| 15:00 | UI: proceso de apelacion (7 dias, panel senior) |
| 16:00 | Test: crear disputa → votar → fallo ejecutado → reputacion afectada |

---

#### DIA 7 (Martes) — DEPRECIACION + TOKENS OPERATIVOS

| Hora | Accion |
|------|--------|
| 09:00 | Verificar `0045_token_depreciation` aplicado + `last_activity_at` existe |
| 10:00 | Crear Edge Function cron (monthly): `depreciate_inactive_tokens()` |
| 11:00 | Verificar `0026_vault_depreciation` para activos de conocimiento |
| 12:00 | Crear cron para depreciacion de Boveda (mensual) |
| 14:00 | Compra de servicios con tokens: Frontend Market → RPC `purchase_service` |
| 15:00 | Transferencia de tokens entre usuarios (P2P) |
| 16:00 | Test: verificar que un usuario inactivo 90+ dias pierde 5% tokens |

---

#### DIA 8 (Miercoles) — MATCHING REAL + PUSH EN VIVO

| Hora | Accion |
|------|--------|
| 09:00 | Crear trigger `on_job_published`: al INSERT en job_postings, calcular matches |
| 10:00 | Usar `calculateMatchScore()` del reputationService para scoring real |
| 11:00 | INSERT en job_matches los top 10 candidatos por job |
| 12:00 | Suscripcion real-time en HoloGemeloHome a INSERT en job_matches |
| 14:00 | Push proactivo REAL: "Una empresa te busca" → solo si hay match real en BD |
| 15:00 | UI: EmpleosTab muestra rank del usuario en cada oferta |
| 16:00 | Test: publicar job → ver que 4 usuarios reciben match → UI refleja |

---

#### DIA 9 (Jueves) — PREMIUM + PAGOS REALES (STRIPE)

| Hora | Accion |
|------|--------|
| 09:00 | Configurar Stripe Connect (cuenta del proyecto) |
| 10:00 | Crear Edge Function `create-checkout-session` |
| 11:00 | Crear Edge Function `webhook-stripe` (payment_intent.succeeded → acreditar tokens) |
| 12:00 | UI: boton "Comprar Tokens" en WalletTab → abre Stripe Checkout |
| 14:00 | UI: suscripcion Premium (mensual) → desbloquea Coach IA / Examinador |
| 15:00 | Implementar gate Premium: `if (!profile.is_premium) → mostrar paywall` |
| 16:00 | Test: comprar tokens con tarjeta de prueba → balance sube |

---

#### DIA 10 (Viernes) — RANKING GLOBAL + RED COMPLETA

| Hora | Accion |
|------|--------|
| 09:00 | Crear componente RankingPanel (top 50 por reputation_score) |
| 10:00 | Query: `profiles ORDER BY reputation_score DESC LIMIT 50` |
| 11:00 | Suscripcion real-time: actualizar ranking cuando cambie alguna reputacion |
| 12:00 | UI: tocar nodo en ranking → ver credencial publica → boton Conectar/DM |
| 14:00 | Satelites reales en nucleo 3D: mostrar peers online como nodos orbitando |
| 15:00 | Conexion social real: boton "Conectar" → INSERT en tabla de conexiones |
| 16:00 | Test: dos usuarios online → se ven mutuamente → se conectan → DM funciona |

---

### SEMANA 3: HARDENING + BLOCKCHAIN + LANZAMIENTO

---

#### DIA 11 (Lunes) — EXAMINADOR IA COMPLETO

| Hora | Accion |
|------|--------|
| 09:00 | Flujo completo en MaxSkillTab: seleccionar nodo → "Examinarse" |
| 10:00 | UI: mostrar preguntas generadas por IA (multiple choice + caso) |
| 11:00 | UI: enviar respuestas → Edge Function evalua → devuelve acta |
| 12:00 | Aplicar acta: RPC `aplicar_acta` → sube scores + PE + skill status = VALIDATED |
| 14:00 | Verificar: validar nodo → foundation_score sube → reputacion recalculada |
| 15:00 | UI: mostrar historial de actas en perfil del usuario |
| 16:00 | Test E2E: estudiar → examinar → aprobar → PE + reputacion suben |

---

#### DIA 12 (Martes) — SEGURIDAD FINAL + TESTS

| Hora | Accion |
|------|--------|
| 09:00 | Audit de seguridad: ejecutar `auditoria_check.sql` |
| 10:00 | Verificar TODOS los RLS policies estan activos (cada tabla) |
| 11:00 | Test de penetracion: intentar modificar scores desde cliente → bloqueado |
| 12:00 | Test: intentar acceder datos de otro usuario → RLS bloquea |
| 14:00 | Test de carga: simular 50 usuarios simultaneos con Presence |
| 15:00 | Fix cualquier bug encontrado en los tests |
| 16:00 | Documentar resultados de seguridad |

---

#### DIA 13 (Miercoles) — BLOCKCHAIN (SBT) + HUMAN PASSPORT

| Hora | Accion |
|------|--------|
| 09:00 | Crear contrato GemeloDigitalSBT en Solidity (basado en definicion v8) |
| 10:00 | Deploy en testnet Base/Polygon |
| 11:00 | Crear Edge Function: `mint-sbt` (al crear perfil) |
| 12:00 | Crear Edge Function: `update-sbt` (anchoring periodico del hash) |
| 14:00 | Integrar Chainlink Automation para anchoring cada 24h |
| 15:00 | (Opcional) Human Passport: integracion API para Humanity Score |
| 16:00 | UI: badge "Reputacion On-Chain" en perfil verificado |

---

#### DIA 14 (Jueves) — REVISION FINAL + LANZAMIENTO

| Hora | Accion |
|------|--------|
| 09:00 | Checklist de produccion: todas las Edge Functions responden |
| 10:00 | Checklist: todos los triggers activos y funcionando |
| 11:00 | Checklist: RLS en TODAS las tablas |
| 12:00 | Checklist: Stripe en modo produccion (si aplica) o test |
| 14:00 | Actualizar README con instrucciones de deploy completas |
| 15:00 | Push final a main → deploy automatico en Vercel |
| 16:00 | Verificar produccion: registrarse → CV → examinar → contrato → cobrar → reputacion cambia |

---

## ESTADO REAL POST-DESCUBRIMIENTO

| Componente | Codigo | Desplegado | Accion |
|---|---|---|---|
| 54 migraciones SQL | ✅ 100% | ~60% | Aplicar las faltantes (Dia 1) |
| 14 Edge Functions | ✅ 100% | ~20% | Deploy todas (Dia 2) |
| Frontend conectado | ✅ 85% | ✅ 85% | Conectar los 15% restantes (Dias 3-4) |
| Escrow workflow | ✅ 80% (triggers) | ❌ | Completar UI (Dia 4) |
| Regalias encadenadas | ✅ 100% (SQL) | ❌ | Deploy + conectar (Dia 5) |
| Justicia distribuida | ✅ 70% (SQL+EF) | ❌ | Completar flujo (Dia 6) |
| Depreciacion tokens | ✅ 100% (SQL) | ❌ | Deploy + cron (Dia 7) |
| Matching real | ✅ 60% | ❌ | Trigger + push (Dia 8) |
| Stripe/pagos reales | ✅ 100% (SQL) | ❌ | Conectar (Dia 9) |
| Ranking global | ❌ 0% | ❌ | Crear (Dia 10) |
| Examinador IA completo | ✅ 90% (EF) | ❌ | UI + flujo (Dia 11) |
| Blockchain SBT | ❌ 0% | ❌ | Crear (Dia 13) |

---

## RESULTADO ESPERADO: DIA 14

- **100% de las funcionalidades core son REALES** (no demo, no fake, no hardcodeado).
- La reputacion se calcula exclusivamente por triggers server-side.
- Los contratos tienen escrow real con Ghost Approval.
- La Boveda detecta plagio y paga regalias en cadena.
- El Examinador IA genera examenes y emite actas que mueven la reputacion.
- Los pagos con Stripe son funcionales (modo test o produccion).
- La justicia distribuida resuelve disputas automaticamente.
- (Opcional) La reputacion esta anclada on-chain via SBT.

**De 40% real a 100% real en 14 dias de trabajo enfocado.**

---

## PREREQUISITOS INMEDIATOS (antes del Dia 1)

| Prerequisito | Como obtenerlo | Urgencia |
|---|---|---|
| Acceso admin a Supabase Dashboard | Credenciales del proyecto | CRITICO |
| API Key Gemini (Google AI Studio) | https://aistudio.google.com/apikey | CRITICO |
| Supabase CLI instalada localmente | `npm i -g supabase` | CRITICO |
| Cuenta Stripe (modo test) | https://dashboard.stripe.com/register | Dia 9 |
| Wallet testnet (Base/Polygon) | MetaMask + faucet | Dia 13 |

---

*Este plan asume 1 desarrollador full-stack trabajando 8h/dia.
Con 2 desarrolladores se puede comprimir a 8-10 dias.*
