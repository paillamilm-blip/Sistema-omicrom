---
name: code-review
description: >-
  Revisión de código para Sistema Ómicrom (React + TypeScript + Vite + Supabase).
  Úsala al revisar Pull Requests, diffs locales antes de commitear, o cambios en
  migraciones SQL, Edge Functions, RLS/políticas, flujos de escrow/tokens,
  reputación/PE y componentes del frontend. Aplica una checklist priorizada por
  seguridad y correctitud, y produce un informe con severidades accionables.
---

# Code Review — Sistema Ómicrom

Revisión centrada en **seguridad** y **correctitud** primero. Este proyecto mueve
tokens (Ω), reputación y credenciales; un bug aquí no es cosmético.

## Cuándo activarla
- Revisar un PR (pre-merge) o un diff local (pre-commit).
- Cambios en `supabase/migrations/**`, `supabase/functions/**`, RLS/políticas,
  `contracts`/escrow, reputación/PE, o RPCs `SECURITY DEFINER`.
- Cambios de frontend que llamen `supabase.rpc(...)` o `.from(...)`.

## Cómo revisar (proceso)
1. Lee el diff **por preocupación, no por archivo**: agrupa los cambios en temas
   (p. ej. "liberación de escrow", "flujo de corrección") y evalúa cada tema
   de punta a punta (SQL + Edge Function + frontend).
2. Reconstruye el **camino del dato/dinero**: ¿quién puede llamar esto, con qué
   privilegios, y qué pasa si falla a la mitad?
3. Marca cada hallazgo con severidad: `🔴 Crítico`, `🟠 Importante`, `🟡 Menor`,
   `💡 Sugerencia`. Da la ubicación exacta (archivo:línea) y una corrección concreta.
4. No apruebes por "compila / el comando salió sin error": verifica el resultado
   contra la intención.

## Checklist de seguridad (bloqueante)
- **RLS obligatorio:** toda tabla nueva en `public` debe tener `enable row level
  security` + políticas explícitas. Sin RLS = fuga de datos.
- **`SECURITY DEFINER` + `set search_path`:** toda función definer fija
  `set search_path = public`. Sin esto es un vector de escalada.
- **Grants correctos:** nunca otorgues a `authenticated` funciones que muevan
  dinero/PE/reputación por dentro con datos del cliente. Esas van a `service_role`
  (las invoca una Edge Function con el admin client). Ver `0051` y `0055`.
- **No confiar en flags del cliente:** jamás decidas un resultado privilegiado
  (aprobar, liberar, reactivar) por un booleano que manda el navegador. Verifica
  en el servidor (ej.: `resolve_audit` exige un `skill_test_attempts.result='PASS'`
  real registrado por el servidor, no el `p_passed` del cliente).
- **Fuente de verdad escribible solo por el servidor:** tablas que "prueban" algo
  (exámenes, pagos) deben ser solo-lectura para `authenticated`; escribe el
  `service_role` (que ignora RLS). Cuidado con políticas `for all`.
- **Sin secretos en el front:** solo la *publishable/anon key*. Nunca
  `service_role`, contraseñas ni cadenas de conexión en código o `.env` versionado.
- **Autorización explícita en cada RPC:** valida `auth.uid()` y la pertenencia
  ("solo el comprador", "solo tu propia auditoría") antes de mutar.

## Checklist de dinero / escrow
- El escrow se retiene en el **`token_escrow` del COMPRADOR**. Al liberar:
  `comprador.token_escrow − monto` y `vendedor.token_balance + monto`.
- **Atomicidad:** mover fondos + cambiar estado + registrar `wallet_transactions`
  deben ir en **una sola transacción/RPC**. Nada de "update estado" y luego
  "mover fondos" en pasos separados desde una Edge Function (riesgo de pago doble
  o contrato liberado sin pagar).
- Nunca sobrescribas saldos con `SET balance = x`; usa incrementos (`+`/`-`) con
  `greatest(...,0)`.
- Guards de idempotencia por estado (`where status = 'DELIVERED'`).

## Checklist de migraciones SQL
- **Idempotentes:** `create table if not exists`, `create index if not exists`,
  `drop policy if exists` + `create policy`, `create or replace function`.
- ⚠️ **Orden de ejecución:** `9999_audit_consolidado.sql` corre **al final**
  (orden alfabético). Si una migración `00xx` posterior redefine una función que
  `9999` también define, `9999` la **pisa**. Al tocar `declare_delivery`,
  `object_delivery`, `recalc_reputation`, etc., sincroniza también su copia en `9999`.
- **State machine:** si agregas un estado a `contracts.status`, actualiza el
  `check` constraint y todos los RPCs/edge functions que filtran por estado.
- **Columnas nuevas:** default seguro y `not null` solo si hay backfill.
- **Fuentes de verdad duplicadas:** si un valor vive en varios lugares (p. ej. la
  ventana de Ghost Approval en SQL + Edge Function + frontend), verifica que
  cambien juntos, y prefiere una única fuente (`ghost_approval_interval`).

## Checklist de frontend (React/TS)
- Consultas conscientes de RLS (no asumas acceso que la política no da).
- Manejo de errores de `rpc`/`from` con feedback al usuario (toast), sin tragar
  errores en silencio.
- No introducir llamadas directas a tablas privilegiadas que deberían ir por RPC.
- Tipos: sin `any` nuevos; mantener las uniones de estado sincronizadas con el SQL.
- Sin secretos ni PII quemada.

## Reglas del proyecto
- **Correctitud > velocidad.** Si no puedes verificar un criterio, dilo explícito.
- **No agregues tests** salvo que se pidan.
- No crees archivos de documentación salvo que se pidan.
- Cambios en dominios sensibles (justicia/disputas, reputación, pagos): pide una
  segunda mirada y describe el impacto.

## Formato del informe
```
## Resumen (1-2 líneas: ¿es seguro mergear?)
## 🔴 Crítico
- [archivo:línea] problema → corrección concreta
## 🟠 Importante
## 🟡 Menor
## 💡 Sugerencias
## Verificación
- Qué probaste / qué NO pudiste verificar (ej.: migraciones sin correr en staging)
```
