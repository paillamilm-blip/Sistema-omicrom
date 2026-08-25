---
name: sinergia
description: >
  Verificación de conexión total del codebase. Garantiza que TODO está conectado:
  tipos fluyen end-to-end, imports son válidos, providers envuelven consumers,
  Edge Functions alinean con el cliente, triggers SQL reflejan la lógica del frontend,
  y el modelo de reputación es consistente entre servidor y cliente.
  Use cuando se hace un cambio que toca múltiples capas, cuando algo "debería funcionar
  pero no funciona", cuando se agrega una feature nueva, o cuando se dice "sinergia",
  "está todo conectado?", "verificar conexiones", "check e2e".
---

# ⚡ SINERGIA — Verificación de Conexión Total

## Filosofía

En Sistema Ómicron, **todo está conectado con todo**:
- El CV del usuario → genera skills → alimenta el orbe 3D → determina job matching
- Los 4 ejes del Gemelo → se calculan en SQL triggers → el frontend los lee via Realtime
- Las Edge Functions → reciben del cliente → responden con formato esperado → Zod valida

**Un solo eslabón roto = el sistema entero falla silenciosamente.**

Esta skill verifica que las conexiones entre capas son correctas y consistentes.

---

## Cuándo Activar

- Después de CUALQUIER cambio que toque más de 1 capa (frontend + backend, o tipos + UI)
- Cuando un feature "funciona en dev pero no en producción"
- Cuando se agrega un campo nuevo a Profile, una Edge Function nueva, o un trigger SQL
- Cuando algo se queda "pegado" sin error visible
- Manualmente: "sinergia", "todo conectado?", "check conexiones"

---

## Las 7 Verificaciones de Sinergia

### 1. TIPOS → ¿Los tipos fluyen end-to-end?

```
src/types/ → componentes → hooks → services → Edge Functions
```

**Verificar:**
- [ ] Si agregaste un campo a `Profile`, ¿está en `src/types/profile.ts`?
- [ ] ¿El tipo `Profile` del frontend coincide con las columnas de `profiles` en Supabase?
- [ ] ¿Las Edge Functions retornan el formato que el cliente espera (Zod schema)?
- [ ] ¿Los RPCs (`supabase.rpc()`) reciben los parámetros que el SQL espera?

**Comando de verificación:**
```bash
# Buscar campos de Profile que existen en tipos pero no en SQL (o viceversa)
grep -oP '^\s+\w+' src/types/profile.ts | sort > /tmp/ts-fields.txt
grep -oP 'profiles\.\w+' supabase/migrations/*.sql | grep -oP '\.\K\w+' | sort -u > /tmp/sql-fields.txt
diff /tmp/ts-fields.txt /tmp/sql-fields.txt
```

---

### 2. PROVIDERS → ¿Los Context providers envuelven a sus consumers?

```
App.tsx: QueryClientProvider > AppProvider > ToastProvider > RealtimeProvider > EmotionBridge > AppShell
```

**Verificar:**
- [ ] ¿Todo componente que usa `useApp()` está dentro de `AppProvider`?
- [ ] ¿Todo componente que usa `useNavigation()` está dentro de `NavigationProvider`?
- [ ] ¿Todo componente que usa `useProfile()` está dentro de `ProfileProvider`?
- [ ] ¿`NavigationProvider` está DENTRO de `ProfileProvider` (depende de profile.id)?
- [ ] ¿`RealtimeProvider` tiene acceso a `profile` via `useApp()`?

**Test rápido:** Si un hook tira "must be used inside XProvider", el árbol de providers está mal.

---

### 3. EDGE FUNCTIONS → ¿Cliente y servidor hablan el mismo idioma?

```
Frontend (callAI) → supabase.functions.invoke('proxy-ai') → Edge Function → respuesta
```

**Verificar:**
- [ ] ¿El `body` que envía el cliente tiene exactamente los campos que el servidor lee?
- [ ] ¿El formato de respuesta `{ text, model }` o `{ error }` se respeta?
- [ ] ¿Los headers CORS permiten el origen correcto?
- [ ] ¿Los timeouts del cliente (25s) son menores que el timeout del servidor (40s)?
- [ ] ¿Rate limiting en servidor y cliente están alineados?

**Para cada Edge Function nueva:**
1. Verificar que `supabase.functions.invoke('nombre')` usa el nombre correcto
2. Verificar que el body schema del request matchea lo que el servidor parsea
3. Verificar que la respuesta se maneja correctamente (happy path + error path)

---

### 4. REPUTACIÓN → ¿La fórmula es consistente en todas partes?

```
DEFINICION_REPUTACION_OMICROM.md = fuente de verdad
  ↓ reflejado en:
supabase/migrations/0050_reputacion_canonica.sql (trigger real)
src/features/gemelo/services/reputation.ts (cliente, read-only mirror)
```

**Verificar:**
- [ ] `experience_score = promedio(4 ejes)` en AMBOS lados
- [ ] `reputation_score = 0.20 * traditional + 0.80 * experience + momentum(PE)` en AMBOS
- [ ] `momentum = min(15, sqrt(pe_points) / 4)` en AMBOS
- [ ] El cliente NUNCA escribe ejes (trigger `protect_profile_columns` lo revierte)
- [ ] `calculateMatchScore()` usa la misma fórmula que el trigger

---

### 5. REALTIME → ¿Las suscripciones están vivas?

```
ProfileContext: canal `reputation-changes-{userId}` → UPDATE en profiles
NavigationContext: canal `notif-count-{profileId}` → INSERT en notifications
RealtimeContext: canal `omicron-live` → broadcast de progresión
```

**Verificar:**
- [ ] ¿Los canales se suscriben con el filtro correcto (`filter: id=eq.${userId}`)?
- [ ] ¿Se limpian con `supabase.removeChannel()` en el cleanup del efecto?
- [ ] ¿El debounce (300ms) no traga updates importantes?
- [ ] ¿Si el usuario se desloguea, los canales se desuscriben?

---

### 6. NAVEGACIÓN → ¿Orbe ↔ Tabs ↔ URLs son consistentes?

```
HUB_NODES[].tab → TabId → routes.ts path → URL → tabFromPath() → activeTab
```

**Verificar:**
- [ ] ¿Cada hub node en `OrbShell.tsx` tiene un `tab` que existe en `TabId`?
- [ ] ¿Cada `TabId` tiene una ruta en `routes.ts`?
- [ ] ¿El Oráculo (`interpret()`) reconoce palabras para TODOS los tabs?
- [ ] ¿`renderTab()` en OrbShell tiene un case para CADA TabId?
- [ ] ¿Los lazy imports en OrbShell apuntan a archivos que EXISTEN?

---

### 7. ORBE → ¿Skills del CV generan nodos correctamente?

```
profile.skills[] → buildSkillNodes() → OrbNode[] → orbNodesWithLevels → render 3D
profile.skills_detail[] → pct lookup → node.level (0-1)
SYNERGY_GROUPS → detecta 2+ skills del mismo grupo → +0.08 bonus
```

**Verificar:**
- [ ] ¿`skills` y `skills_detail` llegan del servidor con datos reales (no vacíos)?
- [ ] ¿`buildSkillNodes()` maneja el caso `skills = []` (muestra INVITATION_NODES)?
- [ ] ¿El fuzzy matching de `lookupPct()` no genera falsos positivos?
- [ ] ¿Los SYNERGY_GROUPS usan word boundaries para evitar contaminación cruzada?
- [ ] ¿`categorizeSkill()` rutea skills desconocidas a un tab válido (fallback 'maxskill')?

---

## Protocolo de Ejecución

Cuando se activa SINERGIA:

1. **Identificar las capas tocadas** por el cambio actual
2. **Ejecutar SOLO las verificaciones relevantes** (no las 7 siempre)
3. **Reportar desconexiones** encontradas con ubicación exacta (archivo:línea)
4. **Proponer el fix** mínimo para reconectar
5. **Verificar que el fix no rompe otra conexión** (efecto cascada)

---

## Output Format

```
🔗 SINERGIA CHECK — [fecha]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Capas verificadas: [tipos, providers, edge-functions, ...]

✅ Tipos: Profile.ts ↔ SQL profiles — alineados
✅ Providers: árbol correcto (Query > App > Toast > Realtime > Emotion)
⚠️ Edge Function: proxy-ai espera `jsonMode` pero el cliente envía `json_mode`
   → Fix: renombrar a `jsonMode` en el body del cliente (client.ts:45)
✅ Reputación: fórmula consistente en 3 ubicaciones
✅ Realtime: 3 canales activos, cleanup correcto

Conexiones: 6/7 OK | 1 warning
```

---

## Reglas de Hierro

1. **Si tocás un tipo, verificá que los 3 lados lo reflejan** (TS, SQL, Edge Function)
2. **Si agregás una Edge Function, verificá CORS + body schema + error handling**
3. **Si movés un archivo, verificá que TODOS los imports siguen resolviéndose**
4. **Si cambiás la fórmula de reputación, actualizá los 3 lugares + el doc**
5. **Si el orbe no muestra nodos, verificá la cadena: skills → buildSkillNodes → render**
6. **NUNCA asumas que "funciona porque compila"** — la sinergia es runtime
