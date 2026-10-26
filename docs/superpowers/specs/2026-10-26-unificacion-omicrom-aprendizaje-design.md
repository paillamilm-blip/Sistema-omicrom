# Spec · Unificación: el mapa neuronal de aprendizaje continuo dentro de Ómicrom

**Fecha:** 2026-10-26
**Estado:** aprobada en conversación (decisiones del dueño marcadas ✅)
**Repos:** huésped `Sistema-omicrom` (2026-10-23/ea694392) · donante app-CV (2026-10-24/bb1434fb, se retira)

---

## 1. Objetivo y ley del proyecto

Ómicrom pasa a ser **el producto único**. La app CV deja de existir como proyecto
separado y sus dos bienes — el motor de diagnóstico con IA y el sistema visual de
aprendizaje (escaneo → mapa neuronal → desbloqueo → camino registrado) — se portan
a Ómicrom sin perder nada de lo visual.

**Ley de salida (decisión del dueño, 26/10):** el proyecto NO está cumplido hasta que
un paso de aprendizaje completado se vea en el Gemelo **y** en la red **en tiempo real
(< 3 segundos), medido con dos sesiones conectadas a la vez** — la métrica única de
`PLAN_APRENDIZAJE_TIEMPO_REAL.md`, hoy en 0, es la métrica maestra de esta spec.
"Ninguna fase de visual termina sin su contraparte de tiempo real medida."

## 2. Decisiones tomadas (no re-abrir)

| # | Decisión | Origen |
|---|---|---|
| D1 | Ómicrom como producto único; la app CV se retira | ✅ dueño |
| D2 | Se porta también el análisis Gemini de brechas (no solo el mapa) como Edge Function | ✅ dueño |
| D3 | Fase 0 de limpieza incluida antes de construir | ✅ dueño |
| D4 | Todo lo visual del sistema de aprendizaje se mantiene intacto, sobre todo el mapa neuronal | ✅ dueño |
| D5 | El color protagonista del mapa es 100% el color elegido del Gemelo; el ámbar de la app CV desaparece | ✅ dueño |
| D6 | El orbe 3D no absorbe el mapa: el mapa es la vista de aprendizaje; el orbe recibe el estado de las brechas como actividad real vía `orbFusion` | diseño aprobado |
| D7 | Dominar una brecha no mueve el 20/80 ni los ejes en esta fase (autodeclaración ≠ evidencia verificable) y la UI nunca dice "Verificada" por eso | diseño aprobado |

## 3. Arquitectura

```
Cliente Ómicrom (React+Vite, theme tokens, color del usuario)
  ├─ EscaneoCv ──┐ (evento real por paso del pipeline)
  │              ├─► Edge Function analizar-cv (Gemini + zod + fixture)
  ├─ MapaCapacidades (SVG 2D, layout radial determinista)
  ├─ Cola de brechas (workspace 2 col ≥900px, apilado mobile-first)
  └─ Camino registrado (línea cronológica + timeline fechada)
                 │
Supabase: analisis_cv + brechas_aprendizaje (RLS por usuario)
                 │ realtime: canal único omicron-live (broadcast de pasos +
                 postgres_changes sobre brechas_aprendizaje) → Gemelo, red y orbe
```

Piezas portadas sin reescribir (verificadas sin dependencias de Next.js):
`lib/ai/gemini.ts`, `lib/ai/validar.ts`, `lib/ai/fixture.ts`,
`components/EscaneoCv.tsx`, `components/MapaCapacidades.tsx`,
`components/PanelReporte.tsx` (cola de revisión), estados y animaciones de la app CV.

## 4. Modelo de datos (migración `10012_aprendizaje_continuo.sql`)

Nomenclatura en español, como las migraciones y RPCs existentes (`convalidar_credencial`).

**`analisis_cv`**: `id uuid pk`, `user_id references auth.users`, `nombre_archivo text`,
`ocupacion`, `nivel`, `resumen text`, `proveedor text`, `simulado boolean`,
`created_at timestamptz default now()`.

**`brechas_aprendizaje`**: `id uuid pk`, `analisis_id references analisis_cv on delete cascade`,
`user_id`, `categoria text check in ('dura','blanda','conocimiento','credencial')`,
`titulo`, `evidencia`, `por_que_importa`, `severidad text check in ('alta','media','baja')`,
`aprender_que / aprender_como / aprender_demuestro text`,
`state text check in ('detectada','confirmada','rechazada','dominada') default 'detectada'`,
`confirmed_at timestamptz null`, `mastered_at timestamptz null`,
`created_at timestamptz default now()`.

Reglas:
- RLS: solo dueño lee/escribe sus filas; índice `(user_id, created_at desc)`.
- Transiciones válidas server-side (RPC `marcar_brecha`): `detectada → confirmada |
  rechazada`; `confirmada → dominada | rechazada`; `rechazada → confirmada` (reactiva);
  `dominada` no revierte. Fuera de orden → error, no silencio.
- **Mapa y camino (sin ambigüedad):** el **mapa** muestra las brechas del run activo
  (el último análisis), y las ya confirmadas/dominadas de runs anteriores aparecen en su
  color encendido/dominado — el mapa nunca "reinicia" el progreso de una skill repetida
  (una skill se identifica por `titulo` normalizado por usuario; una brecha confirmada en
  un run viejo sigue encendida aunque salga en un análisis nuevo). El **camino registrado**
  es global: ordena por `confirmed_at`/`mastered_at` entre todos los runs del usuario.
- Modo invitado: el run invitado vive en `localStorage` (puente obligatorio del producto);
  al autenticarse, `App.tsx` lo sube a Supabase en el primer `authStatus` autenticado.
- No se toca nada de `knowledge_vault`/Bóveda (salió del producto, 10006–10010).

## 5. Motor IA: Edge Function `analizar-cv`

- Entrada: texto extraído del PDF (parser isomórfico de la app CV corre en cliente) + perfil básico del Gemelo para contexto.
- Lógica: port literal de `gemini.ts` + `validar.ts` (zod) + `fixture.ts` (modo simulado con la misma señal `simulado:true` que ya manejan tests y UI).
- Key solo server-side; huella de build en headers `x-omicron-build: <fase>` (patrón probado en 6E/6F).
- CORS con la lista de orígenes inline (lección 6F: `_shared` se congela por función; no importar).
- Tope diario server-side: tabla liviana `analysis_usage(user_id, day, count)` o RPC; mismo espíritu que `usoDeHoy()` de la app CV; respuesta clara de "sin cupos" sin inventar datos.
- El resultado IA **además** alimenta los nodos de skills del orbe (enriquece, no reemplaza, al `cvAnalyzer.ts` heurístico).

## 6. Visual (intacto, con ajustes mínimos)

**Se porta literal:** los 4 actos (escaneo con eventos reales de pipeline; red que nace
en orden con root→4 ramas→brechas, trazos que se dibujan, nodos que escalan al nacer,
stagger 45 ms, 150–300 ms; desbloqueo en 3 estados con pulso y micro-nodo de logro,
rechazadas a gris apagado sin crecer; camino como línea cronológica sobre el mapa +
timeline fechada debajo), layout radial determinista (mismo mapa cada vez), workspace
2 columnas ≥900px (mapa al centro, cola a la derecha, header sticky con progreso) y
apilado mobile-first, objetivo <2 viewports de scroll.

**Ajustes obligatorios:**
- D5: `--accent` ámbar → color elegido del Gemelo (los 4 existentes; por defecto el color
  default en modo invitado). Severidad se expresa con tamaño + opacidad de trazo, no con
  colores nuevos. Los grises de la app CV (`#0b0d10`/`#14171c`) se reemplazan por los
  tokens de fondo de Ómicrom; todo valor sale de `src/theme/`, cero hex huérfanos.
- Prohibiciones vigentes: nunca `#5cc8ff`, nunca cian de marca, sin webfonts,
  `prefers-reduced-motion` en el mismo commit, táctiles ≥44 px, foco visible con color
  del usuario, color nunca único portador de significado.
- Cero jerga: "Tu Excel está en 45/100 — este trabajo pide 60/100"; nada de "ADN";
  "Ya lo aprendí" se muestra como declarado, jamás "Verificada".
- El orbe (`OrbShell`) recibe vía `computeOrbFusion` los estados reales de brechas: nodo
  que nace al confirmar, brillo al dominar — y el ticker del orbe muestra solo
  aprendizajes auténticos (se elimina el broadcast simulado, ~L1023).

## 7. Tiempo real (la ley de salida)

- **Emisión:** al confirmar/dominar (RPC server-side), un trigger o la propia RPC emite
  el evento al canal único `omicron-live` (broadcast `kind:'aprendizaje'` con dados
  validados server-side: skill, título, estado, usuario). No se abre canal nuevo
  (riesgo flood conocido).
- **Recepción:** `useRealtimeNetwork` muestra el paso en el ticker de la red;
  `MapaCapacidades` y la cola se suscriben a `postgres_changes` de `brechas_aprendizaje`
  (patrón ya usado por `reputation-changes` en `ProfileContext`); el Gemelo refresca
  camino/racha sin recargar.
- **Racha:** pasa a server-side (`register_daily_activity` ya existe; UI deja de leer
  `localStorage` como fuente de verdad, solo caché offline) — criterio de salida Fase 2
  del plan original: racha idéntica en 2 dispositivos tras 2 días.
- **Medición:** dos sesiones conectadas, 10 intentos, cronometrar aparición en B.

## 8. Error handling

- IA falla o JSON inválido → error visible + "Reintentar" (regla "nunca datos falsos");
  `simulado:true` solo cuando es intencional (tests/demo) y etiquetado como tal en la UI.
- RPC con transición inválida → 4xx con mensaje entendible ("Ya marcaste esto como
  dominado — no se puede volver atrás").
- Realtime caído → la UI sigue correcta por query al reconectar (Supabase reconexión);
  nada de estado solo-optimista sin confirmación del servidor.
- Cupo agotado → pantalla propia con el número restante, nunca tope silencioso.

## 9. Testing y verificación

- Unit: `validar.ts` portado con sus casos; tabla de transiciones de estado; `orbFusion` con brechas.
- RLS: pytest-free, dos sesiones Supabase reales cruzadas (A no ve/modifica B).
- E2E navegador: ciclo completo subir → escaneo narrado → mapa nace → confirmar → dominar →
  camino persiste **tras recargar y en el segundo dispositivo**; medición <3s en 10 intentos.
- Impeccable detector en un solo batch sobre los archivos cambiados al final (una pasada
  desktop+mobile), fix en un batch, una sola ronda de confirmación.
- CI: typecheck + lint + test verdes (obligatorio en el repo huésped).

## 10. Fases y criterios de salida

| Fase | Contenido | Hecho cuando (única métrica) |
|---|---|---|
| 0 · Limpieza | aplicar 10011 y verificar; borrar las 6 Edge Functions muertas en el orden calculado (crons primero); `PRODUCT.md`/`DEFINICION_OMICROM.md` marcan empleos/market/wallet/contratos/gobernanza/chat como visión | `cron.job_run_details` sin errores nuevos en 24 h |
| 1 · Motor | 10012 + `analizar-cv` + RPC de estados + tope diario; tests de transiciones y RLS | 10 CVs reales analizados con precisión ≥ 6/10 (métrica = confirmadas/revisadas, mismo cálculo que `metricaGlobal`) |
| 2 · Mapa vivo | port 1:1 de los 4 actos al theme + D5; `orbFusion` con brechas reales; realtime de brechas; se elimina el ticker simulado | un aprendizaje confirmado en A aparece en el mapa, la red y el orbe de B en **<3 s**, 10/10 intentos — la ley de salida se cumple en esta fase |
| 3 · Continuo | racha server-side (Fase 2 del plan original) + camino entre dispositivos + puente de modo invitado | mapa, camino y racha idénticos desde un dispositivo nuevo tras 2 días de uso |

Nota de orden: la Fase 2 fusiona el corazón de las Fases 2–3 del
`PLAN_APRENDIZAJE_TIEMPO_REAL` (realtime de brechas + orbe real) porque la ley de salida
no admite un mapa "muerto" primero. La racha (Fase 3) puede correr en paralelo con la 2
en los días que no se tocan los mismos archivos.

## 11. Fuera de alcance (decisión consciente)

- Re-análisis programado ("qué cambió desde tu último CV") — Fase 4 futura.
- Mover el mapa a 3D dentro del orbe.
- Penalizaciones/reputación 20/80 alimentadas por brechas.
- La app CV como producto independiente (se retira; su repo queda como referencia histórica).
- Activar dominios de visión (empleos, market, wallet).

## 12. Riesgos

1. **Deploy de Edge Functions** (patrón conocido): la huella `x-omicron-build` es obligatoria desde el día 1.
2. **Flood realtime**: usar solo `omicron-live`; ninguna suscripción nueva sin medir conexiones.
3. **RLS**: los payloads de broadcast llevan solo datos públicos (nombre, skill, título); todo lo demás se lee por query con RLS.
4. **Choque de mundos visuales** (resuelto por D5): el ámbar desaparece; si en la verificación el mapa se lee "de otra app", se itera sobre tokens de Ómicrom, no se vuelve al ámbar.
5. **Hydration/determinismo**: el layout radial se porta con el redondeo de coordenadas que ya arregló el mismatch en la app CV.
