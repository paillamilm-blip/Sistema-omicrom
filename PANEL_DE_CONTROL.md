# 🎛️ Panel de Control · Claves y secretos de Ómicron

> **Este archivo NO contiene claves.** Solo te dice **dónde** pegar cada una y te
> deja marcar lo que ya hiciste. Es seguro tenerlo en el repositorio.
>
> ⚠️ **NUNCA** escribas una clave real dentro de este archivo. Las claves van
> **únicamente** en los paneles de Vercel y Supabase (ver más abajo). Si escribes
> una clave aquí y se sube a GitHub, quedará expuesta para siempre.

---

## 🏦 Caja fuerte 1 · VERCEL (claves del frontend)

📍 **Dónde pegar:** Vercel → tu proyecto **Sistema-omicrom** → **Settings → Environment Variables**
🔗 https://vercel.com/dashboard
🔁 **Después de agregar o cambiar cualquiera → Deployments → Redeploy**

| ✅ | Variable (nombre EXACTO) | Qué pegas | ¿Obligatoria? |
|----|--------------------------|-----------|----------------|
| ☐ | `VITE_STRIPE_ENABLED` | la palabra `true` | Sí (para vender tokens) |
| ☐ | `VITE_SENTRY_DSN` | tu DSN de Sentry (empieza con `https://...sentry.io/...`) | Recomendada |
| ☐ | `VITE_ANALYTICS_DOMAIN` | tu dominio, ej. `sistema-omicrom.vercel.app` | Opcional |

---

## 🏦 Caja fuerte 2 · SUPABASE (secretos del backend)

📍 **Dónde pegar:** Supabase → **Project Settings → Edge Functions → Secrets**
🔗 https://supabase.com/dashboard/project/cuwuyqpxaibbqjrvamjb/settings/functions

| ✅ | Secreto (nombre EXACTO) | Qué pegas | ¿Obligatorio? |
|----|-------------------------|-----------|----------------|
| ☐ | `STRIPE_SECRET_KEY` | tu clave de Stripe (`sk_test_...` o `sk_live_...`) | Sí (para pagos) |
| ☐ | `STRIPE_WEBHOOK_SECRET` | secreto del webhook (`whsec_...`) | Sí (para pagos) |
| ☐ | `PUBLIC_SITE_URL` | la URL de tu app, ej. `https://sistema-omicrom.vercel.app` | Sí (para pagos) |
| ☐ | `GEMINI_API_KEY` | clave de Google Gemini (para la IA) | Ya configurada |

---

## 🔑 De dónde saco cada clave

| Clave | De dónde la obtienes |
|-------|----------------------|
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys → **Secret key** · https://dashboard.stripe.com/test/apikeys |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → Webhooks → tu endpoint → **Signing secret** · https://dashboard.stripe.com/test/webhooks |
| `VITE_SENTRY_DSN` | Sentry → Settings → Projects → tu proyecto → **Client Keys (DSN)** · https://sentry.io |
| `VITE_ANALYTICS_DOMAIN` | El dominio de tu sitio (Plausible / tu dominio propio) |
| `PUBLIC_SITE_URL` | La URL pública de tu app (la de Vercel o tu dominio) |

---

## 🔗 Dato clave para Stripe

**URL del webhook** (pégala en Stripe → Webhooks → Add endpoint):

```
https://cuwuyqpxaibbqjrvamjb.supabase.co/functions/v1/stripe-webhook
```

**Evento a escuchar:** `checkout.session.completed`

---

## ✅ Checklist maestro (marca a medida que avanzas)

**Publicar cambios**
- [ ] Mergeé el PR #80 (seguridad + observabilidad + tests)
- [ ] Mergeé el PR #81 (Stripe + límite de IA)
- [ ] Mergeé el PR #82 (guía paso a paso)
- [ ] Corrí en mi Mac: `cd ~/Downloads/Sistema-omicrom && git checkout main && git pull origin main`

**Stripe (modo prueba primero)**
- [ ] Pegué `STRIPE_SECRET_KEY` (test) en Supabase
- [ ] Creé el webhook en Stripe con la URL de arriba
- [ ] Pegué `STRIPE_WEBHOOK_SECRET` (test) en Supabase
- [ ] Pegué `PUBLIC_SITE_URL` en Supabase
- [ ] Pegué `VITE_STRIPE_ENABLED=true` en Vercel + Redeploy
- [ ] Probé un pago con la tarjeta `4242 4242 4242 4242` y llegaron los tokens
- [ ] Cambié a modo real (`sk_live_...` + `whsec_...` live) cuando ya funcionó

**Extras recomendados**
- [ ] Pegué `VITE_SENTRY_DSN` en Vercel + Redeploy (monitoreo de errores)
- [ ] Configuré SMTP con Resend en Supabase (correos de registro)
- [ ] Confirmé que el "Connection pooling" está activado en Supabase
- [ ] Activé "Leaked password protection" en Supabase

---

## 🧠 Reglas de oro anti-errores

1. **Los nombres van EXACTOS**, en MAYÚSCULAS, sin espacios (ej. `STRIPE_SECRET_KEY`, no `stripe secret key`).
2. **Stripe: clave y webhook del mismo modo.** Ambos de prueba, o ambos reales. Nunca mezclados.
3. **En Vercel, siempre Redeploy** después de tocar una variable, o el cambio no aplica.
4. **Nunca** pegues una clave en este archivo, en el chat, ni en el código. Solo en las dos cajas fuertes.

---

## 📖 Guía detallada

Para el paso a paso con capturas y solución de errores, mira **`GUIA_ACTIVACION_PRODUCCION.md`** en este mismo repositorio.
