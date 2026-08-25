---
name: qa-memoria
description: >
  Sistema de QA con memoria persistente. Guarda TODOS los errores encontrados,
  las iteraciones de fix, qué funcionó y qué no, y construye una base de
  conocimiento de soluciones. Cuando un bug similar aparece, consulta la memoria
  y sugiere la solución probada. Use cuando se dice "QA", "qué errores hemos
  tenido", "ese bug ya lo vimos", "guardar error", "memoria de bugs",
  "historial de fixes", "solución para esto".
---

# 🧠 QA MEMORIA — Sistema de QA con Base de Conocimiento

## Filosofía

Los bugs se repiten. Las soluciones se olvidan. Este skill:
1. **GUARDA** cada error + contexto + solución aplicada
2. **BUSCA** en la memoria cuando aparece un bug similar
3. **SUGIERE** la solución probada (no reinventa la rueda)
4. **APRENDE** de cada iteración fallida (qué NO funcionó también se guarda)

---

## Cuándo Activar

- Siempre que aparezca un error/bug (auto-activar)
- Cuando el usuario diga "QA", "ese bug ya lo vimos", "qué hicimos antes"
- Cuando un fix no funciona y hay que iterar
- Para consultar el historial: "memoria de bugs", "historial de errores"

---

## Estructura de la Memoria

Cada entrada de bug se guarda con este formato:

```json
{
  "id": "BUG-001",
  "fecha": "2026-08-25",
  "titulo": "CV analysis se queda pegado indefinidamente",
  "sintomas": [
    "UI stuck en 'Conectando con Gemini IA...'",
    "Progress bar en 0%",
    "Sin timeout visible"
  ],
  "archivos_afectados": [
    "src/hooks/useGemeloActivation.ts",
    "src/infrastructure/ai/gemini.ts",
    "src/features/omicron/components/ConvalidaOmicron.tsx"
  ],
  "causa_raiz": "Promise.race no se resolvía si la Edge Function moría a nivel de plataforma (30s kill) sin devolver respuesta",
  "intentos_fallidos": [
    {
      "intento": "Aumentar timeout a 60s",
      "resultado": "Peor — más tiempo pegado",
      "aprendizaje": "Más timeout ≠ mejor. El problema era la ausencia de safety net."
    }
  ],
  "solucion_final": {
    "descripcion": "Triple defensa: timeout reducido (25s) + safety timeout (30s) + cancel button",
    "archivos_modificados": ["useGemeloActivation.ts", "gemini.ts", "ConvalidaOmicron.tsx"],
    "patron": "Promise.race + setTimeout safety + UI escape hatch"
  },
  "tags": ["timeout", "edge-function", "ui-hang", "promise", "supabase"],
  "prevencion": "Siempre agregar safety timeout independiente del Promise.race para cualquier llamada a Edge Functions"
}
```

---

## Protocolo de Operación

### Al encontrar un bug nuevo:

```
1. REGISTRAR: Crear entrada con síntomas + archivos + contexto
2. BUSCAR: ¿Hay un bug similar en la memoria? (match por tags/síntomas)
3. SI MATCH → Sugerir la solución probada + adaptarla al caso actual
4. SI NO MATCH → Investigar (activar systematic-debugging o investigacion)
5. ITERAR: Si el fix no funciona, registrar como intento_fallido
6. RESOLVER: Cuando funcione, registrar solución_final + patrón + prevención
```

### Al consultar la memoria:

```
Usuario: "ese error ya lo vi" / "qué hicimos con X"
→ Buscar en memoria por: tags, síntomas, archivos, título
→ Retornar: la solución que funcionó + qué NO funcionó
→ Aplicar: adaptar la solución al contexto actual
```

---

## Base de Conocimiento Inicial (bugs ya resueltos)

### BUG-001: CV analysis se queda pegado
- **Tags:** timeout, edge-function, ui-hang, promise, supabase
- **Causa:** Supabase platform kill ~30s no resuelve la promise del cliente
- **Solución:** Triple defensa (timeout 25s + safety 30s + cancel)
- **Patrón:** Siempre agregar safety timeout para Edge Functions
- **PR:** #259

### BUG-002: useNavigateTab rompe TypeScript
- **Tags:** dead-code, missing-dependency, react-router-dom
- **Causa:** Archivo importaba react-router-dom que nunca se instaló
- **Solución:** Eliminar el archivo (dead code, 0 callers)
- **Patrón:** Si un import falla en CI, verificar si el módulo está en package.json
- **PR:** #258

### BUG-003: Reputación no se actualiza en tiempo real
- **Tags:** realtime, supabase, channel, debounce
- **Causa:** Canal de Supabase Realtime no tenía el filtro correcto
- **Solución:** Filter con `id=eq.${profile.id}` + debounce 300ms
- **Patrón:** Siempre verificar filtro de canal + cleanup en useEffect return

### BUG-004: Orbe no muestra skills del CV
- **Tags:** orbe, skills, buildSkillNodes, cv-analysis
- **Causa:** `skills_detail` venía vacío porque el análisis de CV falló silenciosamente
- **Solución:** Validar con Zod + fallback a skills sin pct + INVITATION_NODES como default
- **Patrón:** Nunca confiar en datos de IA sin validación Zod

### BUG-005: Doble-click en "Activar Gemelo" lanza 2 análisis
- **Tags:** double-click, ref-guard, processing-state
- **Causa:** No había protección contra double-click
- **Solución:** `isProcessingRef.current` check al inicio de la función
- **Patrón:** Toda acción async que muta estado necesita un ref guard

### BUG-006: CV analysis se queda pegado (recurrencia — cache viejo + errores genéricos)
- **Tags:** service-worker, cache, error-propagation, race-condition, credits
- **Causa:** Múltiple: (1) SW v3 servía build OLD con mensaje antiguo, (2) callAI tragaba errores específicos (créditos, timeout) y retornaba genérico, (3) race condition entre safety timeout y promise resolve
- **Solución:** SW bump a v4 + force update on load + AIError typed class + mensajes diferenciados por errorCode + check isProcessingRef post-await
- **Patrón:** (1) Siempre bumpar SW version en cada fix crítico. (2) Nunca tragar errores tipados — propagarlos hasta la UI. (3) Después de cada await, verificar que el state guard sigue activo.
- **PR:** #265

---

## Patrones Aprendidos (Anti-Patterns → Patterns)

| Anti-Pattern | Pattern Correcto | Ejemplo |
|--------------|------------------|---------|
| Timeout único sin fallback | Triple defensa (race + safety + UI) | BUG-001 |
| Dead code committed | grep callers antes de asumir que se usa | BUG-002 |
| Confiar en IA sin validación | Zod schema obligatorio | BUG-004 |
| Async sin protección de doble-ejecución | `isProcessingRef` guard | BUG-005 |
| Canal Realtime sin filtro | Siempre `filter: campo=eq.valor` | BUG-003 |
| Error silencioso (catch vacío) | Log + estado de error visible | Todos |
| `await` sin timeout | Siempre `Promise.race` o AbortController | BUG-001 |
| SW cache sin versionamiento activo | Bumpar version + force update en cada fix | BUG-006 |
| Tragar errores tipados (retornar null) | Propagar AIError/typed errors hasta la UI | BUG-006 |
| No verificar state guards post-await | Check `isProcessingRef` después de cada await | BUG-006 |

---

## Comandos

| Comando | Acción |
|---------|--------|
| "QA" / "qué bugs hay" | Listar bugs recientes + estado |
| "guardar bug" | Registrar bug nuevo en la memoria |
| "ese error ya lo vi" | Buscar en memoria por similitud |
| "qué NO funcionó" | Listar intentos fallidos de un bug |
| "patrón para X" | Buscar patrón aplicable por tag |
| "actualizar bug BUG-XXX" | Agregar iteración o solución final |
| "prevención" | Listar reglas de prevención aprendidas |

---

## Reglas

1. **SIEMPRE registrar el bug ANTES de intentar fixearlo** (así se captura el contexto fresco)
2. **SIEMPRE registrar intentos fallidos** (son tan valiosos como la solución)
3. **SIEMPRE buscar en memoria ANTES de investigar** (evitar reinventar)
4. **NUNCA borrar entradas de la memoria** (el historial es sagrado)
5. **Tags son la clave** — usar tags descriptivos para matching futuro
6. **Prevención > Fix** — si un patrón se repite 2+ veces, crear una regla de prevención
