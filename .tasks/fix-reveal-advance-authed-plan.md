# Fix: reveal no avanza para usuario ya autenticado tras "Guardar mi Gemelo Digital"

## Síntoma (reportado por el usuario)
Usuario ya registrado sube su CV actualizado, aprieta "Guardar mi Gemelo Digital" y la pantalla no avanza (parece congelada). Debe cerrar y reabrir la app; al reabrir, como ya está logeado, todo aparece guardado.

## Causa raíz (verificada en código)
Es un bug de transición de estado de UI, NO de persistencia.
- El CTA del reveal (`GemeloReveal.tsx`, acto 'cta') llama `onActivate` → `persistAnalysis()` del hook `useGemeloActivation.ts`.
- `persistAnalysis` guarda vía RPC aditivo `aplicar_analisis_cv`, hace `setPersisted(true)`, `refreshProfile()`, `runAutoChain()`, limpia el puente localStorage. Pero NUNCA cambia `phase` ni cierra el overlay `ConvalidaOmicron`.
- Nada consume el flag `persisted`, así que el reveal queda en pantalla. El usuario ve además copy pensado para invitados (advertencia de pérdida, countdown, comparación "Sin cuenta vs Con cuenta").
- Para usuarios autenticados también existe un auto-persist (setTimeout 100ms tras el reveal), por lo que el guardado suele estar hecho antes de tocar el botón.

## Arreglo (1 incremento, FEAT-001)
1. Hook `useGemeloActivation.ts`: agregar flag `persisting` (solo en la rama autenticada del RPC, reseteado en todas las salidas éxito/error/catch) y exponerlo. `persisted` ya existe y se mantiene.
2. `ConvalidaOmicron.tsx`: pasar `persisting`, `persisted` y `onClose` a `<GemeloReveal>`.
3. `GemeloReveal.tsx`:
   - Botón CTA autenticado muestra estado "Guardando…" (deshabilitado) y luego "✓ Guardado".
   - Efecto: si `isAuthenticated && persisted`, tras ~900ms llamar `onClose()` para cerrar el overlay y devolver al usuario a la app con su Gemelo guardado visible.
   - Ocultar para autenticados: línea de pérdida, grilla "Sin cuenta / Con cuenta" y caja de countdown; mostrar en su lugar confirmación neutra "Tu Gemelo Digital queda guardado en tu perfil."
4. Camino invitado: sin cambios.

## Restricciones
- Español latino neutro, marca "Ómicrom" con M.
- Persistencia aditiva vía `aplicar_analisis_cv`; mantener puente localStorage + rescate guest→auth.
- Sin SQL. Sin nuevo EventName (el persist exitoso ya dispara `track('cv_uploaded')`).
- Prohibido `@ts-nocheck`/`@ts-ignore`. `// eslint-disable-next-line react-hooks/exhaustive-deps` permitido.
- No se puede compilar/testear local (node_modules hollow, red INTEGRATIONS_ONLY); CI es la fuente de verdad.
