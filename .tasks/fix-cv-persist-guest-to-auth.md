# Fix: el CV analizado como invitado no se guarda tras registrarse/iniciar sesión

## Síntoma (reproducido en vivo)

Un usuario sube su CV como **invitado**. El análisis de IA funciona (la consola
muestra `[Omicron] Analysis complete: {...}` con nombre, años, 12 skills, ejes y
resumen reales). El usuario ve el `GemeloReveal` (5 actos), toca
**"Activar mi Gemelo Digital"**, se abre el `AuthOverlay`, se registra / inicia
sesión... y el CV analizado **nunca se guarda**. El perfil conserva solo los
datos del onboarding (`cv_summary: "Profesional en Ingeniero industrial."`,
`num_skills: 1`, todos los ejes = 50). Verificado por SQL: los datos analizados
no persistieron.

## Causa raíz (confirmada leyendo el código)

Archivo: `src/hooks/useGemeloActivation.ts`.

El dossier analizado vive **solo en memoria de React**:

- `const [dossier, setDossier] = useState<AnalyzedProfile|null>(null)` y su
  espejo `dossierRef` (sincronizado por efecto).
- `const [pendingPersist, setPendingPersist] = useState(false)`.

Camino de guardado previsto para invitados: `persistAnalysis()` cuando no hay
sesión hace `setPendingPersist(true)` + dispara `omicron:request-auth`; más
tarde un efecto:
`if (pendingPersist && profile?.id && dossierRef.current) { void persistAnalysis(dossierRef.current); setPendingPersist(false); }`.

**El problema:** cuando el usuario se autentica, el cambio de estado de auth
**re-monta el árbol** donde vive el hook. En `src/App.tsx`, `AppShell` calcula
`const isGuest = authStatus === 'unauthenticated' || forceGuest;` y la UI que
contiene `OrbShell` → `ConvalidaOmicron` (único consumidor de
`useGemeloActivation`, confirmado por grep) se re-renderiza al pasar de invitado
a autenticado. La instancia del hook que sostenía `dossierRef.current` y
`pendingPersist = true` se **destruye y recrea limpia** (`dossier = null`,
`pendingPersist = false`). El CV analizado en memoria se pierde **antes** de que
el efecto de persistencia dispare. Nada se guarda.

## Hechos que acotan el bug

- El RPC `aplicar_analisis_cv` está **bien** (verificado en vivo: escribe
  full_name/skills/cv_summary/skills_detail/axes; los ejes usan GREATEST). El bug
  **no es la base de datos**.
- El análisis está **bien** (la consola muestra los datos completos). El bug es
  puramente el traspaso invitado→auth con pérdida de memoria.
- Tipo `AnalyzedProfile` (`@/features/gemelo/services/cvAnalyzer`): `name`,
  `seniorLabel`, `seniorLevel`, `years`, `skills` (string[]), `labels` (string[]),
  `skillsDetail` ({name, pct}[]), `summary`, `creativity`, `arch`,
  `axes` ({exec, qual, trans, fund}), `avatar?`.
- Patrón invitado existente: `src/shared/utils/guestMode.ts`
  (`getGuestProfile`/`saveGuestProfile`/`clearGuestProfile`) y
  `AuthOverlay.tsx` tiene `migrateGuestProfile()` que corre en login y escribe
  campos del guestProfile más liviano (skills, summary, ejes) **con un `UPDATE`
  directo a `profiles`, no vía `aplicar_analisis_cv`**. Ese camino NO transporta
  el `skillsDetail` con % reales ni usa la lógica GREATEST del RPC, y solo se
  llena si existe `omicron_guest_profile` (que el flujo de reveal no
  necesariamente escribe).

## Solución elegida — Puente en localStorage (Opción 1, la más robusta y simple)

El dossier analizado debe **sobrevivir al re-montaje** invitado→auth (y a un
reload completo). Se persiste el dossier a `localStorage` cuando el análisis
completa y el usuario NO está autenticado; al montar el hook (o cuando el perfil
pasa a autenticado) si existe un análisis pendiente Y el usuario ya está
autenticado, se llama a `aplicar_analisis_cv` con ese dossier y se limpia la
clave.

Ventajas frente a las otras opciones:

- Sobrevive re-montajes **y** reloads completos (a diferencia de subir el estado
  por encima del límite de montaje, opción 3, que es más grande y riesgosa).
- Usa el **mismo RPC canónico** `aplicar_analisis_cv` (con GREATEST en ejes y
  `skills_detail` con % reales), a diferencia de reusar `migrateGuestProfile()`
  (opción 2) que hace un UPDATE más pobre.
- No toca la ruta autenticada que ya funciona (auth sube CV → auto-persist).

### Clave y contrato

- Clave localStorage: `omicron_pending_cv_analysis`.
- Helpers puros nuevos en `src/shared/utils/guestMode.ts` (junto a los demás
  helpers de invitado, mismo patrón try/catch con guardas `typeof`):
  - `savePendingCvAnalysis(profile: AnalyzedProfile): void`
  - `getPendingCvAnalysis(): AnalyzedProfile | null` (parseo defensivo: valida
    forma mínima `axes` + `name`/`labels`; si el JSON es inválido o incompleto,
    retorna `null`).
  - `clearPendingCvAnalysis(): void`
  - `hasPendingCvAnalysis(): boolean`
  - Importa el `type AnalyzedProfile` como **type-only import**
    (`import type { AnalyzedProfile } from ...`) para no crear dependencia de
    runtime ni ciclos.

### Cambios en `useGemeloActivation.ts`

1. Al **completar el análisis** (justo tras `setDossier(analyzed)` en
   `activateGemeloCompleto`), si `!profile?.id` → `savePendingCvAnalysis(analyzed)`.
   Esto ocurre **antes** de que el usuario toque "Activar" y antes del re-montaje.
   La ruta autenticada (`if (profile?.id)` → auto-persist a los 100ms) queda
   **intacta**; solo se agrega el guardado para el caso invitado.
2. En `persistAnalysis`, tras un guardado **exitoso**, llamar a
   `clearPendingCvAnalysis()` (junto a la limpieza del phantom timer) para
   garantizar idempotencia y no re-guardar.
3. Nuevo efecto de **rescate al montar / al autenticarse**: cuando
   `profile?.id` existe y `hasPendingCvAnalysis()` es true y aún no se ha
   persistido en esta instancia, leer el dossier con `getPendingCvAnalysis()`,
   sembrar el estado (`setDossier`, `setPhase('reveal')`, `setAi`, `setSynergies`)
   para que el usuario vea el reveal correcto tras loguear, y llamar
   `void persistAnalysis(rescued)`. Debe ejecutarse una sola vez por dossier
   (guard con un `useRef` booleano de "rescate ya intentado") para no crear
   loops. `persistAnalysis` ya limpia la clave al terminar bien, cerrando el
   ciclo.
4. Conservar el efecto `pendingPersist` existente (sigue cubriendo el caso raro
   en que NO hubo re-montaje: guarda desde memoria). No se elimina para no
   romper la ruta que hoy sí funciona en ese escenario.

### Idempotencia / seguridad

- Nunca doble-guardar: la clave se limpia tras el primer guardado exitoso; el
  efecto de rescate corre una sola vez por montaje mediante `useRef`.
- El RPC ya aplica `GREATEST` en ejes, así que rellenar un perfil vacío con el
  CV es exactamente lo que se busca; no clobbea un perfil más rico.
- `localStorage` siempre protegido con `try/catch` y guardas `typeof` (mismo
  patrón que el resto de `guestMode.ts`).
- Sin dependencias nuevas. TypeScript estricto. Copy sin jerga.

## Qué NO debe romperse

- Ruta autenticada actual (usuario con sesión sube CV → auto-persist funciona).
- Onboarding, el Reveal y el phantom timer.
- `migrateGuestProfile()` de `AuthOverlay` (se deja tal cual; el puente nuevo es
  independiente y usa el RPC canónico).

## Verificación

- Una prueba runnable co-locada `src/shared/utils/guestMode.test.ts` (Vitest,
  mismo patrón que `orbFusion.test.ts`) que ejercite el round-trip puro
  save→get→clear del puente, incluyendo: (a) round-trip preserva
  `axes`/`labels`/`skillsDetail`/`name`, (b) JSON inválido → `getPendingCvAnalysis()`
  retorna `null` sin lanzar, (c) objeto sin `axes` → `null`, (d) `clear` deja
  `has` en false. La prueba usa un stub simple de `localStorage` si el entorno
  jsdom no lo provee (jsdom sí lo provee; se usa directamente).
- CI en GitHub Actions valida `tsc --noEmit`, `eslint .`, `vitest --run` y
  `vite build`. No se puede correr localmente (INTEGRATIONS_ONLY, node_modules
  hueco); CI es la fuente de verdad.
- Razonamiento de supervivencia al re-montaje: el dossier se escribe a
  localStorage en el momento del análisis (invitado, pre-remonte); tras el
  montaje limpio post-auth, el efecto de rescate lo lee y lo persiste vía el RPC.

## Archivos a tocar

- `src/shared/utils/guestMode.ts` (helpers del puente + type-only import).
- `src/hooks/useGemeloActivation.ts` (guardar al analizar como invitado; limpiar
  al persistir; efecto de rescate al montar/autenticar).
- `src/shared/utils/guestMode.test.ts` (nuevo, prueba runnable del puente).
