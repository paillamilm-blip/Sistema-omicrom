---
name: investigacion
description: >
  Investigación profunda para bugs complejos que resisten los fixes obvios.
  Protocolo de 6 fases: reproducir → aislar → hipotetizar → instrumentar →
  verificar → documentar. Para bugs que cruzan múltiples capas (frontend +
  backend + DB + IA), race conditions, problemas intermitentes, y todo lo que
  "a veces funciona y a veces no". Use cuando "no entiendo por qué falla",
  "bug intermitente", "investigar", "deep debug", "esto no tiene sentido",
  "a veces funciona", "solo falla en producción".
---

# 🔬 INVESTIGACIÓN — Debug Profundo para Bugs Complejos

## Filosofía

Los bugs fáciles se arreglan con `console.log`. Los bugs complejos requieren
**investigación forense**: reproducción controlada, aislamiento de variables,
hipótesis falsificables, e instrumentación quirúrgica.

**Si el fix obvio no funciona, el bug NO es lo que parece.**

---

## Cuándo Activar

- El bug resiste 2+ intentos de fix
- Es intermitente ("a veces funciona")
- Solo ocurre en producción / celular / un browser específico
- Cruza múltiples capas (frontend + Edge Function + SQL trigger)
- Race condition sospechada
- "No tiene sentido" — la lógica parece correcta pero falla

---

## Las 6 Fases de Investigación

### FASE 1: REPRODUCIR (Mandatory — sin esto no hay fix)

**Objetivo:** Convertir "a veces falla" en "SIEMPRE falla bajo estas condiciones".

```
Checklist de reproducción:
□ ¿En qué dispositivo/browser ocurre? (celular? desktop? Safari? Chrome?)
□ ¿Con qué datos del usuario? (CV largo? skills vacías? usuario nuevo?)
□ ¿En qué estado de la app? (recién logueado? después de X minutos?)
□ ¿Hay dependencia de red? (WiFi? 5G? latencia alta?)
□ ¿Es determinista o intermitente?
□ ¿Cuál es la secuencia EXACTA de pasos para reproducir?
```

**Si no podés reproducir:**
- Agregar logging temporal (que se pueda borrar después)
- Pedir al usuario un video/screenshot con DevTools abierto
- Revisar logs de Edge Functions en Supabase Dashboard
- Buscar en `reputation_history` / `audit_log` por anomalías

---

### FASE 2: AISLAR (Reducir el espacio de búsqueda)

**Objetivo:** Determinar en QUÉ CAPA está el bug real.

```
Sistema Ómicron — Capas:
┌─────────────────────────────────────────┐
│ UI (React) — ¿El componente renderiza mal? │
├─────────────────────────────────────────┤
│ Estado (Context/Query) — ¿Los datos llegan correctos? │
├─────────────────────────────────────────┤
│ Servicios (hooks) — ¿La lógica de negocio es correcta? │
├─────────────────────────────────────────┤
│ Infraestructura (ai/supabase) — ¿La llamada sale bien? │
├─────────────────────────────────────────┤
│ Edge Function (Deno) — ¿El servidor procesa bien? │
├─────────────────────────────────────────┤
│ Database (SQL triggers) — ¿Los datos se guardan correctamente? │
└─────────────────────────────────────────┘
```

**Técnica de aislamiento — "Binary Search del bug":**
1. Verificar si los datos llegan correctos al componente (log en el render)
2. Si SÍ → el bug está en la UI (render/styling/animation)
3. Si NO → bajar una capa. ¿El hook retorna datos correctos?
4. Si SÍ → el bug está entre hook y componente (re-render, stale closure)
5. Si NO → bajar otra capa. ¿El servicio/fetch retorna bien?
6. Repetir hasta encontrar la capa EXACTA donde los datos se corrompen

---

### FASE 3: HIPOTETIZAR (Generar teorías falsificables)

**Objetivo:** Antes de fixear, tener al menos 2-3 hipótesis de causa raíz.

```
Template de hipótesis:
"El bug ocurre porque [causa] bajo [condiciones], lo que produce [efecto].
Si mi hipótesis es correcta, entonces [predicción verificable]."
```

**Hipótesis comunes en Sistema Ómicron:**

| Patrón | Hipótesis típica | Verificación |
|--------|------------------|--------------|
| UI se congela | Race condition entre estado y render | ¿Se reproduce con React.StrictMode? |
| Datos desactualizados | Canal Realtime no se suscribió | Verificar Supabase Dashboard → Realtime |
| Edge Function timeout | Modelo de IA lento + platform kill | Verificar logs en Supabase Functions |
| Escritura ignorada | Trigger `protect_profile_columns` | Verificar que el campo NO está protegido |
| Skill no aparece | `skills_detail` vacío o mal formateado | Log de `buildSkillNodes()` input |
| Auth loop | `onAuthStateChange` dispara `loadProfile` 2x | Log de INITIAL_SESSION vs SIGNED_IN |

---

### FASE 4: INSTRUMENTAR (Agregar visibilidad temporal)

**Objetivo:** Confirmar o refutar hipótesis con datos reales, no intuición.

**Instrumentación temporal (SIEMPRE borrar después del fix):**

```typescript
// Patrón: log estructurado con contexto
console.log('[INVESTIGATE] punto de control', {
  fase: 'antes de callAI',
  datos: { textLength: text.length, hasProfile: !!profile },
  timestamp: Date.now(),
});
```

**Para Edge Functions (Supabase Dashboard → Logs):**
```typescript
console.log(JSON.stringify({
  level: 'INVESTIGATE',
  function: 'proxy-ai',
  step: 'gemini-call',
  inputSize: body.messages.length,
  timestamp: new Date().toISOString(),
}));
```

**Para race conditions:**
```typescript
// Numerar ejecuciones para detectar duplicados
const gen = ++globalGeneration;
console.log(`[INVESTIGATE] activateGemelo START gen=${gen}`);
// ... await ...
console.log(`[INVESTIGATE] activateGemelo AFTER-AWAIT gen=${gen}, cancelled=${cancelledRef.current}`);
```

**Para timing issues:**
```typescript
const t0 = performance.now();
const result = await someAsyncOp();
console.log(`[INVESTIGATE] someAsyncOp took ${(performance.now() - t0).toFixed(0)}ms`);
```

---

### FASE 5: VERIFICAR (Confirmar el fix, no solo que "no tira error")

**Objetivo:** El fix resuelve la causa raíz Y no introduce bugs nuevos.

```
Checklist de verificación post-fix:
□ ¿El bug original ya NO se reproduce? (re-ejecutar los pasos de Fase 1)
□ ¿El happy path sigue funcionando? (flujo normal sin el bug)
□ ¿Los edge cases están cubiertos? (datos vacíos, timeout, offline)
□ ¿El fix funciona en celular? (si el bug era mobile-specific)
□ ¿Los tests existentes siguen pasando?
□ ¿Se removió TODA la instrumentación temporal? (Fase 4 cleanup)
□ ¿La performance no se degradó? (si agregaste timeouts/retries)
```

**Verificación cruzada (sinergia):**
- Si el fix tocó tipos → ¿fluyen correctamente? (activar SINERGIA §1)
- Si el fix tocó Edge Functions → ¿CORS + body + response OK? (SINERGIA §3)
- Si el fix tocó reputación → ¿fórmula consistente? (SINERGIA §4)

---

### FASE 6: DOCUMENTAR (Para que el próximo no sufra lo mismo)

**Objetivo:** Convertir la investigación en conocimiento reusable.

```
Documentación obligatoria:
1. Registrar en QA-MEMORIA (activar qa-memoria skill)
2. Si descubriste un patrón nuevo → agregarlo a Patrones Aprendidos
3. Si el bug era por una asunción falsa → documentar la verdad
4. Si necesita prevención → agregar check a la Fase de SINERGIA
```

---

## Herramientas de Investigación

### Para bugs de UI/React:
- React DevTools → Components → ver props/state en vivo
- React DevTools → Profiler → detectar re-renders excesivos
- `console.trace()` para ver la call stack completa
- `React.StrictMode` duplica efectos → expone bugs de cleanup

### Para bugs de red/API:
- DevTools → Network tab → ver request/response exactos
- Supabase Dashboard → Edge Function Logs
- `supabase.functions.invoke()` retorna `{ data, error }` — loguear AMBOS

### Para bugs de estado:
- `useEffect` con console.log del valor trackeado
- Verificar que el `deps` array del useEffect es correcto
- Buscar stale closures (ref vs state)

### Para bugs de SQL/triggers:
- Supabase Dashboard → SQL Editor → ejecutar query manual
- Verificar con `SELECT * FROM profiles WHERE id = 'xxx'` post-acción
- Revisar `reputation_history` para ver si el trigger disparó

### Para race conditions:
- Numerar generaciones (gen counter)
- `Promise.allSettled()` en vez de `Promise.all()` para ver cuál falla
- Agregar delays artificiales (`await sleep(2000)`) para amplificar la race

---

## Output Format

```
🔬 INVESTIGACIÓN — [título del bug]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 Reproducción: [pasos exactos]
🎯 Capa aislada: [frontend / estado / servicio / edge-fn / SQL]

Hipótesis:
  H1: [descripción] → ❌ refutada (porque: ...)
  H2: [descripción] → ✅ CONFIRMADA

📊 Evidencia:
  - Log muestra que [dato X] llega como [valor Y] en vez de [valor esperado]
  - Timing: la operación tarda [N]ms (esperado: [M]ms)

🔧 Fix aplicado:
  [descripción del fix + archivos]

✅ Verificación:
  - Bug no se reproduce: OK
  - Happy path: OK
  - Edge cases: OK
  - Instrumentación removida: OK

📝 Registrado en QA-MEMORIA como BUG-XXX
```

---

## Reglas de Hierro

1. **NUNCA aplicar un fix sin entender la causa raíz** — "a ver si esto lo arregla" NO es investigación
2. **SIEMPRE reproducir ANTES de fixear** — si no se reproduce, no se puede verificar el fix
3. **Los intentos fallidos son oro** — documentarlos previene que otro lo intente
4. **Instrumentación temporal se BORRA siempre** — no dejar logs de debug en producción
5. **Un bug cross-layer requiere verificar TODAS las capas tocadas** (activar SINERGIA al final)
6. **Si después de 3 hipótesis refutadas no hay progreso** → pedir ayuda / contexto externo
7. **El fix más simple que resuelve la causa raíz es el mejor** — activar Ponytail para el fix
