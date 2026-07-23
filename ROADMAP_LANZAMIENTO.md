# 🚀 Roadmap de Lanzamiento — Sistema Ómicrom

> **Documento maestro del plan.** Fuente única de verdad para "terminar la app y sacarla al
> mercado". Está versionado en el repo a propósito: si en algún momento nos perdemos, volvemos
> acá. Última actualización: **2026-07-22**.

---

## 🧭 TL;DR — Estás más cerca de lo que crees

La app **ya está construida** en lo esencial: 9 pestañas funcionales, 17 Edge Functions,
55 migraciones, PWA instalable, realtime y legales listos. El código está **limpio**
(0 `TODO`/`FIXME` pendientes).

Lo que falta **no es "terminar de programar la app"**, sino **activar y validar** lo que ya
existe, y decidir con qué alcance sales al mercado. La decisión que más simplifica todo:

> **🎯 Lanzá primero SIN dinero real (economía de tokens cerrada / beta).**
> La monetización con Stripe está diseñada pero deliberadamente diferida (la propia migración
> `0053` dice *"NO activar hasta tener volumen de usuarios"*). No la necesitás para el primer
> lanzamiento. Esto quita del camino la parte más compleja y regulada (KYC, retiros, webhooks).

---

## 📊 Estado actual (auditoría 2026-07-22)

| Área | Estado | Notas |
|------|:------:|-------|
| Frontend (9 tabs) | ✅ Completo | Perfil, Academia, Market, Empleos, Wallet, Vault, Gobernanza, Chat, MaxSkill |
| Núcleo 3D + Oráculo voz | ✅ Completo | `HoloNucleo3D`, `OraculoBar` |
| Realtime (presencia/ranking/jobs) | ✅ Completo | Requiere migración `0047` aplicada |
| Edge Functions (IA + lógica) | ✅ 17 funciones | coach, tutor, examen-ia, arbiter-ai, ghost-approval, market-match… |
| Base de datos | ✅ 55 migraciones | idempotentes |
| PWA instalable | ✅ | manifest + service worker |
| Legales | ✅ | `POLITICA_PRIVACIDAD.md`, `TERMINOS_SERVICIO.md` |
| CI (typecheck/lint/test/build) | ⚠️ Verificar | Corre en cada push a `main` → ver acción F1 |
| **Pagos reales (Stripe)** | 🟡 **DB lista, falta glue** | Tablas + RPCs existen; **faltan** Edge Functions (checkout/webhook) y UI. **Diferido a propósito** |
| Monitoreo / observabilidad | ❌ Pendiente | Sin Sentry/logs centralizados |
| Docs de operación | 🟡 En reconstrucción | Este roadmap es el primero; faltan `PUESTA_EN_MARCHA.md`, `BITACORA_MAESTRA.md`, etc. |

---

## 🗺️ Las fases

### ✅ FASE 0 — Ya hecho
- [x] App funcional end-to-end (economía de tokens interna)
- [x] Realtime, PWA, IA, gobernanza, legales
- [x] CI configurado (GitHub Actions)

---

### 🔵 FASE 1 — Estabilidad técnica (base verde)
**Objetivo:** que `main` compile y pase todos los checks sin errores. Sin esto, no hay deploy confiable.

- [ ] **F1.1** — Verificar el estado del CI de `main`
      👉 https://github.com/paillamilm-blip/Sistema-omicrom/actions
      (Debe estar verde: Typecheck · Lint · Test · Build)
- [ ] **F1.2** — Si el CI falla, arreglar errores hasta dejarlo verde
- [ ] **F1.3** — Regenerar `package-lock.json` real desde tu máquina local y commitearlo
      (el CI hoy usa `npm install` como workaround; con el lock real se puede volver a `npm ci`)

**Criterio de "hecho":** badge de CI en verde en el último commit de `main`.

---

### 🔵 FASE 2 — Backend en vivo (Supabase productivo)
**Objetivo:** que la base y las funciones estén desplegadas y seguras en el proyecto Supabase real.

- [ ] **F2.1** — Aplicar todas las migraciones: `supabase db push` (verificar que llega a `0055`)
- [ ] **F2.2** — Confirmar migración `0047_realtime_publication` aplicada (ranking + jobs en vivo)
- [ ] **F2.3** — Desplegar Edge Functions:
      `supabase functions deploy <nombre>` para coach, tutor, examen-ia, arbiter-ai,
      market-match, ghost-approval, credential, embed, run-code, vault-oracle,
      chat-assist/history/send, carta-ia, simulador-universal, blackbox-open
- [ ] **F2.4** — Configurar secrets de las funciones (API key de IA, etc.):
      `supabase secrets set NOMBRE=valor`
- [ ] **F2.5** — Auditar RLS: cada tabla con datos de usuario debe tener políticas correctas
- [ ] **F2.6** — Programar el cron de `ghost-approval` (auto-liberación de contratos)

**Criterio de "hecho":** signup real funciona, ranking en vivo se actualiza, las funciones de IA responden.

---

### 🔵 FASE 3 — Beta cerrada (primer lanzamiento real)
**Objetivo:** usuarios reales usando la app con economía de tokens interna. **Sin Stripe todavía.**

- [ ] **F3.1** — Verificar variables de entorno en Vercel (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- [ ] **F3.2** — Deploy a producción (push a `main` → Vercel despliega automático)
- [ ] **F3.3** — Prueba de humo end-to-end: signup → convalidar Gemelo → publicar/tomar servicio → chat → gobernanza
- [ ] **F3.4** — Invitar a un grupo pequeño (5–20 personas)
- [ ] **F3.5** — Canal para reportar bugs (form / grupo)
- [ ] **F3.6** — Iterar sobre el feedback

**Criterio de "hecho":** al menos 5 usuarios completaron el flujo principal sin bloqueos.

---

### 🟡 FASE 4 — Observabilidad (antes de escalar)
**Objetivo:** enterarte de los errores antes que los usuarios.

- [ ] **F4.1** — Integrar captura de errores frontend (Sentry o similar)
- [ ] **F4.2** — Revisar logs de Edge Functions ante fallas
- [ ] **F4.3** — Métricas básicas (usuarios activos, signups, acciones clave)

---

### 🟡 FASE 5 — Monetización real (Stripe) — SOLO cuando haya volumen
**Objetivo:** conectar tokens ↔ dinero real. La DB ya está lista (`0053`); falta el "glue".

- [ ] **F5.1** — Edge Function `stripe-checkout` (crear PaymentIntent para recargas)
- [ ] **F5.2** — Edge Function `stripe-webhook` (confirmar pago → `credit_tokens_from_payment`)
- [ ] **F5.3** — UI de recarga de tokens en `WalletTab`
- [ ] **F5.4** — Flujo de retiro (`request_withdrawal` ya existe) + procesamiento de `withdrawal_requests`
- [ ] **F5.5** — KYC para retiros > $100.000 CLP (ya contemplado en la RPC)
- [ ] **F5.6** — Configurar secrets de Stripe (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`)
- [ ] **F5.7** — Probar en modo test de Stripe antes de activar en vivo

**Criterio de "hecho":** un usuario puede recargar tokens con tarjeta y ver el saldo acreditado.

---

### 🟢 FASE 6 — Go-to-market (crecimiento)
- [ ] **F6.1** — Landing / página pública de entrada
- [ ] **F6.2** — Onboarding pulido para el primer minuto del usuario
- [ ] **F6.3** — Estrategia de captación (redes, comunidades, referidos)
- [ ] **F6.4** — Documentos de apoyo: `ESTRATEGIA_LANZAMIENTO.md`, `COSTOS_OPERACION.md`

---

## 👉 PRÓXIMO PASO INMEDIATO

1. **Abrir el CI y ver si `main` está verde:**
   https://github.com/paillamilm-blip/Sistema-omicrom/actions
2. Si está **verde** → arrancamos **Fase 2** (desplegar backend en Supabase).
3. Si está **rojo** → me pasás el error (o lo reviso) y lo dejamos verde primero (**Fase 1**).

> Mi recomendación: apuntemos a **cerrar Fases 1→2→3** para tener una **beta real en la calle**
> lo antes posible, y **dejar Stripe (Fase 5) para después**. Ese es el camino más corto a
> "app terminada y en el mercado".

---

## 📌 Notas de decisiones (para no re-discutir)
- **Stripe diferido:** decisión de diseño, no un olvido. La estructura DB está lista para
  activarlo sin migraciones nuevas.
- **Lanzamiento por fases:** beta con tokens primero, dinero real después de validar demanda.
