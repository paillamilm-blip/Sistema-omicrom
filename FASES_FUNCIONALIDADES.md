# FASES Y FUNCIONALIDADES — Plan de Desarrollo Sistema Ómicron

> **Fecha:** 18 de julio de 2026
> **Objetivo:** Llevar el sistema de 40% real (estado actual) a producción completa.
> Cada fase es un hito desplegable que agrega valor verificable.

---

## VISIÓN GENERAL DE FASES

| Fase | Nombre | Duración | Objetivo | % Real al finalizar |
|------|--------|----------|----------|---------------------|
| 0 | Estado actual (post-rectificación) | — | Baseline | 40% |
| 1 | **Fundamento Operativo** | 2 semanas | Triggers SQL + Edge Functions básicas | 62% |
| 2 | **Economía Funcional** | 3 semanas | Escrow + matching real + tokens operativos | 75% |
| 3 | **Ecosistema Completo** | 4 semanas | Bóveda avanzada + Justicia + Examinador IA | 88% |
| 4 | **Escalabilidad y Blockchain** | 6 semanas | SBT + Chainlink + Human Passport + pasarela | 95%+ |

---

## FASE 1: FUNDAMENTO OPERATIVO (2 semanas)

**Meta:** Que la reputación se calcule en tiempo real a partir de evidencia real.

### Funcionalidades a entregar

| # | Funcionalidad | Tipo | Dependencia | Esfuerzo |
|---|---|---|---|---|
| 1.1 | Desplegar migración `0007_protect_profile_columns.sql` | SQL Deploy | Acceso a Supabase Dashboard | 30 min |
| 1.2 | Desplegar migración `0015_foundation_from_skills.sql` | SQL Deploy | Tabla `skill_tree_nodes` existente | 30 min |
| 1.3 | Desplegar migración `0016_execution_from_contracts.sql` | SQL Deploy | Tabla `contracts` existente | 30 min |
| 1.4 | Desplegar migración `0017_quality_from_ratings.sql` | SQL Deploy | Crear tabla `contract_ratings` | 1 día |
| 1.5 | Desplegar migración `0018_transcendence.sql` | SQL Deploy | Tablas market/vault existentes | 30 min |
| 1.6 | Desplegar migración `0048_convalidar_credencial.sql` | SQL Deploy | Ninguna | 30 min |
| 1.7 | Desplegar migración `0050_reputacion_canonica.sql` | SQL Deploy | Todas las anteriores | 30 min |
| 1.8 | Crear tabla `contract_ratings` | SQL | Tabla `contracts` | 2 horas |
| 1.9 | Edge Function `coach` (Gemini) | Supabase EF | API key Gemini/OpenAI | 2 días |
| 1.10 | Edge Function `examiner` (generar examen + evaluar) | Supabase EF | API key IA | 3 días |
| 1.11 | RPC `award_pe` (SECURITY DEFINER) para otorgar PE | SQL | Ninguna | 4 horas |
| 1.12 | Test de integración: contrato RELEASED → execution sube | Test | 1.3 desplegado | 4 horas |
| 1.13 | Test: validar nodo skill → foundation sube | Test | 1.2 desplegado | 4 horas |

### Entregable
- La reputación de un usuario **cambia automáticamente** cuando completa un contrato, recibe calificación, valida un nodo, o publica en la Bóveda.
- El Oráculo Coach IA devuelve consejos reales basados en el Gemelo.

### Equipo necesario
- 1 Backend/DBA (SQL + Supabase Edge Functions)
- 1 QA (tests de integración)

---

## FASE 2: ECONOMÍA FUNCIONAL (3 semanas)

**Meta:** Que el dinero y los tokens fluyan de forma real y segura.

### Funcionalidades a entregar

| # | Funcionalidad | Tipo | Dependencia | Esfuerzo |
|---|---|---|---|---|
| 2.1 | Flujo de Escrow completo (crear → lock → deliver → approve/dispute → release) | Frontend + SQL | Fase 1 | 5 días |
| 2.2 | Ghost Approval timer (15 min → auto-aprobación) | Edge Function (cron) | Escrow | 2 días |
| 2.3 | Motor de matching server-side (trigger al INSERT en `job_postings`) | SQL trigger + RPC | Fase 1 | 3 días |
| 2.4 | Push real-time de nuevas ofertas (suscripción a `job_postings` INSERT) | Frontend | 2.3 | 1 día |
| 2.5 | UI de calificación post-contrato (1-5 estrellas + review) | Frontend | Tabla `contract_ratings` | 2 días |
| 2.6 | Transferencia de tokens entre usuarios | RPC SECURITY DEFINER | Ninguna | 1 día |
| 2.7 | Compra de servicios con tokens (Market) | Frontend + RPC | 2.6 | 2 días |
| 2.8 | Depreciación de tokens inactivos (cron mensual) | Edge Function scheduled | Ninguna | 1 día |
| 2.9 | Ranking global en vivo (top 50 por reputación) | Frontend + query | `profiles` con index | 1 día |
| 2.10 | Notificación push de match alto (INSERT en `job_matches`) | Supabase postgres_changes | 2.3 | 4 horas |

### Entregable
- Un freelancer puede: recibir oferta → negociar en chat → firmar contrato con escrow → entregar → cobrar tokens.
- El comprador puede calificar → eso mueve el eje Calidad del vendedor → su reputación cambia en vivo.
- Ranking visible para todos.

### Equipo necesario
- 1 Backend (Escrow + triggers)
- 1 Frontend (UI de flujo de contrato + calificación)
- 1 QA

---

## FASE 3: ECOSISTEMA COMPLETO (4 semanas)

**Meta:** Activar Bóveda avanzada, Justicia distribuida y Examinador IA.

### Funcionalidades a entregar

| # | Funcionalidad | Tipo | Dependencia | Esfuerzo |
|---|---|---|---|---|
| 3.1 | Regalías encadenadas (tabla `content_lineage` + cálculo por profundidad) | SQL + Edge Function | Fase 2 | 5 días |
| 3.2 | Detección de similitud con pgvector (embedding al publicar en Bóveda) | Edge Function + SQL | pgvector habilitado | 4 días |
| 3.3 | Depreciación H-07 de activos de conocimiento | Edge Function scheduled | Bóveda | 2 días |
| 3.4 | Flujo completo de Disputas (abrir → asignar árbitros → votar → fallo) | Frontend + SQL + EF | Escrow (Fase 2) | 7 días |
| 3.5 | Penalizaciones automáticas (PMC → rep baja + tokens) | SQL trigger | 3.4 | 2 días |
| 3.6 | Proceso de Apelación (7 días, panel senior) | Frontend + SQL | 3.4 | 3 días |
| 3.7 | Examinador IA funcional (generar → resolver → evaluar → acta) | Frontend + Edge Function | EF `examiner` (Fase 1) | 5 días |
| 3.8 | PE reales otorgados por examen aprobado (RPC `award_pe`) | SQL | 3.7 + Fase 1.11 | 1 día |
| 3.9 | Mentor matching (conectar N3+ con N1 por área de skill) | Frontend + query | Árbol de habilidades | 3 días |
| 3.10 | Notificaciones tipadas (JOB_MATCH, DISPUTE, CONTRACT, etc.) completas | Backend + Frontend | Tabla `notifications` | 2 días |

### Entregable
- La Bóveda genera regalías reales cuando alguien reutiliza contenido.
- Un usuario puede abrir una disputa → 3 árbitros votan → se ejecuta automáticamente.
- El Examinador IA genera exámenes reales y al aprobar sube Fundamento + PE.
- Sistema de mentorías funcional.

### Equipo necesario
- 2 Backend (uno para justicia/regalías, otro para IA/examinador)
- 1 Frontend
- 1 QA

---

## FASE 4: ESCALABILIDAD Y BLOCKCHAIN (6 semanas)

**Meta:** Portabilidad on-chain, verificación de identidad y pagos reales.

### Funcionalidades a entregar

| # | Funcionalidad | Tipo | Dependencia | Esfuerzo |
|---|---|---|---|---|
| 4.1 | Smart Contract GemeloDigitalSBT (Solidity, Base/Polygon) | Blockchain | Auditoría de contrato | 10 días |
| 4.2 | Mint SBT al crear perfil (via backend autorizado) | Edge Function + Ethers.js | 4.1 | 3 días |
| 4.3 | Anchoring periódico (offchainStateHash) via Chainlink Automation | Chainlink | 4.1 | 5 días |
| 4.4 | Verificación pública de reputación on-chain | Frontend (read contract) | 4.1 | 2 días |
| 4.5 | Human Passport integration (Worldcoin/PoH) | API + Frontend | Fase 3 | 5 días |
| 4.6 | Pasarela de pago real (Stripe Connect / MercadoPago) | Backend + Frontend | KYC/legal | 10 días |
| 4.7 | KYC para retiros de dinero real | Proveedor externo + EF | 4.6 | 5 días |
| 4.8 | Suscripciones Premium (talento y empresa) | Stripe + RPC | 4.6 | 4 días |
| 4.9 | Dashboard empresa (búsqueda por Gemelo, contratación masiva) | Frontend nuevo | Fase 2-3 | 8 días |
| 4.10 | Fragmentación de canales Realtime (por cohorte/región) | Backend | >1000 usuarios simultáneos | 3 días |
| 4.11 | App móvil nativa (React Native / Capacitor) | Mobile | PWA existente | 15 días |

### Entregable
- La reputación es portable (verificable on-chain por cualquier tercero).
- Los usuarios pueden cobrar dinero real por contratos.
- Las empresas tienen un dashboard de contratación.
- Identidad verificada con Human Passport.

### Equipo necesario
- 1 Blockchain dev (Solidity + Chainlink)
- 1 Backend senior (pagos + KYC)
- 1 Frontend
- 1 Mobile dev (si se hace app nativa)
- Asesoría legal (KYC, boletas, tributación)

---

## DEPENDENCIAS TRANSVERSALES

| Dependencia | Necesaria para | Cómo obtenerla |
|---|---|---|
| **API key de IA** (Gemini/OpenAI) | Fases 1-3 (Coach, Examiner, Similarity) | Google AI Studio o OpenAI Dashboard |
| **Supabase CLI** acceso | Todas las fases | `supabase login` + proyecto vinculado |
| **pgvector** habilitado | Fase 3 (Bóveda embeddings) | `CREATE EXTENSION vector` en Supabase |
| **Cuenta Chainlink** | Fase 4 | https://automation.chain.link |
| **Stripe Connect** | Fase 4 | Registro empresarial + verificación |
| **Asesoría legal** | Fase 4 (KYC, impuestos) | Abogado comercial + contador |

---

## PRESUPUESTO ESTIMADO DE INFRAESTRUCTURA (mensual)

| Fase | Supabase | IA (Gemini/OpenAI) | Blockchain | Pasarela | Total |
|------|----------|-------|------------|----------|-------|
| 1 | $25 (Pro) | $10-30 | $0 | $0 | ~$55 |
| 2 | $25 | $30-50 | $0 | $0 | ~$75 |
| 3 | $75 (más storage) | $50-100 | $0 | $0 | ~$175 |
| 4 | $75 | $100 | $20-50 (gas) | $0 (Stripe cobra %) | ~$245 |

---

## CRONOGRAMA VISUAL

```
Semana:  1   2   3   4   5   6   7   8   9  10  11  12  13  14  15
         ├───────┤
         FASE 1: Fundamento Operativo
                 ├───────────┤
                 FASE 2: Economía Funcional
                             ├───────────────┤
                             FASE 3: Ecosistema Completo
                                             ├───────────────────────┤
                                             FASE 4: Escalabilidad + Blockchain
```

**Total estimado:** 15 semanas (3.5 meses) para 95%+ funcional.
**MVP desplegable (Fase 1+2):** 5 semanas para tener el loop completo de aprender→trabajar→ganar→reputación.

---

## MÉTRICAS DE ÉXITO POR FASE

| Fase | KPI de validación |
|------|-------------------|
| 1 | Reputación de un usuario cambia automáticamente al completar contrato |
| 2 | Un freelancer cobra tokens por un trabajo entregado y calificado |
| 3 | Una disputa se resuelve sin intervención manual de admin |
| 4 | Un tercero verifica reputación on-chain sin acceso a Ómicron |

---

*Documento generado como referencia para planificación de sprints.*
