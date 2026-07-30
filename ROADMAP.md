# 🗺️ Roadmap — Sistema Omicrom

> **Versión 1.0 — 30 de julio de 2026**
>
> Este documento presenta el roadmap completo del proyecto con timeline,
> dependencias entre tareas, y milestones de negocio. Es el complemento
> estratégico de [`PLAN_PRODUCCION.md`](./PLAN_PRODUCCION.md) (que lleva el
> detalle operativo tarea por tarea).

---

## 📍 Dónde estamos hoy (julio 2026)

```
[████████████░░░░░░░░] ~60% del producto core implementado
```

**Lo que YA funciona:**
- Plataforma desplegada en Vercel (PWA instalable)
- 6 hubs de navegación activos
- 7 funciones de IA gratuitas (Coach, Tutor, Examinador, Carta, Redactor, Relator, Oráculo)
- Sistema de reputación canónico (4 ejes + momentum) con cálculo server-side
- Red en tiempo real (Presence + Broadcast + rankings en vivo)
- 63 migraciones SQL + 21 Edge Functions
- 82 tests unitarios de libs core
- Orbe unificado con nodos arrastrables

**Lo que FALTA para producción real:**
- Activar Stripe (pagos reales)
- Cerrar UX móvil (problemas reportados sin resolver)
- Verificar Tribunal de Pares end-to-end
- Unificar design system duplicado

---

## 🎯 Milestones principales

| Milestone | Cuándo | Qué marca |
|-----------|--------|-----------|
| **M1 — Producción estable** | Agosto 2026 | Stripe activo, UX móvil cerrada, Tribunal verificado |
| **M2 — Primeros usuarios reales** | Septiembre 2026 | 50+ usuarios con Gemelo activo, primeros contratos ejecutados |
| **M3 — Auto-postulación** | Octubre 2026 | "El trabajo te busca" funciona end-to-end (Agentic AI) |
| **M4 — Credencial verificable** | Noviembre 2026 | Pasaporte Gemelo como W3C Verifiable Credential |
| **M5 — Escala** | Q1 2027 | Auditoría de seguridad, accesibilidad, lazy-load |
| **M6 — On-chain** | Q2 2027 | SBT desplegado en testnet/mainnet con tracción real |

---

## 📅 Timeline detallado

### 🔴 Agosto 2026 — Cerrar lo pendiente (Milestone M1)

**Objetivo:** Producto usable en producción real, sin fricciones críticas.

```
Semana 1-2: UX + Design System
├── [E.6] Confirmar interacción táctil en celular real
├── [E.7] Relevar y corregir problemas de UX restantes
├── [0.4] Unificar theme.ts ↔ design-system/tokens.ts
└── [E.8] Remover dependencia gsap huérfana

Semana 3-4: Producción + Verificación
├── [1.2] Activar Stripe en producción (modo test → live)
├── [1.4] Verificar Tribunal de Pares end-to-end
└── Smoke test completo de todos los flujos
```

**Dependencias:**
- E.6/E.7 requieren feedback del usuario con capturas reales
- 1.2 requiere configuración manual de claves (ver `GUIA_ACTIVACION_PRODUCCION.md`)
- 0.4 es prerequisito para cualquier trabajo de UI posterior (evita duplicación)

**Entregable:** App lista para recibir usuarios reales con pagos funcionando.

---

### 🟡 Septiembre 2026 — Primeros usuarios (Milestone M2)

**Objetivo:** Validar el producto con usuarios reales y obtener feedback.

```
├── Onboarding de primeros 50 usuarios (beta cerrada)
├── Monitoreo con Sentry (errores reales)
├── Iterar UX según feedback real
├── Primer contrato ejecutado con escrow
└── Primer ciclo completo: aprender → reputación → oportunidad
```

**Dependencias:**
- M1 completado (Stripe + UX estable)
- Comunicación/marketing inicial (fuera del scope técnico)

**Entregable:** Datos reales de uso, primer ciclo de valor demostrado.

---

### 🟢 Octubre–Noviembre 2026 — Fase 2: Innovaciones (Milestones M3, M4)

**Objetivo:** Diferenciadores de mercado que no tiene nadie más.

```
Octubre (M3 — Auto-postulación):
├── [2.1] Auto-postulación: Ómicron postula por ti (Agentic AI)
│   ├── Definir umbral de match para auto-postulación
│   ├── Edge Function para matching automático
│   └── Notificación al usuario + confirmación
├── [2.3] Matching server-side en tiempo real
│   ├── Trigger on INSERT en job_postings
│   └── Push notification a candidatos que matchean
└── Iterar según feedback de M2

Noviembre (M4 — Credencial verificable):
├── [2.2] Pasaporte Gemelo como W3C Verifiable Credential
│   ├── Implementar JSON-LD según Open Badges 3.0
│   ├── Endpoint de emisión (Edge Function)
│   └── UI para exportar/compartir credencial
├── [2.4] Evaluación de código en vivo
│   ├── Sandbox de ejecución seguro (Edge Function + run-code)
│   └── Integrar con examen de nivel
└── [2.5] Preparar offchainStateHash
    ├── Generar hash del estado completo del Gemelo
    └── Almacenar para futuro anchoring on-chain
```

**Dependencias:**
- 2.1 y 2.3 dependen de M2 (necesitan ofertas y usuarios reales para probar)
- 2.2 puede desarrollarse en paralelo (no depende de usuarios activos)
- 2.4 depende de Edge Function `run-code` existente
- 2.5 es preparación — no requiere contrato desplegado

---

### 🔵 Q1 2027 — Fase 3: Escala y pulido (Milestone M5)

**Objetivo:** Preparar para crecimiento real.

```
Enero:
├── [3.1] Lazy-load de engines pesados
├── [3.2] Accesibilidad completa (WCAG 2.1 AA)
└── Performance audit (Lighthouse ≥ 90)

Febrero:
├── [3.3] Auditoría de seguridad formal
│   ├── Pen-testing de Edge Functions
│   ├── Revisión de RLS policies
│   └── Verificación de rate limiting bajo carga
└── [3.6] Revisión legal (Términos + Privacidad → global)

Marzo:
├── [3.5] Multi-idioma (si hay demanda)
└── Estabilización y bug fixes post-auditoría
```

**Dependencias:**
- 3.3 (seguridad) es BLOQUEANTE para escalar tráfico
- 3.6 (legal) es BLOQUEANTE para marketing fuera de Chile
- 3.2 (accesibilidad) debe completarse antes de multi-idioma

---

### 🟣 Q2 2027 — On-chain (Milestone M6)

**Objetivo:** Reputación verificable en blockchain.

```
Abril–Mayo:
├── [3.4] Desplegar GemeloDigitalSBT
│   ├── Elegir cadena (Base / Polygon / otra L2)
│   ├── Auditar smart contract
│   ├── Deploy en testnet + pruebas
│   └── Deploy en mainnet
├── Integración Chainlink Automation (anchoring periódico)
└── UI para ver el SBT y verificar on-chain

Junio:
├── Integración Human Passport (verificación de humanidad)
└── Gobernanza on-chain (staking para árbitros N4+)
```

**Dependencias:**
- Requiere tracción real (M2 validado + usuarios activos)
- Requiere auditoría de seguridad completada (M5)
- Requiere presupuesto para gas y mantenimiento del contrato

---

## 🔗 Mapa de dependencias

```
M1 (Producción)
 │
 ├──→ M2 (Usuarios reales)
 │     │
 │     ├──→ M3 (Auto-postulación) ──→ M5 (Escala)
 │     │                                  │
 │     └──→ M4 (Credencial W3C)           └──→ M6 (On-chain)
 │
 └──→ Stripe activo (prerequisito para M2)
```

---

## ⚠️ Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| UX móvil no se resuelve (falta feedback del usuario) | Bloquea M1 | Pedir capturas concretas, priorizar los 3 flows más críticos |
| Stripe no se activa (el usuario no configura las claves) | Bloquea M2 | La guía paso a paso ya existe (`GUIA_ACTIVACION_PRODUCCION.md`) |
| No llegan usuarios a la beta | Retrasa M2 | Preparar onboarding guiado, seed con comunidad existente |
| Auditoría de seguridad encuentra vulnerabilidades graves | Retrasa M5/M6 | Las 63 migraciones ya tienen RLS + triggers `SECURITY DEFINER` |
| Gas costs on-chain demasiado altos | Retrasa M6 | Elegir L2 (Base/Polygon) con fees < $0.01 por tx |

---

## 📊 Métricas de éxito por milestone

| Milestone | KPI | Target |
|-----------|-----|--------|
| M1 | Smoke test pasa sin errores | 100% flujos críticos OK |
| M2 | Usuarios con Gemelo activo | ≥ 50 |
| M2 | Primer contrato con escrow completado | ≥ 1 |
| M3 | Auto-postulaciones generadas | ≥ 10/semana |
| M4 | Credenciales W3C emitidas | ≥ 20 |
| M5 | Lighthouse Performance score | ≥ 90 |
| M5 | Vulnerabilidades críticas post-auditoría | 0 |
| M6 | SBTs minteados en mainnet | ≥ 100 |

---

## 📚 Documentos relacionados

| Documento | Rol |
|-----------|-----|
| [`PLAN_PRODUCCION.md`](./PLAN_PRODUCCION.md) | Detalle operativo: tareas, PRs, estado tarea por tarea |
| [`DEFINICION_OMICROM.md`](./DEFINICION_OMICROM.md) | Visión y definición del producto |
| [`DEFINICION_OMICROM_v8_BACKEND.md`](./DEFINICION_OMICROM_v8_BACKEND.md) | Arquitectura objetivo (con anotaciones de estado) |
| [`DEFINICION_REPUTACION_OMICROM.md`](./DEFINICION_REPUTACION_OMICROM.md) | Fórmula canónica del Gemelo Digital |
| [`CHANGELOG.md`](./CHANGELOG.md) | Historial de cambios por versión |
| [`GUIA_ACTIVACION_PRODUCCION.md`](./GUIA_ACTIVACION_PRODUCCION.md) | Pasos para activar producción |

---

_Este roadmap se revisa mensualmente o cuando cambia una decisión de negocio importante._
