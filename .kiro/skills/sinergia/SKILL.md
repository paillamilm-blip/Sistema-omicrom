---
name: sinergia
description: Verificación de sinergia total del codebase. Detecta código muerto, archivos huérfanos, dependencias circulares, módulos desconectados, imports rotos, y problemas de cohesión. Usa cuando quieras saber si todo está bien conectado. Triggers — "sinergia", "está todo conectado?", "hay algo muerto?", "salud del código", "verificá conexiones".
---

# Sinergia — Verificación de Conexión Total

## Qué hace
Escanea el proyecto completo y responde UNA pregunta: **¿Está todo conectado y funcionando como un sistema coherente?**

## Cuándo usarla
- Después de un refactor grande
- Antes de un release importante
- Cuando sentís que algo "no cuadra"
- Periódicamente (cada 1-2 semanas)

## Proceso (5 dimensiones)

### 1. 🔗 CONEXIONES — ¿Hay archivos huérfanos?

Buscar archivos que NADIE importa:
- Componentes no usados en ningún render
- Funciones exportadas que nadie llama
- Types/interfaces sin consumidores
- Archivos .ts/.tsx que no están en ningún import

**Output:** Lista de archivos huérfanos con recomendación (borrar / conectar / mover)

### 2. 🔄 DEPENDENCIAS — ¿Hay ciclos o imports rotos?

Verificar:
- Imports circulares (A→B→A)
- Imports a paths que no existen
- Imports desde módulos que violan la arquitectura (ej: feature A importa internals de feature B)
- Re-exports innecesarios

**Output:** Mapa de dependencias problemáticas

### 3. 💀 CÓDIGO MUERTO — ¿Hay funciones/variables que nadie usa?

Buscar:
- Funciones exportadas sin consumidores
- Variables declaradas y nunca leídas
- Bloques condicionales inalcanzables
- Event handlers sin binding
- CSS/estilos sin referencia

**Output:** Lista priorizada de código muerto (seguro borrar vs verificar primero)

### 4. 🏗️ COHESIÓN — ¿Cada módulo hace UNA cosa?

Evaluar por módulo:
- ¿El módulo tiene una responsabilidad clara?
- ¿Hay lógica que pertenece a otro módulo?
- ¿El tamaño es proporcional a la responsabilidad?
- ¿Los exports son coherentes entre sí?

**Output:** Scoring de cohesión por módulo (🟢 Alta / 🟡 Media / 🔴 Baja)

### 5. 🌐 SINERGIA — ¿Los módulos colaboran correctamente?

Verificar:
- ¿Los módulos se comunican por interfaces limpias (no importando internals)?
- ¿El store conecta lo que debe sin ser un god object?
- ¿Los shared/ components son realmente compartidos (>1 consumidor)?
- ¿Los types/ reflejan la realidad del código?

**Output:** Diagrama de sinergia (qué está bien conectado vs qué está aislado)

## Formato de reporte final

```markdown
## 🧬 Reporte de Sinergia — [fecha]

### Puntuación general: [X/10]

### 🔗 Conexiones
- Archivos huérfanos: [N]
- [lista]

### 🔄 Dependencias
- Ciclos encontrados: [N]
- Imports rotos: [N]
- [lista]

### 💀 Código muerto
- Funciones sin uso: [N]
- Archivos removibles: [N]
- [lista]

### 🏗️ Cohesión por módulo
| Módulo | Score | Nota |
|--------|-------|------|
| [nombre] | 🟢/🟡/🔴 | [observación] |

### 🌐 Sinergia
- Módulos bien conectados: [lista]
- Módulos aislados: [lista]
- Conexiones faltantes: [lista]

### ✅ Acciones recomendadas
1. [acción prioritaria 1]
2. [acción prioritaria 2]
3. [acción prioritaria 3]
```

## Reglas
- No borrar nada automáticamente — solo reportar
- Priorizar por impacto: lo que afecta runtime > lo estético
- Distinguir "muerto seguro" de "posiblemente muerto" (dynamic imports, lazy loading)
- Respetar la arquitectura definida del proyecto (features/, shared/, store/, etc.)
