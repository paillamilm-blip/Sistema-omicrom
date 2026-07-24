# 🚀 Guía anti-errores: activar Ómicron en producción

Esta guía es **clic por clic**. No necesitas saber programar. Sigue el orden tal cual.
Cada sección termina con una casilla de verificación ✅ para que sepas que quedó bien.

> **Consejo de oro:** haz una cosa a la vez. No saltes pasos. Si algo no se ve
> igual que aquí, detente y no adivines — mejor pregunta.

---

## 🗺️ Mapa general (qué vamos a hacer)

| Paso | Qué activas | ¿Obligatorio? | Dónde |
|------|-------------|---------------|-------|
| 1 | Mergear los cambios (PR #80 y #81) | ✅ Sí | GitHub |
| 2 | Pagos con Stripe | ✅ Sí (para vender tokens) | Stripe + Supabase + Vercel |
| 3 | Monitoreo de errores (Sentry) | ⭐ Recomendado | Sentry + Vercel |
| 4 | Analítica de uso (Plausible) | ⭐ Opcional | Vercel |
| 5 | Correos (SMTP) | ✅ Sí (para registro/recuperar clave) | Supabase |
| 6 | Pooler de conexiones | ⭐ Recomendado | Supabase |
| 7 | Protección de contraseñas filtradas | ⭐ Recomendado | Supabase |
| 8 | Verificación final | ✅ Sí | Tu app |

---

## PASO 1 · Mergear los cambios (GitHub)

Esto publica todo el trabajo nuevo en tu rama principal.

1. Entra a **https://github.com/paillamilm-blip/Sistema-omicrom/pulls**
2. Abre el **PR #80** ("Producción P1: seguridad DB, observabilidad y tests").
   - Botón verde **"Merge pull request"** → **"Confirm merge"**.
3. Abre el **PR #81** ("Pagos: compra de tokens con Stripe...").
   - Botón verde **"Merge pull request"** → **"Confirm merge"**.

> Si un botón aparece gris y dice "checks in progress", espera 2–3 minutos a que
> termine la verificación automática (CI) y vuelve a intentar.

**Actualiza tu copia en el Mac** (abre la Terminal y pega):

```bash
cd ~/Downloads/Sistema-omicrom && git checkout main && git pull origin main
```

✅ **Listo cuando:** los dos PR digan "Merged" (morado) y tu Vercel muestre un nuevo despliegue.

---

## PASO 2 · Pagos con Stripe (lo más importante)

Vamos a conectar Stripe para que la gente pueda **comprar tokens con tarjeta**.
Haremos primero todo en **modo prueba** (sin dinero real) y luego pasamos a real.

### 2.1 · Crear tu cuenta de Stripe

1. Entra a **https://dashboard.stripe.com/register** y crea tu cuenta.
2. Confirma tu correo.
3. Arriba a la derecha, deja activado el **"Modo de prueba" / "Test mode"** (interruptor).
   👉 Así probamos sin cobrar de verdad.

### 2.2 · Copiar tu clave secreta

1. Ve a **https://dashboard.stripe.com/test/apikeys**
2. Verás **"Clave secreta" / "Secret key"**. Haz clic en **"Revelar" / "Reveal"**.
3. **Cópiala completa.** Empieza con `sk_test_...`
   - ⚠️ **NUNCA** pegues esta clave en el navegador, en el chat público, ni en el frontend.
   - Es como la llave de tu caja fuerte.

### 2.3 · Crear el webhook (el "aviso de pago")

El webhook es lo que le dice a tu app "este usuario pagó, dale sus tokens".

1. Ve a **https://dashboard.stripe.com/test/webhooks**
2. Botón **"Agregar endpoint" / "Add endpoint"**.
3. En **"URL del endpoint"** pega EXACTAMENTE esto:

   ```
   https://cuwuyqpxaibbqjrvamjb.supabase.co/functions/v1/stripe-webhook
   ```

4. En **"Seleccionar eventos" / "Select events"**, busca y marca **solo**:

   ```
   checkout.session.completed
   ```

5. Guarda con **"Agregar endpoint" / "Add endpoint"**.
6. Ahora entra al endpoint que creaste. Busca **"Secreto de firma" / "Signing secret"**
   → **"Revelar"** → **cópialo**. Empieza con `whsec_...`

### 2.4 · Guardar los secretos en Supabase

1. Entra a **https://supabase.com/dashboard/project/cuwuyqpxaibbqjrvamjb/settings/functions**
   (Menú: **Project Settings → Edge Functions → Secrets**).
2. Con **"Add new secret"** agrega estos **tres**, uno por uno (Name = Value):

   | Name (nombre exacto) | Value (valor) |
   |----------------------|----------------|
   | `STRIPE_SECRET_KEY` | tu clave `sk_test_...` |
   | `STRIPE_WEBHOOK_SECRET` | tu secreto `whsec_...` |
   | `PUBLIC_SITE_URL` | la URL de tu app, ej. `https://sistema-omicrom.vercel.app` |

   - ⚠️ Copia los nombres **tal cual**, sin espacios, en MAYÚSCULAS.
   - Guarda cada uno con **"Save"**.

### 2.5 · Encender el botón en la app (Vercel)

1. Entra a **https://vercel.com** → tu proyecto **Sistema-omicrom**.
2. Menú **Settings → Environment Variables**.
3. Agrega esta variable:

   | Name | Value | Environments |
   |------|-------|--------------|
   | `VITE_STRIPE_ENABLED` | `true` | Production, Preview, Development |

4. Guarda y ve a **Deployments** → en el último, menú **···** → **Redeploy**.

### 2.6 · Probar el pago (modo prueba, sin dinero real)

1. Abre tu app y entra a la **Billetera**.
2. Debe aparecer el botón dorado **"Recargar tokens"**. Haz clic.
3. Elige un paquete y **"Ir a pagar"**.
4. En la pantalla de Stripe usa esta **tarjeta de prueba**:
   - Número: `4242 4242 4242 4242`
   - Fecha: cualquiera futura (ej. `12/34`)
   - CVC: cualquiera (ej. `123`)
   - Nombre/país: cualquiera.
5. Paga. Deberías volver a la app y ver el mensaje **"¡Pago recibido!"** y, en unos
   segundos, tus tokens sumados en el saldo.

✅ **Listo cuando:** te llegan los tokens de prueba a la billetera.

### 2.7 · Pasar a dinero real (cuando ya probaste)

1. En Stripe, **apaga** el "Modo de prueba".
2. Repite **2.2** y **2.3** pero en modo real → obtendrás una `sk_live_...` y un
   `whsec_...` nuevos (los de real son distintos a los de prueba).
3. Actualiza en Supabase (paso 2.4) `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET`
   con los valores **live**.
4. Stripe pedirá "activar tu cuenta" (datos de tu negocio/RUT para recibir pagos).
   Completa eso para poder retirar el dinero.

> ⚠️ **Error típico:** dejar la clave de prueba (`sk_test`) con el webhook real, o
> viceversa. La clave y el webhook deben ser **del mismo modo** (ambos test, o ambos live).

---

## PASO 3 · Monitoreo de errores con Sentry (recomendado)

Sirve para que, si algo falla en la app de un usuario, tú te enteres al instante.

1. Crea cuenta en **https://sentry.io/signup/** (plan gratis alcanza para partir).
2. Crea un proyecto tipo **"React"**.
3. Sentry te mostrará un **DSN** (una URL larga que empieza con `https://...@...ingest...sentry.io/...`). **Cópiala.**
4. En **Vercel → Settings → Environment Variables** agrega:

   | Name | Value |
   |------|-------|
   | `VITE_SENTRY_DSN` | el DSN que copiaste |

5. **Redeploy** (igual que en 2.5).

✅ **Listo cuando:** en Sentry ves que llega el primer evento tras usar la app.
> Si dejas esta variable vacía, simplemente no se activa nada. Cero riesgo.

---

## PASO 4 · Analítica de uso con Plausible (opcional)

Sirve para ver cuánta gente usa la app, sin invadir su privacidad.

1. Crea cuenta en **https://plausible.io** y agrega tu sitio (tu dominio, ej. `sistema-omicrom.vercel.app`).
2. En **Vercel → Environment Variables** agrega:

   | Name | Value |
   |------|-------|
   | `VITE_ANALYTICS_DOMAIN` | tu dominio, ej. `sistema-omicrom.vercel.app` |

3. **Redeploy**.

✅ **Listo cuando:** en Plausible ves visitas en tiempo real.

---

## PASO 5 · Correos (SMTP) en Supabase

Sin esto, los correos de "confirmar registro" y "recuperar contraseña" pueden no
llegar o caer en spam. Lo más fácil y confiable es usar **Resend**.

### 5.1 · Crear cuenta de correo con Resend

1. Crea cuenta en **https://resend.com** (tiene plan gratis).
2. Ve a **API Keys → Create API Key** y copia la clave (empieza con `re_...`).
3. (Recomendado) En **Domains**, agrega y verifica tu dominio para que los correos
   salgan desde `no-reply@tudominio.cl`. Si aún no tienes dominio, puedes empezar
   con el remitente de prueba de Resend.

### 5.2 · Configurar SMTP en Supabase

1. Entra a **https://supabase.com/dashboard/project/cuwuyqpxaibbqjrvamjb/auth/templates**
   y luego a **Authentication → Emails → SMTP Settings** (botón **"Enable Custom SMTP"**).
2. Completa con los datos de Resend:

   | Campo | Valor |
   |-------|-------|
   | Host | `smtp.resend.com` |
   | Port | `465` |
   | Username | `resend` |
   | Password | tu API key `re_...` |
   | Sender email | `no-reply@tudominio.cl` (o el remitente de Resend) |
   | Sender name | `Ómicron` |

3. Guarda con **"Save"**.

✅ **Listo cuando:** te registras con un correo tuyo y llega el email de confirmación.

---

## PASO 6 · Pooler de conexiones (recomendado)

Ayuda a que la base de datos aguante muchos usuarios a la vez.

1. Entra a **https://supabase.com/dashboard/project/cuwuyqpxaibbqjrvamjb/settings/database**
2. Busca la sección **"Connection pooling"**. Debe estar **activado** (Supabase lo trae
   activado por defecto en modo **Transaction**). Si aparece apagado, actívalo.
3. No necesitas cambiar nada más si tu app ya funciona: es solo confirmar que está ON.

✅ **Listo cuando:** ves "Connection pooling: Enabled".

---

## PASO 7 · Protección contra contraseñas filtradas

Evita que la gente use contraseñas que ya fueron robadas en otras webs.

1. Entra a **https://supabase.com/dashboard/project/cuwuyqpxaibbqjrvamjb/auth/providers**
2. Ve a **Authentication → Policies / Password settings**.
3. Activa **"Leaked password protection"** (protección de contraseñas filtradas).
4. Guarda.

✅ **Listo cuando:** el interruptor queda en verde/activado.

---

## PASO 8 · Verificación final (checklist)

Marca mentalmente cada punto probándolo en tu app real:

- [ ] Me puedo **registrar** y me llega el **correo** de confirmación (Paso 5).
- [ ] Puedo **iniciar sesión** y **recuperar contraseña**.
- [ ] Subo un **CV** y la app **refleja mi nombre y mis datos reales** (no datos de ejemplo).
- [ ] En la **Billetera** veo el botón **"Recargar tokens"** y una compra de prueba **suma tokens**.
- [ ] Si provoco un error, aparece en **Sentry** (si lo activaste).

---

## 🆘 Errores comunes y cómo resolverlos

| Síntoma | Causa probable | Solución |
|---------|----------------|----------|
| No aparece el botón "Recargar tokens" | Falta `VITE_STRIPE_ENABLED=true` o no hiciste redeploy | Revisa Vercel y vuelve a desplegar |
| "La compra de tokens aún no está habilitada" | Falta `STRIPE_SECRET_KEY` en Supabase | Agrégala en Edge Functions → Secrets |
| Pagué pero no llegaron los tokens | El webhook está mal o el secreto no coincide | Revisa la URL del webhook (Paso 2.3) y que `STRIPE_WEBHOOK_SECRET` sea del mismo modo (test/live) |
| Los correos no llegan | SMTP mal configurado o dominio sin verificar | Revisa Paso 5, verifica el dominio en Resend |
| "Firma inválida" en el webhook | Secreto de webhook incorrecto | Copia de nuevo el `whsec_...` desde Stripe |

> **Regla anti-errores de Stripe:** la clave secreta y el secreto del webhook
> **siempre deben ser del mismo modo**. Ambos de prueba (`sk_test` + `whsec` de test)
> o ambos reales (`sk_live` + `whsec` de live). Mezclarlos es el error #1.

---

## 📌 Referencia rápida de variables

**En Vercel (frontend):**
- `VITE_STRIPE_ENABLED` = `true`
- `VITE_SENTRY_DSN` = (opcional) tu DSN de Sentry
- `VITE_ANALYTICS_DOMAIN` = (opcional) tu dominio

**En Supabase → Edge Functions → Secrets (backend, privados):**
- `STRIPE_SECRET_KEY` = `sk_test_...` o `sk_live_...`
- `STRIPE_WEBHOOK_SECRET` = `whsec_...`
- `PUBLIC_SITE_URL` = URL de tu app
- `GEMINI_API_KEY` = (ya configurada, para la IA)

**URL del webhook de Stripe:**
```
https://cuwuyqpxaibbqjrvamjb.supabase.co/functions/v1/stripe-webhook
```
