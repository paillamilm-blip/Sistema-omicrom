# 🛠️ Puesta en Marcha — Backend Ómicrom (Fase 2 del Roadmap)

> Runbook operativo para desplegar el backend en tu proyecto **Supabase** real.
> Comandos listos para copiar/pegar. Correlo desde **tu máquina local** (no desde Kiro Web:
> el sandbox no tiene acceso a tu proyecto Supabase). Última actualización: **2026-07-22**.

Ver el plan completo en [`ROADMAP_LANZAMIENTO.md`](./ROADMAP_LANZAMIENTO.md).

---

## 0) Requisitos previos (una sola vez)

```bash
# Instalar la CLI de Supabase (si no la tenés)
npm install -g supabase          # o: brew install supabase/tap/supabase

# Iniciar sesión
supabase login
```

Necesitás el **project ref** de tu proyecto (Supabase Dashboard → Project Settings → General →
"Reference ID", algo como `abcdefghijklmnop`).

---

## 1) Enlazar el repo con tu proyecto Supabase

```bash
# Desde la raíz del repo
supabase link --project-ref TU_PROJECT_REF
```

> Esto crea/actualiza `supabase/config.toml`. Si te pide la password de la base, es la de
> **Database** (Settings → Database → Connection string).

---

## 2) Aplicar las migraciones (F2.1 / F2.2)

```bash
# Sube TODAS las migraciones de supabase/migrations/ (hasta 0055 + 9999_audit_consolidado)
supabase db push
```

**Verificación (F2.2):** confirmá que `0047_realtime_publication` quedó aplicada — es la que
habilita ranking en vivo y "el trabajo te busca". En el SQL Editor:

```sql
select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime';
-- Deberías ver: profiles, job_postings, job_matches
```

---

## 3) Configurar los secrets de las Edge Functions (F2.4)

> ⚠️ **NO** configures `SUPABASE_URL`, `SUPABASE_ANON_KEY` ni `SUPABASE_SERVICE_ROLE_KEY`:
> Supabase los inyecta automáticamente en cada función. Solo estos cuatro son tuyos:

```bash
supabase secrets set GEMINI_API_KEY=tu_api_key_de_google_gemini
supabase secrets set CREDENTIAL_SIGNING_KEY=una_clave_larga_y_secreta_aleatoria
supabase secrets set BLACKBOX_MASTER_KEY=otra_clave_secreta_aleatoria
supabase secrets set PISTON_URL=https://emkc.org/api/v2/piston   # motor de ejecución de código

# Verificar
supabase secrets list
```

| Secret | Para qué | Dónde se obtiene |
|--------|----------|------------------|
| `GEMINI_API_KEY` | IA: coach, tutor, examen-ia, carta-ia, arbiter-ai, market-match, simulador, vault-oracle, chat-assist | https://aistudio.google.com/apikey |
| `CREDENTIAL_SIGNING_KEY` | Firmar credenciales verificables | generála vos (ej. `openssl rand -hex 32`) |
| `BLACKBOX_MASTER_KEY` | Función `blackbox-open` | generála vos (ej. `openssl rand -hex 32`) |
| `PISTON_URL` | `run-code` (ejecución de código) | API pública de Piston o tu instancia |

---

## 4) Desplegar las Edge Functions (F2.3)

```bash
# Desplegar todas de una
for fn in arbiter-ai blackbox-open carta-ia chat-assist chat-history chat-send \
          coach credential embed examen-ia ghost-approval market-match run-code \
          simulador-universal tutor vault-oracle; do
  supabase functions deploy "$fn"
done
```

> `ghost-approval` se invoca vía cron/`service_role`; el resto valida el JWT del usuario.
> Si alguna función pública necesitara saltarse el JWT, se despliega con `--no-verify-jwt`
> (revisar caso por caso solo si una función da 401 inesperado).

---

## 5) Programar el cron de Ghost Approval (F2.6)

La migración `0055_ghost_approval_rpcs.sql` ya intenta crear el schedule de `pg_cron`
(auto-libera contratos entregados tras 15 min). Verificá que quedó activo:

```sql
select jobname, schedule, active from cron.job where jobname = 'ghost-approval-sweep';
```

Si `pg_cron` no estaba habilitado al correr la migración, habilitalo y re-corré esa parte:

```sql
create extension if not exists pg_cron;
```

---

## 6) Auditoría rápida de seguridad RLS (F2.5)

```sql
-- Tablas SIN Row Level Security activada (no debería haber ninguna con datos sensibles)
select relname
from pg_class
where relkind = 'r'
  and relnamespace = 'public'::regnamespace
  and not relrowsecurity;
```

Revisá que las tablas de usuario (`profiles`, `wallet_transactions`, `payment_*`,
`withdrawal_requests`, `messages`, etc.) tengan RLS = ON.

---

## 7) Prueba de humo (checklist Fase 3)

Con el frontend en producción (Vercel) y el backend desplegado:

- [ ] **Signup** con un usuario nuevo (verifica que el trigger de creación de perfil funciona)
- [ ] **Convalidar Gemelo** (sube reputación → cambia el ranking)
- [ ] **Ranking en vivo** se actualiza entre dos sesiones abiertas
- [ ] Una **función de IA** responde (ej. pedir consejo al Coach)
- [ ] **Publicar un servicio** en Market y que aparezca
- [ ] **Chat / DM** entre dos usuarios
- [ ] **Gobernanza**: abrir/ver una disputa

Si los 7 pasan → **Fase 2 y 3 listas**: tenés backend productivo y beta lista para invitar gente. 🎉

---

## ⚠️ Notas
- Los valores `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` del **frontend** se configuran en
  **Vercel** (Environment Variables), no acá.
- Stripe (recargas/retiros con dinero real) es **Fase 5** — no se toca en esta puesta en marcha.
