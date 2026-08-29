# Plan: Orbe Armónico en toda la app + animación de carga (load → esquina)

## Objetivo del usuario (traducido de su instrucción)

> "La opción 1: la recomendación con más impacto de marca. Que empiece **mediano** y que en la animación sea **pequeña** (se encoge). Que se vea **más wow**, tiene que verse **armónico** y tiene que ser **igual en todos lados** de la app, porque noté que **algunos tienen un círculo alrededor** y otros no."

Tres necesidades concretas:
1. **Consistencia (armonía)**: el orbe debe verse idéntico en todas partes. Matar el "círculo alrededor" que unos tienen y otros no.
2. **Animación de carga (App.tsx)**: el orbe arranca **mediano y centrado** (impacto de marca), y cuando termina la carga se **encoge y se mueve hacia la esquina superior derecha** (donde vive el avatar de perfil). Corta, suave, con "wow" pequeño y de buen gusto.
3. **Loaders más chicos**: los orbes centrados de pantalla/sección deben ser más pequeños que hoy.

Restricción rectora: **NO ROMPER NADA**. React 18 + TS estricto + Vite. Sin Tailwind en componentes. framer-motion ya disponible. Color de acento vía `useUserColor()` / `getUserColor()`. Sin nuevas dependencias. CERO jerga en textos. Red INTEGRATIONS_ONLY: no se puede correr tsc/eslint/vitest/build local; CI valida en push. Escribir código que compile limpio.

---

## Diagnóstico verificado (el desorden a corregir)

### El bug del "círculo alrededor" (causa raíz)
En `src/shared/components/GeodesicOrb.tsx` (~líneas 174-183) hay un **"Outer ring"** que se renderiza **solo cuando `clampedNodes > 5`**:

```tsx
{clampedNodes > 5 && (
  <div style={{ position:'absolute', inset:4, borderRadius:'50%',
    border:`1px solid ${color}22`, opacity: intensity*0.5, ... }} />
)}
```

Los orbes con `nodes > 5` muestran ese anillo tenue; los de `nodes <= 5` no. Eso es exactamente el "círculo que algunos tienen y otros no". Como `nodes` varía por call site (5, 8, 10, 12, 42...), el anillo aparece de forma inconsistente. **Decisión: eliminar el anillo por completo** (armonía total, look más limpio; es un detalle sutil que hoy nadie eligió a propósito y que genera la inconsistencia). El anillo no aporta identidad; el wireframe geodésico y el core glow sí.

### Los 13 call sites (todos distintos hoy)

| # | Archivo:línea | size | nodes | color | spinning | intensity | Problema |
|---|---|---|---|---|---|---|---|
| 1 | `src/App.tsx:113` | 168 | 12 | — (gris) | 25 | 0.7 | Sin color de usuario (gris). Primera impresión. Texto `C.cyanDim`, botón `C.cyan` (gris), halo púrpura. |
| 2 | `src/features/academia/components/AcademiaTab.tsx:426` | 180 | 12/42 | — (gris) | 20 | 0.5/0.9 | El más grande. Sin color. |
| 3 | `src/features/auth/components/AuthOverlay.tsx:288` | 80 | 10 | `uc` | 20 | 0.6 | OK (referencia buena). |
| 4 | `src/features/auth/components/NoAccess.tsx:53` | 80 | 10 | `uc` | 20 | 0.6 | OK. |
| 5 | `src/features/auth/components/ResetPasswordOverlay.tsx:98` | 80 | 10 | `uc` | 20 | 0.6 | OK. |
| 6 | `src/features/gemelo/components/CredencialModal.tsx:285` | 130 | orbNodes | `uc` | 0 | 0.6 | Retrato (spinning 0 intencional). OK. |
| 7 | `src/features/omicron/components/ConvalidaOmicron.tsx:95` | 160 | orbNodes | `uc` | 18 | 0.75 | Análisis CV. Muy grande. |
| 8 | `src/features/omicron/components/ConvalidaOmicron.tsx:144` | 80 | 5 | `uc` | 25 | 0.6 | OK. |
| 9 | `src/features/omicron/components/GemeloReveal.tsx:205` | 140/100 | orbNodes | `uc` | 15 | var | OK (cinemático). |
| 10 | `src/features/omicron/components/OrbShell.tsx:200` (TabLoader) | 64 | 8 | — (gris) | 15 | default 0.8 | Mini sin color. |
| 11 | `src/features/omicron/components/OrbShell.tsx:1267` (fallback Credencial) | 90 | 8 | `getUserColor()` | 0 | 0.55 | OK. |
| 12 | `src/features/omicron/components/OrbShell.tsx:1281` (fallback ConvalidaCV) | 80 | 5 | `C.cyan` (gris) | 20 | 0.5 | Debe ser color de usuario, no `C.cyan`. |
| 13 | `src/features/omicron/components/OrbOnboarding.tsx:320` | 240 | orbNodes | `chosenColor` | var | var | Onboarding cinemático (color elegido en vivo). OK, se respeta. |

### Datos técnicos confirmados
- `getUserColor()` (en `src/shared/components/ColorPicker.tsx`) lee `localStorage['omicron_user_color']`, devuelve hex; default `#7dd3fc` (Hielo). Opciones: ice `#7dd3fc`, pink `#ff6b9d`, gold `#ffb02e`, lime `#84cc16`.
- `useUserColor()` (en `src/shared/hooks/useUserColor.ts`) hook reactivo (escucha `storage` y `omicron:color-changed`). Preferir en componentes React; `getUserColor()` para fallbacks fuera de render reactivo.
- `C.cyan = '#a0aec0'` (Silver Ice), `C.cyanDim`, `C.cyanFaint` en `src/theme/tokens.ts`. Estos son GRISES de marca, NO el color personal del usuario.
- Keyframes `cp-spin` y `cp-breathe` definidos en `src/index.css` y `src/theme/animations.ts`. El orbe ya los usa.
- framer-motion `^11.11.17` disponible; ya se usa `motion` + `AnimatePresence` en OrbOnboarding, GemeloReveal, etc.
- CI (`.github/workflows/ci.yml`): `npm run typecheck` → `npm run lint` → `npm run test` (vitest) → `npm run build` (vite). Node 22.
- El gate de carga en `App.tsx`: `if ((authStatus === 'loading' || isLoadingProfile) && !forceGuest)`. Botón "Entrar sin cuenta →" hace `setForceGuest(true)`. Timeout de 5s también fuerza guest. **No tocar esta lógica.**

---

## Escala canónica del orbe (propuesta)

En vez de 13 tamaños arbitrarios, una escala pequeña y clara. Cada call site se mapea al valor más cercano:

| Nombre | px | Uso |
|---|---|---|
| `mini` | 64 | Loaders de tab/sección (TabLoader) |
| `small` | 80 | Overlays auth, loaders de módulo, estados compactos |
| `medium` | 110 | Carga de app (centrado), análisis CV centrado |
| `portrait` | 130 | Retrato en credencial (spinning 0) |

`OrbOnboarding` (240, cinemático con escala animada por paso) queda **fuera de la escala** a propósito: es una experiencia de introducción con su propia coreografía. `GemeloReveal` (140/100 cinemático) también se respeta como cinemática, aunque se puede alinear a `medium` en el increment (c) si se desea.

**Tratamiento canónico único** (todos los call sites "normales"):
- `color` = color del usuario (`useUserColor()` en React; `getUserColor()` en fallbacks). Nunca gris (`C.cyan`) salvo intención de marca explícita.
- **Sin anillo exterior** (eliminado del componente → consistente en todos lados).
- `spinning` y `intensity` se dejan según contexto (spin 0 para retrato, spin normal para loaders), pero el look base (wireframe + core glow + color) es idéntico.

---

## Incrementos (cada uno es un PR verde en CI)

Orden por **fundamento seguro primero**: la consistencia (a) es la base que sostiene todo y es la de menor riesgo. Sobre esa base se construye la animación (b), que es la de mayor impacto de marca pero más riesgo. Los recortes finos (c) son cosméticos y van al final. Justificación: si (b) se hiciera primero sin (a), la animación heredaría el gris y el anillo inconsistente; hacer (a) primero garantiza que el orbe que se anima ya es el canónico.

### Increment (a) — Armonía / consistencia (FUNDAMENTO SEGURO) ← se implementa ahora
**Qué:**
1. En `GeodesicOrb.tsx`: **eliminar el bloque "Outer ring"** (`{clampedNodes > 5 && (...)}`). Esto hace el orbe idéntico en todos lados (mata el "círculo alrededor"). Afecta a los 13 call sites por diseño; verificar que ninguno se ve roto (el retrato de CredencialModal y los orbes de auth no dependían del anillo para nada estructural).
2. **Greys → color de usuario** en los call sites que hoy caen a gris:
   - `App.tsx:113`: agregar `color={uc}` (nuevo `const uc = useUserColor()` en `AppShell`). Además texto `C.cyanDim` → `uc` con opacidad, botón `C.cyan` → `uc`, y opcionalmente el halo púrpura → `uc`. **Cuidado**: no cambiar la lógica del gate ni del botón `setForceGuest`.
   - `AcademiaTab.tsx:426`: agregar `color={uc}` (ya se puede usar `useUserColor()` en ese componente).
   - `OrbShell.tsx:200` (TabLoader): agregar `color={getUserColor()}` (TabLoader es función sin hooks de color; usar `getUserColor()` es seguro).
   - `OrbShell.tsx:1281` (fallback ConvalidaCV): `color={C.cyan}` → `color={getUserColor()}`.
3. **Escala de tamaños (armonía visual)** aplicada a los loaders centrados:
   - `App.tsx:113`: `size={168}` → `size={110}` (medium). Ajustar el wrapper `width/height: 168` → `110`.
   - `AcademiaTab.tsx:426`: `size={180}` → `size={130}`. Ajustar wrapper `width/height: 180` → `130`.
   - `ConvalidaOmicron.tsx:95`: `size={160}` → `size={130}`.
   - Auth (80) y credencial retrato (130) se quedan como están.

**Archivos tocados:** `src/shared/components/GeodesicOrb.tsx`, `src/App.tsx`, `src/features/academia/components/AcademiaTab.tsx`, `src/features/omicron/components/OrbShell.tsx`, `src/features/omicron/components/ConvalidaOmicron.tsx`.

**Valores exactos:** ver tabla arriba. Ring: eliminado. Colores: `uc`/`getUserColor()`. Sizes: App 110, Academia 130, ConvalidaOmicron 130.

**Riesgo:** Bajo. Cambios puramente visuales; sin cambios de lógica. El único cambio compartido es quitar el anillo (deseado). No se añaden deps.

**Verificación:**
- CI: `npm run typecheck && npm run lint && npm run test && npm run build` (corre en push).
- Revisión visual (documentada): el orbe se ve igual (sin anillo) en carga de app, auth, academia, credencial, análisis CV, loaders de tab.
- Grep de control (no es verificación, solo sanity): no debe quedar `<GeodesicOrb` sin `color` en call sites normales, ni `color={C.cyan}` en un orbe.

### Increment (b) — Animación de carga: mediano centrado → encoge a la esquina (MÁS IMPACTO)
**Qué:** En `App.tsx`, la pantalla de carga arranca con el orbe **mediano (~110px) y centrado**, texto/botón/halo en color de usuario. Cuando el gate resuelve (`authStatus` deja de ser `'loading'` y `!isLoadingProfile`), reproducir una animación corta (~0.5-0.8s) con framer-motion: el orbe **se encoge (~110 → ~44px) y se traslada hacia la esquina superior derecha** (donde está el avatar de perfil en `OrbShell`), y luego monta la app. Suave, con `ease`/spring suave, no brusco.

**Enfoque técnico seguro:**
- Introducir un estado de "transición de salida" en `AppShell`: cuando el gate pasa de cargando a listo, en lugar de desmontar el loader de golpe, renderizar un breve overlay de transición con `motion.div` (scale + translate hacia top-right) y al `onAnimationComplete` montar la app real. Alternativa más simple y robusta: `AnimatePresence` envolviendo el loader; el orbe usa `exit={{ scale: 0.4, x: <hacia derecha>, y: <hacia arriba>, opacity }}` con `transition={{ duration: 0.6, ease: 'easeInOut' }}`.
- **Degradación segura:** si la coreografía de traslado resulta riesgosa (medir posición del avatar, etc.), degradar a un fade + shrink centrado limpio. No bloquear la interacción ni retrasar el montaje de la app más de ~0.8s.
- **No romper:** el gate `(authStatus === 'loading' || isLoadingProfile) && !forceGuest`, el botón "Entrar sin cuenta →" (`setForceGuest`), ni el timeout de 5s.

**Archivos tocados:** `src/App.tsx` (y posiblemente un pequeño componente de transición en `src/shared/`).

**Riesgo:** Medio (coreografía de layout, timing). Mitigado con degradación a fade+shrink.

**Verificación:** CI verde; prueba manual de que la app monta tras la animación, el botón guest sigue funcionando, y no hay salto brusco.

### Increment (c) — Recortes finos de tamaño restantes (COSMÉTICO)
**Qué:** Alinear los últimos tamaños a la escala si se desea (p. ej. `GemeloReveal` 140/100, revisar `ConvalidaOmicron:144` 80, mini TabLoader 64). Ajustes menores de intensidad para uniformar el brillo percibido.

**Archivos tocados:** `GemeloReveal.tsx`, `ConvalidaOmicron.tsx`, `OrbShell.tsx` según convenga.

**Riesgo:** Muy bajo. Cosmético.

**Verificación:** CI verde.

---

## Notas de implementación transversales
- Usar `useUserColor()` en componentes React con hooks; `getUserColor()` solo en funciones sin contexto de hook (TabLoader, fallbacks de Suspense inline).
- No hardcodear `C.cyan` como color de orbe (es gris de marca). `C.cyan` sigue siendo válido para textos/bordes de UI donde ya se usa como plateado de marca.
- framer-motion para la animación (b); nada de nuevas libs.
- TS estricto: sin `any`, props tipadas.
- Textos: CERO jerga (mantener "Conectando a la Red Ómicrom...", "Cargando...", etc.).
