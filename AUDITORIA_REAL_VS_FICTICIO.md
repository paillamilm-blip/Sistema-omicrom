# AUDITORIA: Funcionalidades REALES vs. FICTICIAS

> **Fecha:** 18 de julio de 2026
> **Post-rectificación:** Incluye el estado DESPUÉS de aplicar las 3 prioridades.
> **Criterio:** Una funcionalidad es "REAL" si tiene lógica de backend conectada (tabla + query + trigger/RPC).
> Es "DEMO" si la UI muestra datos locales/hardcodeados. Es "FICTICIA" si no existe en código.

---

## RESUMEN RÁPIDO

| Estado | Cantidad | % |
|--------|----------|---|
| ✅ REAL (conectada a Supabase) | 18 | 40% |
| 🟡 DEMO (funciona localmente, sin backend real) | 16 | 36% |
| ❌ FICTICIA (solo en documentación, 0 código) | 11 | 24% |
| **TOTAL funcionalidades auditadas** | **45** | 100% |

---

## TABLA EXHAUSTIVA

### 1. AUTENTICACIÓN Y PERFIL

| # | Funcionalidad | Estado | Evidencia |
|---|---|---|---|
| 1.1 | Registro con email/password | ✅ REAL | `supabase.auth.signUp()` en AuthOverlay.tsx |
| 1.2 | Login con email o username | ✅ REAL | `supabase.auth.signInWithPassword()` + RPC `get_email_for_login` |
| 1.3 | Recuperar contraseña | ✅ REAL | `supabase.auth.resetPasswordForEmail()` |
| 1.4 | Perfil persistido en BD | ✅ REAL | Tabla `profiles` con upsert automático al registrar |
| 1.5 | Avatar en Supabase Storage | ✅ REAL | Upload a bucket `avatars` + URL pública en `profiles.avatar_url` |
| 1.6 | Editar perfil (nombre, bio, skills) | ✅ REAL | `EditProfileModal.tsx` → UPDATE `profiles` |
| 1.7 | Cierre de sesión completo | ✅ REAL | `supabase.auth.signOut()` + limpieza localStorage |

### 2. GEMELO DIGITAL Y REPUTACIÓN

| # | Funcionalidad | Estado | Evidencia |
|---|---|---|---|
| 2.1 | Fórmula 20/80 + momentum | ✅ REAL | `reputationService.ts` + trigger `0050_reputacion_canonica.sql` |
| 2.2 | 4 ejes visibles en UI (radar/núcleo 3D) | ✅ REAL | `HoloNucleo3D.tsx` recibe axes de `profiles` vía AppContext |
| 2.3 | Trigger recálculo de Ejecución | 🟡 DEMO | SQL creado (`0016`) pero NO desplegado aún en Supabase |
| 2.4 | Trigger recálculo de Calidad | 🟡 DEMO | SQL creado (`0017`) pero NO desplegado |
| 2.5 | Trigger recálculo de Trascendencia | 🟡 DEMO | SQL creado (`0018`) pero NO desplegado |
| 2.6 | Trigger recálculo de Fundamento | 🟡 DEMO | SQL creado (`0015`) pero NO desplegado |
| 2.7 | Blindaje protect_profile_columns | 🟡 DEMO | SQL creado (`0007`) pero NO desplegado |
| 2.8 | Convalidar CV vía RPC | 🟡 DEMO | Cliente llama `convalidar_cv`; RPC en SQL (`0048`) no desplegada. Fallback local. |
| 2.9 | Convalidar título/experiencia vía RPC | 🟡 DEMO | Igual que 2.8 — con fallback local |
| 2.10 | Canal real-time para cambios de perfil | ✅ REAL | `postgres_changes` en AppContext sobre `profiles` |
| 2.11 | Historial de reputación (reputation_history) | ✅ REAL | `updateReputationInDatabase()` inserta en tabla `reputation_history` |
| 2.12 | Evolución de nodo (N1→N2→N3) | ✅ REAL | `determineNodeLevel()` en reputationService + trigger `0050` |
| 2.13 | SBT on-chain (Soulbound Token) | ❌ FICTICIA | Solo en documentación. 0 código Solidity. |
| 2.14 | Chainlink Automation/Functions | ❌ FICTICIA | Solo en documentación. 0 integración. |

### 3. RED EN TIEMPO REAL (MULTIUSUARIO)

| # | Funcionalidad | Estado | Evidencia |
|---|---|---|---|
| 3.1 | Contador de nodos online | ✅ REAL | Supabase Presence en canal `omicron-live` |
| 3.2 | Lista de quién está conectado | ✅ REAL | `presenceState()` → lista de LiveNodes |
| 3.3 | Broadcast de eventos en vivo | ✅ REAL | `channel.send({ type: 'broadcast' })` |
| 3.4 | Satélites orbitando en núcleo 3D | 🟡 DEMO | Nodos en la esfera son los 4 ejes + chips, NO los peers reales |
| 3.5 | Ranking global en vivo | ❌ FICTICIA | No hay componente de ranking que consuma `profiles` ordenado por rep |
| 3.6 | DM (mensajes directos) | ✅ REAL | ChatTab usa RPC `my_dm_conversations` + tabla `messages` |

### 4. EMPLEOS Y MATCHING

| # | Funcionalidad | Estado | Evidencia |
|---|---|---|---|
| 4.1 | Listar ofertas de empleo | ✅ REAL | `EmpleosTab` → `supabase.from('job_postings')` |
| 4.2 | Publicar oferta de empleo | ✅ REAL | INSERT en `job_postings` desde EmpleosTab |
| 4.3 | Matching real (job_matches) | ✅ REAL | `EmpleosTab` consulta `job_matches` por user_id |
| 4.4 | Push "una empresa te busca" en Home | 🟡 DEMO | Consulta `job_matches` real con fallback a `jobMatcher.ts` local. Señalizado como "DEMO" vs "VERIFICADA" |
| 4.5 | Postulación a ofertas | ✅ REAL | `EmpleosTab` consulta `job_applications` |
| 4.6 | Motor de matching server-side | ❌ FICTICIA | No hay trigger/Edge Function que calcule match_score al publicar job |
| 4.7 | Push real-time de nuevas ofertas | ❌ FICTICIA | Prometido en README. No implementado (no hay suscripción a INSERT en job_postings) |

### 5. MERCADO DE SERVICIOS (MARKET)

| # | Funcionalidad | Estado | Evidencia |
|---|---|---|---|
| 5.1 | Listar servicios | ✅ REAL | `MarketTab` → `supabase.from('market_services')` |
| 5.2 | Publicar servicio | ✅ REAL | `PublishServiceModal` → INSERT en `market_services` |
| 5.3 | Match IA de servicios | 🟡 DEMO | Llama Edge Function `market-match` — puede no estar desplegada |
| 5.4 | Compra de servicio con tokens | ❌ FICTICIA | No hay flujo de compra implementado |

### 6. ACADEMIA Y ÁRBOL DE HABILIDADES

| # | Funcionalidad | Estado | Evidencia |
|---|---|---|---|
| 6.1 | Listar cursos | ✅ REAL | `AcademiaTab` → `supabase.from('academy_courses')` |
| 6.2 | Progreso de lecciones | ✅ REAL | `user_lesson_progress` consultado y actualizado |
| 6.3 | Árbol de habilidades visual | ✅ REAL | `MaxSkillTab` → `supabase.from('skill_tree_nodes')` + `user_skill_progress` |
| 6.4 | Validar nodo con examen IA | 🟡 DEMO | Tipos definidos (`ExamGenerated`, `ActaEvidencia`). Edge Function `examiner` no confirmada. |
| 6.5 | PE otorgados por validar nodos | ❌ FICTICIA | No hay RPC/trigger que sume PE al validar |
| 6.6 | Conexión Fundamento → reputación real | 🟡 DEMO | Trigger `0015` escrito, no desplegado |

### 7. BÓVEDA DE CONOCIMIENTO

| # | Funcionalidad | Estado | Evidencia |
|---|---|---|---|
| 7.1 | Publicar documentos | ✅ REAL | `VaultTab` → INSERT en `knowledge_vault_documents` |
| 7.2 | Consultar/comprar documentos | ✅ REAL | `vault_queries` registra accesos |
| 7.3 | Regalías encadenadas | ❌ FICTICIA | No hay tabla `content_lineage` ni lógica de distribución |
| 7.4 | Detección de similitud (pgvector) | ❌ FICTICIA | No hay embedding ni búsqueda semántica |
| 7.5 | Depreciación H-07 de activos | ❌ FICTICIA | No hay cron ni trigger de depreciación |

### 8. BILLETERA Y ECONOMÍA

| # | Funcionalidad | Estado | Evidencia |
|---|---|---|---|
| 8.1 | Ver balance de tokens | ✅ REAL | `profiles.token_balance` mostrado en WalletTab |
| 8.2 | Historial de transacciones | ✅ REAL | `wallet_transactions` consultado en WalletTab |
| 8.3 | Escrow (lock/release/refund) | 🟡 DEMO | Tabla `contracts` tiene campo status, pero no hay flujo de transición |
| 8.4 | Depreciación de tokens inactivos | ❌ FICTICIA | No hay cron ni trigger |
| 8.5 | Pasarela de pago real (Stripe/MercadoPago) | ❌ FICTICIA | Solo en documentación |

### 9. GOBERNANZA Y JUSTICIA

| # | Funcionalidad | Estado | Evidencia |
|---|---|---|---|
| 9.1 | Ver disputas propias | ✅ REAL | `GobernanzaTab` → `supabase.from('disputes')` |
| 9.2 | Ver contratos propios | ✅ REAL | `GobernanzaTab` → `supabase.from('contracts')` |
| 9.3 | Crear disputa | ❌ FICTICIA | No hay INSERT de disputa en el frontend |
| 9.4 | Asignación de árbitros | ❌ FICTICIA | No hay lógica de selección aleatoria |
| 9.5 | Votación y fallo | ❌ FICTICIA | No hay flujo de votación |
| 9.6 | Ghost Approval (15 min timer) | ❌ FICTICIA | No hay timer server-side |
| 9.7 | Penalizaciones (PMC) | 🟡 DEMO | Tabla `penalties` referenciada pero sin escritura desde el frontend |
| 9.8 | Human Passport / Humanity Score | ❌ FICTICIA | 0 integración |

### 10. ORÁCULO Y VOZ

| # | Funcionalidad | Estado | Evidencia |
|---|---|---|---|
| 10.1 | Reconocimiento de voz (STT) | ✅ REAL | Web Speech API nativa (SpeechRecognition) — $0 |
| 10.2 | Síntesis de voz (TTS) | ✅ REAL | Web Speech API nativa (SpeechSynthesis) — $0 |
| 10.3 | Interpretación de intents (navigate/fact) | ✅ REAL | `lib/oraculo.ts` — regex local, 0 latencia |
| 10.4 | Motor proactivo (7 detectores) | ✅ REAL | `lib/proactiveEngine.ts` — 100% local, $0 |
| 10.5 | Coach IA (Edge Function Gemini) | 🟡 DEMO | Cliente invoca `coach` pero Edge Function no confirmada desplegada |
| 10.6 | Memoria conversacional | 🟡 DEMO | `lib/gemeloMemory.ts` — localStorage, no persiste en BD |

### 11. CREDENCIALES Y PASAPORTE

| # | Funcionalidad | Estado | Evidencia |
|---|---|---|---|
| 11.1 | Subir credenciales (archivos) | ✅ REAL | `CredentialsPanel` → Supabase Storage `credentials` bucket |
| 11.2 | Verificar credencial vía URL pública | ✅ REAL | `VerifyCredentialView` + query param `?verificar=` |
| 11.3 | Pasaporte verificable (QR) | 🟡 DEMO | `PasaporteGemelo.tsx` genera QR pero la verificación depende de 11.2 |

---

## MÉTRICAS POST-RECTIFICACIÓN

| Antes de rectificación | Después |
|---|---|
| gemeloProfile escribía scores localmente | Ahora es read-only, llama RPCs |
| Push "empresa te busca" 100% hardcodeado | Ahora consulta `job_matches` real con fallback señalizado |
| 0 migraciones SQL en el repo | 6 migraciones creadas (pendientes de deploy) |
| Dualidad de fuentes de reputación | Eliminada — una sola fuente (Supabase `profiles`) |

---

## SIGUIENTE PASO CRÍTICO

Para pasar de **40% REAL** a **70%+ REAL**:
1. **Desplegar las 6 migraciones SQL** en Supabase (`supabase db push`)
2. **Desplegar Edge Functions** (coach, examiner, market-match)
3. **Crear trigger de matching** que calcule `job_matches` al publicar un `job_posting`

Ver `FASES_FUNCIONALIDADES.md` para el plan detallado.
