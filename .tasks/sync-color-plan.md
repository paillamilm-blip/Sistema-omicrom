# Plan: Sincronizar el COLOR del Gemelo entre dispositivos (móvil ↔ web)

## Problema (ya diagnosticado, no re-diagnosticar)

El COLOR elegido para el Gemelo se ve distinto en el móvil y en la web. Causa raíz:
el color vive SOLO en `localStorage['omicron_user_color']`, que es por-dispositivo.
El resto del perfil (nombre, reputación, skills, ejes, cv_summary) vive en Supabase y
SÍ se sincroniza entre dispositivos; el color no.

Solución confirmada por el usuario: sincronizar el COLOR entre dispositivos vía Supabase.
ALCANCE: SOLO el color. (La sincronización de "onboarding completado" es un paso posterior,
NO entra aquí.)

## Estado actual (verificado leyendo el código)

- `src/shared/components/ColorPicker.tsx`
  - `COLOR_OPTIONS`: `ice #7dd3fc (Hielo)`, `pink #ff6b9d (Rosa)`, `gold #ffb02e (Oro)`, `lime #84cc16 (Lima)`.
  - `getUserColor(): string` — SÍNCRONA. Lee `localStorage['omicron_user_color']`, mapea id-o-hex → hex,
    default `COLOR_OPTIONS[0].hex` (Hielo). Se usa en toda la app, incluso fuera de hooks (canvas en
    CredencialModal, defaults de GeodesicOrb, fallbacks de Suspense en OrbShell). DEBE seguir síncrona.
  - `setUserColor(colorId: string): void` — hoy solo escribe localStorage.
  - `<ColorPicker>` llama `setUserColor(option.id)` + `onSelect(option)` al elegir.
- `src/shared/hooks/useUserColor.ts` — hook reactivo: estado inicial de `getUserColor()`, re-lee en el evento
  `storage` (cross-tab) y en el evento custom `omicron:color-changed`. Devuelve hex.
- `src/types/profile.ts` — interfaz `Profile`. Aquí se agrega `user_color?: string`.
- `src/store/ProfileContext.tsx` — `ProfileProvider` obtiene el perfil (`fetchProfile` → `setProfile`) en
  `loadProfile` (login) y en el canal real-time. Es el lugar centralizado para hidratar el color tras el fetch.
- `src/features/auth/components/AuthOverlay.tsx` — `migrateGuestProfile()` hace
  `supabase.from('profiles').update({...}).eq('id', user.id)`: prueba de que RLS permite al usuario
  actualizar su propia fila. Reutilizamos ese patrón para escribir `user_color`.
- Migraciones: `supabase/migrations/NNNN_name.sql`, idempotentes, con RLS. La última es 0078; la siguiente es 0079.
- Tests: Vitest (`npm test` → `vitest --run`), archivos `*.test.ts` colocados junto al código.

## Diseño (caché read-through / write-through; `getUserColor` se mantiene síncrona)

Estrategia: localStorage sigue siendo la caché rápida y síncrona. Supabase se convierte en la fuente
duradera que se sincroniza entre dispositivos. Se guarda el ID del color (`'ice'|'pink'|'gold'|'lime'`),
no el hex, por estabilidad (validado en cliente contra `COLOR_OPTIONS`).

1. **Migración `0079_user_color.sql`**
   - `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_color text;` (nullable).
   - Sin cambios de política RLS: agregar una columna queda cubierto por las políticas de fila (self-update
     ya verificado vía `migrateGuestProfile`).
   - Idempotente. Termina con `NOTIFY pgrst, 'reload schema';` para que PostgREST exponga la columna al instante.

2. **Write-through** (al elegir color estando autenticado)
   - Escribir SIEMPRE localStorage (caché instantánea, mantiene `getUserColor` síncrona).
   - Si hay sesión → además `supabase.from('profiles').update({ user_color }).eq('id', user.id)`.
   - Guest (sin sesión) → solo localStorage, sin crash.
   - Se implementa en un servicio pequeño `src/shared/services/userColorSync.ts` para no acoplar `ColorPicker`
     (componente puro) a Supabase; `ColorPicker.setUserColor` sigue siendo síncrona y solo escribe localStorage.

3. **Read-through / hidratación al iniciar sesión**
   - Cuando carga el perfil autenticado:
     - Si `profile.user_color` está seteado y difiere de localStorage → escribir localStorage y disparar
       `omicron:color-changed` (recolorea useUserColor + toda la app). Esto es lo que hace que un dispositivo
       nuevo muestre el mismo color.
     - Si `profile.user_color` es null PERO localStorage tiene valor (eligió como guest y luego entró) →
       empujar el valor de localStorage HACIA Supabase para que persista.
   - Guardas anti-bucle: solo escribir cuando el valor difiere.

4. **Centralización**: la hidratación va en `ProfileContext` (un `useEffect` dedicado, keyed en
   `profile?.id` + `profile?.user_color`), que es el único punto donde el perfil autenticado se materializa.

5. `getUserColor()` mantiene firma y sincronía. La capa Supabase solo hidrata localStorage + dispara el evento.

## Incrementos

### FEAT-001 — chore: baseline del entorno
Instalar deps y confirmar que typecheck/lint/test/build actuales están verdes (o registrar el baseline).
Bajo INTEGRATIONS_ONLY puede que no se puedan correr; en ese caso, la validación real la hace CI en el push.

### FEAT-002 — feat: sincronizar user_color vía Supabase (migración + write-through + read-through)
- Migración `0079_user_color.sql`.
- Tipo `user_color?: string` en `Profile`.
- Servicio `userColorSync.ts` (write-through + validación id→hex + hidratación) + test unitario de la lógica pura.
- Wire write-through en el flujo de selección (ColorPicker/onboarding).
- Wire read-through en `ProfileContext`.

## Archivos tocados

- `supabase/migrations/0079_user_color.sql` (nuevo)
- `src/types/profile.ts` (agregar `user_color?: string`)
- `src/shared/services/userColorSync.ts` (nuevo)
- `src/shared/services/userColorSync.test.ts` (nuevo, lógica pura)
- `src/shared/components/ColorPicker.tsx` (o el consumidor de onSelect) — invocar write-through al elegir
- `src/store/ProfileContext.tsx` — efecto de hidratación read-through

## Riesgos

- Bucles de re-escritura: mitigado con guardas "solo si difiere".
- Romper la sincronía de `getUserColor`: mitigado; Supabase nunca entra en la ruta síncrona.
- Guest sin sesión: el write-through detecta ausencia de sesión y solo usa localStorage.
- PostgREST cacheando el esquema sin la columna: mitigado con `NOTIFY pgrst`.

## Verificación

- CI (en push): `tsc --noEmit`, `eslint .`, `vitest --run`, `vite build`.
- Test unitario nuevo de `userColorSync` (validación id→hex / normalización).
- Manual tras `supabase db push`: elegir color en dispositivo A autenticado → abrir sesión en dispositivo B →
  el color coincide.

## RECORDATORIO IMPORTANTE

Tras el merge, el usuario DEBE ejecutar `supabase db push` para aplicar `0079_user_color.sql`.
CI NO corre migraciones SQL.
