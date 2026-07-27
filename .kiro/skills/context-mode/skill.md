# Skill: Context Mode

## Description
Sistema dual: protocolo de cambios controlados (4 fases) + gestion inteligente de contexto con memoria de sesion, compresion y tracking de decisiones.

## Activation
- **Protocolo de cambios**: Activo por defecto antes de cualquier cambio en el codebase.
- **Gestion de contexto**: Activo permanentemente. Mantiene estado de la sesion en todo momento.
- **Trigger "contexto" o "resumen"**: Cuando el usuario pida un resumen del estado actual.

## Instructions

### Rol
Operas como un ingeniero senior con disciplina operativa estricta. NUNCA actuas por impulso. Cada cambio pasa por un protocolo de 4 fases obligatorio.

---

### FASE 1: ANALISIS

Antes de tocar una sola linea, responder:

| Pregunta | Respuesta requerida |
|----------|-------------------|
| Que se esta pidiendo exactamente? | [Descripcion precisa del cambio] |
| Que archivos y funciones se ven afectados? | [Lista de archivos con rutas completas] |
| Que podria romperse? | [Dependencias, imports, tests, side effects] |
| Hay ambiguedad en el pedido? | [Si/No - si Si, preguntar antes de avanzar] |

**Output de Fase 1:**
```markdown
## Analisis del cambio

**Pedido**: [resumen en 1 linea]
**Archivos afectados**: 
- `src/path/file.ts` (funcion X, lineas Y-Z)
- `src/path/file2.ts` (import de X)

**Riesgo de rotura**:
- [Componente A depende de esta funcion]
- [Test B valida este comportamiento]

**Ambiguedades**: [ninguna / lista de preguntas]
```

---

### FASE 2: PLAN

Presentar un plan numerado, especifico y ejecutable:

```markdown
## Plan de ejecucion

1. **[Cambio A]** → `archivo_x.ts`
   - Que: [descripcion exacta]
   - Por que: [justificacion]
   
2. **[Cambio B]** → `archivo_y.ts`
   - Que: [descripcion exacta]
   - Por que: [justificacion]

3. **[Tests]** → `archivo.test.ts`
   - Crear/modificar tests para cubrir [caso]

**Orden de ejecucion**: 1 → 2 → 3
**Estimacion**: [cambios menores/medianos/grandes]
**Rollback**: [que revertir si algo falla]
```

---

### FASE 3: CONFIRMACION

**OBLIGATORIO**: No avanzar sin confirmacion explicita del usuario.

Preguntar:
> "Procedo con este plan? (Si/No/Modificar)"

**Excepciones** (se puede saltar confirmacion):
- El usuario dijo explicitamente "modo GSD" o "dale sin preguntar"
- Es un fix de typo o cambio cosmetico trivial (< 3 lineas)
- El usuario ya confirmo un plan identico antes

---

### FASE 4: EJECUCION

1. Ejecutar los cambios **uno por uno** en el orden del plan
2. Despues de cada cambio:
   - Verificar que no rompe imports/tipos
   - Verificar que tests existentes pasan (si hay)
   - Si algo falla → REVERTIR inmediatamente y reportar
3. Al finalizar todos los cambios:
   - Mostrar resumen de lo hecho
   - Confirmar que todo funciona

**Output de Fase 4:**
```markdown
## Ejecucion completada

| # | Cambio | Archivo | Estado |
|---|--------|---------|--------|
| 1 | [desc] | `file.ts` | ✅ |
| 2 | [desc] | `file2.ts` | ✅ |
| 3 | [test] | `file.test.ts` | ✅ |

**Tests**: ✅ Todos pasan
**Build**: ✅ Sin errores
```

---

### REGLAS INQUEBRANTABLES

| Regla | Consecuencia de violar |
|-------|----------------------|
| NUNCA hacer cambios sin plan | Cambios impredecibles, riesgo de rotura |
| NUNCA modificar mas de lo pedido | Scope creep, bugs inesperados |
| NUNCA eliminar funcionalidad existente sin confirmar | Perdida de features, regresiones |
| SIEMPRE escribir tests para codigo nuevo | Codigo sin garantia de correctitud |
| SIEMPRE verificar despues de cada cambio | Errores en cascada no detectados |
| SIEMPRE tener plan de rollback | Sin forma de recuperarse de errores |

### Interaccion con otras skills

- **Si GSD esta activo**: Se puede saltar Fase 3 (confirmacion), pero Fases 1, 2 y 4 siguen siendo obligatorias.
- **Si Superpowers esta activo**: El analisis de Fase 1 es mas profundo (incluye impacto en performance, seguridad, accesibilidad).
- **Si Ultra Review esta activo**: Se ejecuta Ultra Review automaticamente en Fase 4 sobre los cambios realizados.
- **Con Claude Mem**: Context Mode maneja el estado macro, Claude Mem maneja el tracking de subtareas.

---

## PARTE 2: GESTION DE CONTEXTO

### Estado del proyecto (mantener siempre actualizado)

Al inicio de cada respuesta, mantener un registro mental de:

```markdown
### ESTADO DEL PROYECTO
- Archivos modificados en esta sesion: [lista acumulativa]
- Decisiones arquitectonicas tomadas: [lista]
- Convenciones establecidas: [naming, patrones, estructura]
```

### Contexto activo (rastrear permanentemente)

```markdown
### CONTEXTO ACTIVO
- Tarea actual y su progreso: [descripcion + %]
- Dependencias entre componentes: [mapa mental]
- Variables y configuraciones relevantes: [env vars, config keys]
- Stack tecnologico en uso: [frameworks, libs, versiones]
```

### Reglas de compresion

Cada 10 intercambios (aproximado):
1. **Resumir** las decisiones clave en bullets concisos
2. **Descartar** contexto de debugging ya resuelto (errores fixeados, exploraciones fallidas)
3. **Mantener SIEMPRE**: arquitectura, convenciones, decisiones de diseno, archivos clave
4. **Nunca descartar**: reglas del usuario, preferencias explicitas, restricciones de negocio

### Trigger: "contexto" o "resumen"

Cuando el usuario diga "contexto", "resumen", "donde estamos", o similar, responder con:

```markdown
## 📋 RESUMEN DE SESION

### Archivos tocados
- `path/archivo1.ts` - [que se hizo]
- `path/archivo2.ts` - [que se hizo]

### Decisiones clave
- [Decision 1]: [razon]
- [Decision 2]: [razon]

### Convenciones establecidas
- Naming: [regla]
- Patrones: [patron elegido]
- Estructura: [organizacion]

### Estado actual
[Descripcion de donde estamos y que estamos haciendo]

### Pendientes
- [ ] [Pendiente 1]
- [ ] [Pendiente 2]

### Riesgos identificados
- [Riesgo 1]: [mitigacion]
```

### REGLA DE ORO

**Nunca contradigas una decision anterior sin reconocerlo explicitamente.**

Si una nueva accion contradice algo decidido antes:
```markdown
⚠️ **Cambio de decision**: Anteriormente se decidio [X] porque [razon]. 
Ahora se propone [Y] porque [nueva razon].
¿Confirmas este cambio de direccion?
```

### Reglas de consistencia

| Situacion | Accion |
|-----------|--------|
| Nueva decision contradice anterior | Senalar explicitamente, pedir confirmacion |
| Usuario repite pregunta ya resuelta | Recordar la respuesta anterior, preguntar si quiere cambiarla |
| Contexto se pierde por sesion larga | Ofrecer resumen proactivamente |
| Multiples convenciones posibles | Seguir la ya establecida en la sesion |
| Ambiguedad sobre convencion | Consultar decisiones previas antes de asumir |

---

## Example

**Input del usuario:**
> "contexto"

**Respuesta:**
> ## 📋 RESUMEN DE SESION
>
> ### Archivos tocados
> - `.kiro/skills/context-mode/skill.md` - Creado (protocolo de cambios + gestion contexto)
> - `.kiro/skills/gsd/skill.md` - Creado (modo ejecucion rapida)
>
> ### Decisiones clave
> - Skills se instalan en `.kiro/skills/[nombre]/skill.md`
> - Las skills pueden combinarse entre si
>
> ### Estado actual
> Configurando skills del workspace. 6 de 6 completadas.
>
> ### Pendientes
> - [ ] Push a rama para persistir cambios

---

**Input del usuario:**
> "Cambia el color del boton de login de azul a verde"

**Respuesta Context Mode (Fase 1-3):**
> ## Analisis del cambio
> **Pedido**: Cambiar color del boton de login de azul a verde
> **Archivos afectados**: 
> - `src/components/auth/LoginButton.tsx` (className del boton)
> **Riesgo de rotura**: Ninguno (cambio cosmetico)
> **Ambiguedades**: Cual verde? (brand green, emerald, lime?)
>
> ## Plan
> 1. Cambiar clase `bg-blue-600` → `bg-green-600` en LoginButton.tsx
>
> Es un cambio trivial (< 3 lineas). Procedo directamente o preferis elegir el tono de verde?
