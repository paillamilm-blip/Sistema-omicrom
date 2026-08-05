# Skill: Codebase Memory MCP

## Description
Servidor MCP de inteligencia de código de alto rendimiento. Indexa codebases en un grafo de conocimiento persistente — repositorio promedio en milisegundos. 158 lenguajes, consultas sub-ms, 99% menos tokens. Binario estático, cero dependencias.

## Activation
Cuando se necesite entender la estructura de un codebase, buscar símbolos, trazar dependencias entre archivos, o navegar la arquitectura de un proyecto de forma eficiente.

## Instructions

### Rol
Servidor MCP que provee inteligencia de código profunda sobre cualquier repositorio. Indexa el codebase en un grafo de conocimiento y responde consultas estructurales en tiempo real.

### Capacidades

| Capacidad | Descripción |
|-----------|-------------|
| Indexación rápida | Repositorio promedio en milisegundos, Linux kernel (28M LOC) en 3 min |
| Consultas sub-ms | Búsqueda de símbolos, dependencias y relaciones instantánea |
| 158 lenguajes | Soporte amplio de lenguajes de programación |
| Grafo persistente | Knowledge graph que persiste entre sesiones |
| 99% menos tokens | Optimizado para contexto de IA — máxima info, mínimo costo |

### Casos de uso

1. **Entender un codebase nuevo**: indexar y navegar la estructura sin leer todo
2. **Buscar símbolos**: encontrar definiciones, usos, callers de funciones
3. **Trazar dependencias**: quién importa qué, qué depende de qué
4. **Refactoring seguro**: entender el blast radius de un cambio
5. **Onboarding**: mapear la arquitectura para nuevos desarrolladores

### Referencia

- Repositorio: https://github.com/DeusData/codebase-memory-mcp
- Licencia: MIT
- Instalación: binario estático único, sin dependencias

### Integración con Sistema Ómicron

- Se usa para analizar el codebase del proyecto antes de hacer cambios
- Complementa a **Context Mode** (provee la información que Context Mode necesita en Fase 1)
- Complementa a **Code Review Ultra** (entiende el impacto de los cambios)

## Example

**Input:** "Qué archivos dependen de src/theme.ts?"

**Uso:** El MCP indexa el proyecto y devuelve el grafo de dependencias de theme.ts — todos los archivos que lo importan, qué exports usan, y el impacto de modificarlo.
