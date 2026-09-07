# Auditoría estática — septiembre 2026

Revisión manual de código previa a activar Strix. Todo lo de abajo se verificó
leyendo el repo, no se ejecutó nada contra producción. Los PoC están escritos
pero **sin probar en vivo**: hay que confirmarlos contra una base local antes de
tratarlos como definitivos.

Referencia de archivos: rama `main`, commit al momento de la auditoría.

---

## 1 · CRÍTICO — El sistema de créditos de IA no cuenta nada

`APLICAR_EN_SUPABASE.sql:267` define la RPC que debería cobrar cada uso de IA:

```sql
CREATE OR REPLACE FUNCTION public.check_and_consume_credit(p_function_name text)
...
BEGIN
  -- Fail-open: siempre permitir (sistema de créditos completo es opcional)
  RETURN json_build_object('allowed', true, 'remaining', 99, 'limit', 100, 'used', 1);
END;
```

Devuelve `allowed: true` fijo. No lee ni escribe ninguna tabla. El `remaining: 99`
que muestra la UI es un número inventado.

Encima hay un segundo defecto independiente en `_shared/iaCredits.ts:50`: la
función recibe `userAuthHeader` como parámetro y **nunca lo usa**. Llama
`adminClient.rpc(...)`, donde `adminClient` se construyó con el
`SERVICE_ROLE_KEY`. Ese cliente no tiene sesión de usuario, así que dentro del
RPC `auth.uid()` es `NULL`. El comentario del archivo ("`auth.uid()` se resuelve
internamente") describe algo que no ocurre. Y si la RPC fallara, los `catch`
retornan `null` = permitir.

Además la función solo existe en `APLICAR_EN_SUPABASE.sql`, que se aplica a
mano: no está en `supabase/migrations/`, así que no está versionada ni se aplica
en un `db reset`.

**Impacto:** el límite de 10/50 interacciones diarias no existe. Premium no
vende nada que el plan gratis no tenga.

**Arreglo:** implementar la RPC de verdad contra una tabla de consumo diario,
como migración numerada; y pasar el JWT del usuario al cliente que la invoca
(`createClient(url, anonKey, { global: { headers: { Authorization: userAuthHeader } } })`)
en vez del cliente `service_role`, para que `auth.uid()` resuelva. Cambiar el
fail-open por fail-closed en los endpoints que gastan dinero.

---

## 2 · CRÍTICO — Las funciones de IA son un LLM gratis para cualquiera

`analizar-cv/index.ts` no valida autenticación ni aplica rate limit. Lo único
que chequea antes de gastar la clave es que la clave exista (`if (!hasKey())`).

`proxy-ai/index.ts:104` saltea el chequeo de créditos a propósito cuando no
viene el header:

```ts
// If authHeader is empty or blank (guest user), skip credit check entirely.
if (authHeader.trim() && authHeader.trim() !== 'Bearer') {
  const creditBlock = await checkAndConsumeCredit(...);
}
```

La intención (que un invitado pueda analizar su CV) es correcta, pero la
implementación hace que **omitir el header sea la forma de no pagar**. Un
usuario registrado que quiera IA ilimitada simplemente no manda el header.

`tutor/index.ts` tiene rate limit pero no autenticación.

Sumado al punto 4 (el rate limit se puede burlar), el resultado es inferencia
LLM ilimitada a costa del dueño de las claves.

```bash
# PoC — sin ninguna credencial
curl -X POST 'https://<proyecto>.supabase.co/functions/v1/analizar-cv' \
  -H 'Content-Type: application/json' \
  -d '{"texto":"escribime un ensayo de 2000 palabras"}'
```

**Arreglo:** que el modo invitado use un token de sesión firmado y de corta vida
emitido por el servidor, con cuota propia atada a ese token, en vez de "sin
header = pase libre". Y ponerle a `analizar-cv` el mismo rate limit que tienen
las demás.

---

## 3 · ALTO — Cualquiera puede auto-otorgarse premium y competencias validadas

`profiles` permite al usuario actualizar su propia fila
(`profiles_update_own`, `0001_core.sql:105`), y el trigger
`protect_profile_columns` (`0007_protect_profile.sql`, repetido en
`9999_audit_consolidado.sql`) revierte los cambios a las columnas sensibles.

El problema es que el trigger está escrito como **lista negra**: enumera 21
columnas a proteger. Tres columnas sensibles se agregaron *después* y nunca se
sumaron a la lista:

| Columna | Agregada en | Protegida |
|---|---|---|
| `competencias_validadas` | `0037_market_trust.sql:11` | no |
| `is_premium` | `0039_premium.sql:10` | no |
| `is_ghost` | `0067_social_follows_ghosts.sql:64` | no |

```bash
# PoC — con un JWT de usuario normal
curl -X PATCH 'https://<proyecto>.supabase.co/rest/v1/profiles?id=eq.<mi-uuid>' \
  -H "apikey: <anon>" -H "Authorization: Bearer <mi-jwt>" \
  -H 'Content-Type: application/json' \
  -d '{"is_premium": true, "competencias_validadas": 99}'
```

**Impacto:**
- `is_premium` habilita las funciones de IA de pago (`Premium.tsx:12`).
- `competencias_validadas` **ordena el ranking del marketplace**
  (`MarketTab.tsx:166`) y se publica en la credencial compartible
  (`credential/index.ts:74`). O sea: te ponés primero en la vitrina y exhibís
  competencias validadas que nadie validó.

Esto último choca de frente con la regla de integridad del proyecto — mostrar
algo como validado sin validación real es exactamente lo que el sello
"conocimiento verificable, no declarado" promete que no pasa.

**Arreglo:** invertir el trigger a **lista blanca**. Que revierta todo salvo las
columnas que el usuario legítimamente edita (`full_name`, `bio`, `location`,
`avatar_url`, `username`, `user_color`, `onboarding_*`). Así una columna nueva
nace protegida por defecto en vez de nacer abierta. Es un cambio chico y cierra
la clase entera de bug, no solo estos tres casos.

---

## 4 · ALTO — El rate limit se burla con un header

`_shared/rateLimit.ts:63`:

```ts
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  ...
}
```

Toma el primer valor de `x-forwarded-for`, que es justamente el que pone el
cliente. Rotando ese header, cada request cuenta como una IP distinta y el
límite nunca se alcanza. Para los endpoints sin autenticación (punto 2) este es
el **único** control que existe.

`checkRateLimit` además es fail-open por diseño (`return { allowed: true }` ante
cualquier error), así que si la tabla de rate limit se cae, el límite desaparece.

**Arreglo:** usar el valor *más a la derecha* de la cadena XFF (el que agrega la
infraestructura, no el cliente), o el identificador de cliente de la plataforma.
Para lo que cuesta dinero, fail-closed.

---

## 5 · MEDIO — El email de todos los usuarios es público

`0001_core.sql:101`:

```sql
create policy "profiles_select_all" on public.profiles
  for select using (true);
```

Sin `to authenticated`, así que aplica también al rol `anon`. Ninguna migración
posterior la redefine (verificado en 0008, 0009, 0049, 0050, 9999). La tabla
contiene `email`, `token_balance`, `token_escrow` y `total_earnings`.

```bash
# PoC — solo con la clave pública que viene en el bundle JS
curl 'https://<proyecto>.supabase.co/rest/v1/profiles?select=email,total_earnings,token_balance' \
  -H "apikey: <anon>"
```

Que el perfil profesional sea público es parte del producto; que lo sean el
email y los saldos, no. Es un padrón de emails listo para scrapear.

**Arreglo:** restringir la política a las columnas públicas exponiendo una vista
(o `security_invoker`) con lo que sí es público, y dejar `email` y las columnas
de dinero solo para `auth.uid() = id`. RLS no filtra por columna, así que la
separación tiene que hacerse con una vista.

---

## 6 · BAJO — Higiene de configuración

- `.env.example:36` sigue documentando `VITE_OPENROUTER_KEY`. Ya no se usa en
  `src/` (lo reemplazó `proxy-ai`, que es lo correcto), pero el ejemplo invita a
  poner una clave de OpenRouter en una variable `VITE_*`, y Vite incrusta esas
  variables en el bundle público. Conviene borrar la línea y decir explícitamente
  que esa clave va en los secrets de Supabase.
- `VITE_VAPID_PUBLIC_KEY` sí se usa en el código pero no está documentada en
  `.env.example`.
- La clave `anon` está hardcodeada en `src/infrastructure/supabase/client.ts:15`.
  Es pública por diseño, no es una filtración — pero al estar en el código no se
  puede rotar sin un deploy, y el fallback silencioso hace que un entorno mal
  configurado se conecte al proyecto de producción sin avisar.

---

## Lo que se revisó y está bien

Para que no se re-audite al vacío:

- `trg_protect_profile` **sí** bloquea `reputation_score`, `token_balance`,
  `node_type`, `pe_points` y los 4 ejes. La reputación no se puede escribir
  directo por REST. El blindaje funciona; el problema es solo su cobertura.
- `profiles_update_own` no declara `WITH CHECK`, lo cual **no** es un bug:
  Postgres usa la expresión de `USING` por defecto, así que no se puede
  reasignar la fila a otro usuario.
- `run-code/index.ts:161` construye un cliente con el `Authorization` del
  llamante y valida con `getUser()` antes de ejecutar. La ejecución va a Piston
  (externo), no al runtime de la Edge Function.
- No hay `service_role` ni claves reales en `src/`.
- Hay trabajo de hardening real y deliberado: `0027_security_fixes.sql`,
  `0051_hardening_examenes.sql`, `0057_endurecer_funciones.sql` y
  `0071_security_sprint1.sql` revocan permisos de escritura directa en tablas
  sensibles y fuerzan el paso por RPC. De 126 `SECURITY DEFINER`, la mayoría
  fija `SET search_path`.

## Lo que no se revisó

Los límites de una lectura estática, para que Strix los cubra:

- No se aplicaron las migraciones a una base real, así que **el estado final de
  RLS no está verificado contra el catálogo** (`pg_policies`). Con 83
  migraciones que se pisan, leer los archivos no alcanza.
- No se probó ningún PoC en vivo.
- No se auditó una por una las ~126 funciones `SECURITY DEFINER` buscando
  validación de `auth.uid()` contra el recurso.
- No se buscaron secretos en el historial de git.
- No se probó prompt injection vía CV.
- No se revisó la verificación de firma en `stripe-webhook`.

## Orden sugerido

1. Punto 3 (lista blanca en el trigger) — chico, y cierra la clase completa.
2. Punto 2 + 4 juntos — es lo que hoy está gastando plata.
3. Punto 5 — vista para separar columnas públicas de privadas.
4. Punto 1 — decidir si Premium cobra de verdad o se saca la promesa de la UI.
