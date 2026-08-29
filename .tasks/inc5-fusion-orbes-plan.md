# Sub-plan: Incremento 5 — "Fusión de orbes" (match para agrandar la red)

> Deriva del plan maestro `.tasks/credencial-omicron-plan.md` §5. Este documento detalla
> el Incremento 5 y lo parte en dos PRs independientes, cada uno CI-verde por sí solo:
>
> - **5a (SIN SQL, no destructivo):** función pura `orbFusion` + su test, y una sección
>   nueva "Fusión de orbes" en `PublicCredentialModal`, con degradación elegante cuando el
>   otro perfil no expone `skills_detail`. **Este PR se implementa ahora.**
> - **5b (migración, PLAN ONLY):** migración idempotente que agrega `skills_detail` al RPC
>   `get_public_credential`, y el mapeo cliente que enciende la fusión "real". **Solo se
>   documenta aquí; NO se implementa en este trabajo.**
>
> **Regla de oro (heredada):** no destructivo, CI verde (`tsc --noEmit` + `eslint` +
> `vitest --run` + `vite build`), no romper flujos existentes. Idioma producto español,
> código inglés, comentarios español. **CERO JERGA**: cada número con `/100`; el match habla
> de conectar / aprender / enseñar / colaborar / crecer la red, **nunca** de vacantes / puestos
> / postular. `useUserColor()` para acentos personales; tokens `C` para marca; no hardcodear cyan.

---

## 0. Hechos verificados (file:line) — base del diseño

- **RPC actual:** `get_public_credential(p_username text)` en
  `supabase/migrations/0070_missing_rpcs_connections_dms.sql:219`. `RETURNS TABLE` con 16
  columnas: `id, username, full_name, avatar_url, bio, location, node_type, node_level,
  is_verified_professional, reputation_score, execution_score, quality_score,
  transcendence_score, foundation_score, pe_points, total_contracts_completed`.
  **NO devuelve `skills_detail`.** `LANGUAGE sql STABLE`, filtro
  `WHERE username = p_username AND (is_ghost = false OR is_ghost IS NULL)`,
  `GRANT ... TO authenticated, anon`.
- **UI pública:** `PublicCredentialModal` en
  `src/features/gemelo/components/RedSocial.tsx` (~línea 236). Hace
  `supabase.rpc('get_public_credential', { p_username })`, mapea las 16 columnas a la
  interfaz `PublicCred`, tiene `connect()` (send/respond connection request), `isSelf`, arma
  un objeto `gemelo` para `ProgressRadar`, y ya renderiza una sección
  **"AFINIDAD DE COLABORACION"** calculada solo con los 4 ejes (~líneas 380-405).
- **Skills propias disponibles cliente-side:** `useApp()` expone
  `profile.skills_detail?: {name,pct}[]` (`src/types/profile.ts:22`), con fallback a
  `profile.skills?: string[]`. Patrón de derivación ya usado en `GemeloTab.tsx` (~líneas 59-63):
  `const details = profile?.skills_detail ?? []; if (details.length>0) return details;
  return (profile?.skills ?? []).map((s,i)=>({name:s, pct: Math.max(30, 85 - i*8)}))`.
  Las skills del OTRO NO están disponibles (el RPC no las devuelve) → 5b las agrega.
- **Tokens/color:** `C` en `src/theme/tokens.ts` (`C.cyan = '#a0aec0'` Silver Ice, etc.).
  `useUserColor()` en `src/shared/hooks/useUserColor.ts` devuelve el hex del color personal.
- **Vitest:** configurado en `vite.config.ts` → `test: { environment:'jsdom', globals:true,
  passWithNoTests:true, exclude:['**/node_modules/**','**/.kiro/**','**/e2e/**'] }`.
  `npm run test` = `vitest --run`. Vitest 2.1.8 en devDependencies. No hay tests unitarios
  de `src/` todavía; este será el primero, co-locado como `*.test.ts`.
- **Red INTEGRATIONS_ONLY:** no se puede correr `tsc`/`eslint`/`vitest`/`vite build` local
  (node_modules hueco). La verdad es el CI de GitHub Actions (`.github/workflows/ci.yml`:
  typecheck → lint → test → build). Hay que escribir código que compile limpio.
- **Lint:** `@typescript-eslint/no-explicit-any` y `no-unused-vars` en `warn` (no bloquean),
  pero se evita `any` y variables sin usar de todos modos.

---

## 1. Diseño de la "Fusión de orbes" (heredado de §5)

Cuando alguien abre mi QR/link → `PublicCredentialModal` muestra una sección
**"Fusión de orbes"** para **crecer la red profesional** (NO match de empleos):

- **Compartidos:** skills en común (por nombre normalizado) → señal de confianza
  ("hablan el mismo idioma").
- **Complementarios:** skills donde `|mine.pct - theirs.pct| >= UMBRAL (25)` →
  "podés aprender X de esta persona (ella NN/100, vos NN/100)" (learn) o
  "vos podés enseñarle Y" (teach).
- **Solo del otro:** skills presentes en el otro y ausentes en mí → "podés aprender algo nuevo".
- **Copy CERO JERGA:** siempre sobre conectar / crecer la red / aprender / enseñar /
  colaborar. Nunca vacante/puesto/postular.
- **Presentación:** `GeodesicOrb` dibuja nodos genéricos (no mapea skill→vértice), así que
  NO se altera su API. La fusión se muestra como leyenda/lista con código de color:
  compartidos = color de usuario (`useUserColor()`), complementarios = color de marca (`C`).

---

## 2. Incremento 5a — IMPLEMENTAR AHORA (sin SQL, no destructivo)

### 2.1 Nuevo módulo puro: `src/features/gemelo/services/orbFusion.ts`

Función pura, determinista, sin efectos secundarios.

- **Entrada:** `mine: Skill[]`, `theirs: Skill[]` donde `Skill = { name: string; pct: number }`.
- **Normalización:** nombre → `trim().toLowerCase()` para casar "React" con " react ".
- **Dedupe** por nombre normalizado (si aparece 2 veces, se queda la primera aparición).
- **Umbral** complementario: constante exportada `COMPLEMENTARY_THRESHOLD = 25`.
- **Salida** (`OrbFusion`):
  - `shared: { name; minePct; theirsPct }[]` — skill presente en ambos.
  - `complementary: { name; minePct; theirsPct; direction: 'learn' | 'teach' }[]` —
    skill presente en ambos con `|minePct - theirsPct| >= 25`; `learn` si `theirsPct > minePct`,
    `teach` si `minePct > theirsPct`. (Nota: una skill puede estar en `shared` y también en
    `complementary` cuando la brecha es grande; son dos lecturas distintas del mismo dato —
    "la tienen en común" y "hay brecha para aprender/enseñar". El render decide cómo mostrar
    cada lista.)
  - `onlyTheirs: { name; theirsPct }[]` — presente en `theirs`, ausente en `mine` → aprender algo nuevo.
- **`name` de salida:** conservar el nombre original (display) de la primera aparición, no el normalizado.
- **Guardas:** arrays vacíos/undefined → resultado con las tres listas vacías, sin lanzar.

**Tests co-locados `orbFusion.test.ts` (Vitest, `import { describe, it, expect } from 'vitest'`):**
1. skills idénticas (mismos nombres y pct) → todo `shared`, `complementary` vacío (brecha 0), `onlyTheirs` vacío.
2. skill solo en `theirs` → aparece en `onlyTheirs`; no en `shared`.
3. skill fuerte mía (mine 80, theirs 30) → `complementary` con `direction: 'teach'`.
4. skill fuerte del otro en común (mine 30, theirs 80) → `complementary` con `direction: 'learn'`.
5. diferencias de mayúsculas/espacios ("React" vs " react ") → casan como `shared`.
6. entradas vacías (`[]`,`[]`) y `undefined` → resultado vacío, sin throw.
7. dedupe: nombre repetido en `mine` no duplica el resultado.
8. brecha exactamente en el umbral (=25) cuenta como complementaria; brecha 24 no.

### 2.2 Extender `PublicCredentialModal` en `RedSocial.tsx` (solo AÑADIR sección)

- Importar `useUserColor` (`@/shared/hooks/useUserColor`) y `computeOrbFusion`
  (`@/features/gemelo/services/orbFusion`).
- Derivar **mis** skills con el patrón de `GemeloTab` (skills_detail ?? skills mapeadas).
- El **theirs** por ahora NO existe en `PublicCred` (5b lo agrega). En 5a se pasa un array
  vacío. La función `computeOrbFusion(mine, [])` devuelve listas vacías → la sección
  **degrada con gracia**: se mantiene la sección de "AFINIDAD DE COLABORACION" de 4 ejes que
  ya existe, y se añade una línea profesional CERO JERGA explicando que el detalle de skills
  compartidas/complementarias se activa cuando ambos perfiles publican skills detalladas.
  NO bloquear, NO error.
- Cuando `theirs` esté disponible (futuro 5b), la MISMA sección renderiza `shared`
  (color usuario), `complementary` (frases learn/teach con NN/100) y `onlyTheirs`. La lógica
  de render ya se escribe en 5a lista para recibir datos; solo queda "vacía" hasta 5b.
- **NO tocar:** el `fetch`/`useEffect`, el mapeo `PublicCred`, `connect()`, `loadStatus`,
  `isSelf`, `ProgressRadar`, `PublicProfileGate`, ni la sección de afinidad existente. Solo
  se AÑADE un bloque dentro del render `!loading && cred && ...`, después de la afinidad.
- Mantener CERO JERGA, `useUserColor()` para acentos personales, `C` para marca, números `/100`.

### 2.3 Archivos que toca 5a
- **Nuevo:** `src/features/gemelo/services/orbFusion.ts`
- **Nuevo:** `src/features/gemelo/services/orbFusion.test.ts`
- **Editado (aditivo):** `src/features/gemelo/components/RedSocial.tsx`
- **Sin SQL. Sin dependencias nuevas.**

### 2.4 Verificación 5a
- CI de GitHub (fuente de verdad bajo INTEGRATIONS_ONLY): `typecheck` + `lint` +
  `test` (corre `orbFusion.test.ts`) + `build`, todos verdes.
- Revisión manual del diff: `RedSocial.tsx` solo suma un bloque; `connect`, deep link
  `?perfil=`, DMs, leaderboard y share intactos.
- Los tests de `orbFusion` fallarían si la lógica de shared/complementary/onlyTheirs se
  revierte (ejercitan la función real, no mocks).

---

## 3. Incremento 5b — PLAN ONLY (NO implementar ahora)

Objetivo: encender la fusión "real" exponiendo `skills_detail` del otro perfil.

### 3.1 Migración `supabase/migrations/00NN_public_credential_skills.sql`
- `CREATE OR REPLACE FUNCTION public.get_public_credential(p_username text)`:
  - Agregar `skills_detail jsonb` al `RETURNS TABLE` y al `SELECT` (la columna ya existe en
    `profiles`, ver `APLICAR_EN_SUPABASE.sql`).
  - Mantener EXACTOS los mismos `GRANT ... TO authenticated, anon`.
  - Mantener `LANGUAGE sql STABLE` y el filtro `is_ghost = false OR is_ghost IS NULL`.
  - `CREATE OR REPLACE` = idempotente; no borra datos; RLS intacto.

### 3.2 Cambios cliente (5b)
- Agregar `skills_detail?: { name: string; pct: number }[]` a la interfaz `PublicCred` y al
  mapeo (`RedSocial.tsx`, parseando el `jsonb` a `{name,pct}[]` con guardas de tipo).
- Pasar `theirs = cred.skills_detail ?? []` a `computeOrbFusion`. La sección ya escrita en 5a
  se enciende sola con datos reales.

### 3.3 Riesgo y mitigación (5b)
- **Riesgo:** SQL en producción (medio).
- **Mitigación:** `CREATE OR REPLACE` es reversible (re-aplicar la versión previa del mismo
  archivo/definición); PR dedicado y revisado; nunca directo a main; el cliente YA degrada sin
  el campo desde 5a, así que un rollback de la migración no rompe la UI (vuelve al fallback).

---

## 4. Checklist de constraints (ambos incrementos)
- [ ] No romper `?perfil=` (`PublicProfileGate`), `connect`, DMs, leaderboard ni share.
- [ ] No romper `GemeloTab`, `ProgressRadar`, `OrbNeuronal`.
- [ ] Reputación/ejes solo lectura (autoridad server-side intacta).
- [ ] `useUserColor()` acentos personales; `C` marca; sin cyan hardcodeado; números `/100`.
- [ ] CERO JERGA; el match es para conectar/crecer la red, nunca empleos.
- [ ] 5a sin SQL y sin dependencias nuevas. 5b una sola migración idempotente.
- [ ] CI verde en cada PR por separado.
