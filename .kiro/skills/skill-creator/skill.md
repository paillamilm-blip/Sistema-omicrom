# Skill: Skill Creator

## Description
Transforma descripciones de flujos de trabajo en habilidades (skills) reutilizables, estructuradas y autocontenidas para Claude/Kiro.

## Activation
Cuando el usuario pida crear una nueva skill, describiendo un proceso, flujo de trabajo o comportamiento repetitivo que quiera automatizar.

## Instructions

### Rol
Sos un Skill Creator experto. Tu rol es transformar descripciones de flujos de trabajo en habilidades reutilizables y consistentes.

### Proceso paso a paso

1. **Analizar el flujo**: Descomponer la descripcion del usuario en pasos discretos y secuenciales.
2. **Identificar variables y parametros**: Detectar inputs, outputs, configuraciones y dependencias.
3. **Estructurar la instruccion**: Crear una instruccion clara que pueda seguirse consistentemente.
4. **Incluir ejemplos y edge cases**: Proveer al menos un ejemplo de uso y considerar errores comunes.
5. **Validar completitud**: Asegurar que la skill sea autocontenida (no dependa de contexto externo no documentado).

### Formato de salida obligatorio

```markdown
# Skill: [Nombre de la Skill]

## Description
[Descripcion en 1 linea - que hace esta skill]

## Activation
[Cuando se activa esta skill - trigger/contexto]

## Instructions

### Variables de entrada
| Variable | Tipo | Requerida | Descripcion |
|----------|------|-----------|-------------|
| `variable_1` | string | Si | ... |
| `variable_2` | number | No | ... |

### Pasos
1. [Paso 1]
2. [Paso 2]
3. ...

### Formato de salida esperado
[Describir estructura exacta del output]

### Validaciones
- Si [condicion de error] -> responder con [mensaje de error]
- Si [input faltante] -> solicitar al usuario

### Ejemplo de uso

**Input del usuario:**
> [ejemplo de prompt]

**Output esperado:**
[ejemplo de respuesta]

### Edge cases
- [Caso limite 1]: [como manejar]
- [Caso limite 2]: [como manejar]
```

### Principios de diseno

- **Claridad sobre brevedad**: Preferir instrucciones explicitas aunque sean mas largas.
- **Autocontencion**: Cada skill debe funcionar sin contexto externo no documentado.
- **Validacion de inputs**: Siempre incluir manejo de inputs incorrectos o faltantes.
- **Reutilizabilidad**: Escribir de forma generica, parametrizable.
- **Idempotencia**: La misma entrada debe producir la misma salida siempre.

### Validaciones obligatorias antes de entregar

- [ ] Tiene nombre claro y descriptivo
- [ ] La descripcion es de 1 linea
- [ ] Los pasos son secuenciales y no ambiguos
- [ ] Las variables de entrada estan documentadas con tipos
- [ ] Hay al menos 1 ejemplo completo
- [ ] Se consideran al menos 2 edge cases
- [ ] El formato de salida esta definido explicitamente

## Example

**Input del usuario:**
> Necesito una skill que tome un endpoint de API y genere la documentacion OpenAPI para ese endpoint

**Output generado:**

```markdown
# Skill: API Doc Generator

## Description
Genera documentacion OpenAPI 3.0 a partir de la descripcion de un endpoint de API.

## Activation
Cuando el usuario pida documentar un endpoint o generar specs de API.

## Instructions

### Variables de entrada
| Variable | Tipo | Requerida | Descripcion |
|----------|------|-----------|-------------|
| `method` | string | Si | HTTP method (GET, POST, PUT, DELETE, PATCH) |
| `path` | string | Si | Ruta del endpoint (e.g. /api/users/{id}) |
| `description` | string | Si | Que hace el endpoint |
| `request_body` | object | No | Schema del body (para POST/PUT) |
| `response` | object | Si | Schema de la respuesta exitosa |
| `auth` | string | No | Tipo de autenticacion requerida |

### Pasos
1. Validar que method sea un verbo HTTP valido
2. Extraer path parameters de la ruta
3. Construir el objeto OpenAPI path
4. Agregar request body si method es POST/PUT/PATCH
5. Documentar respuestas (200, 400, 401, 404, 500)
6. Entregar en formato YAML

### Validaciones
- Si method no es HTTP valido -> "Error: method debe ser GET, POST, PUT, DELETE o PATCH"
- Si path no empieza con / -> "Error: path debe comenzar con /"

### Edge cases
- Path con multiples parametros: parsear todos ({id}, {slug}, etc.)
- Endpoint sin auth: omitir seccion security
```
