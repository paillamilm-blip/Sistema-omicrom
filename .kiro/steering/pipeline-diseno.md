---
title: Pipeline de diseño — ui-ux-pro-max + taste + impeccable + animate
inclusion: always
---

# 🎨 Pipeline de diseño

Cuatro skills de diseño instaladas. Cada una decide **una** cosa. Si dos parecen pisarse, la tabla de conflictos manda.

## Quién decide qué

| Skill | Decide | NO decide |
|---|---|---|
| **ui-ux-pro-max** | Qué opciones existen. Devuelve datos verificados: 192 paletas, 74 pares tipográficos, 119 guías UX, 22 stacks, 25 gráficos. | Cuál elegir para Ómicrom. Es un catálogo, no un veredicto. |
| **taste-skill** | Dirección visual anti-genérica en superficies de **conversión**. Los tres dials, el "Design Read". | Nada de product UI. Su propio scope lo excluye. |
| **impeccable** | Ejecución y criterio de craft. 23 comandos, invocados como `/impeccable <command> <target>`. | Motion. Delegá a `animate`. |
| **animate** *(+3 hermanas)* | Todo el movimiento. Construir (`animate`), criticar (`review-animations`), auditar el codebase (`improve-animations`), encontrar oportunidades (`find-animation-opportunities`). | Layout, color, tipografía. |

## Orden de conflicto (de mayor a menor autoridad)

1. **`DESIGN.md` + `PRODUCT.md`** — la ley de Ómicrom. Gana siempre.
2. **`src/theme/`** — si el código y `DESIGN.md` discrepan, gana el código y `DESIGN.md` está viejo.
3. **impeccable / animate** — criterio de craft y motion sobre lo que la ley no fija.
4. **ui-ux-pro-max / taste-skill** — insumo. Se filtra por todo lo de arriba.

> **La regla que más importa.** `search.py --design-system` propone mundos visuales completos — le pedí uno de prueba y devolvió *Liquid Glass, Cormorant/Montserrat, acento oro `#A16207` sobre fondo claro `#FAFAF9`*. Eso destruiría la identidad de Ómicrom. **Ómicrom no es un proyecto greenfield.** Ya tiene tokens, 4 colores de usuario y dark-mode-only. De `--design-system` se toma solo lo que no contradice `DESIGN.md`; el resto se descarta sin discutir. Para consultas puntuales usá `--domain` o `--stack`, que devuelven guías en vez de mundos.

## El flujo

```
1. ui-ux-pro-max  →  evidencia    (¿qué dice el dato sobre este patrón?)
2. DESIGN.md      →  filtro       (¿qué de eso es legal acá?)
3. taste/impeccable → dirección   (¿cómo se ve, en este mundo?)
4. impeccable     →  ejecución    (escribir el código)
5. animate        →  movimiento   (si hay motion, y solo entonces)
   └ review-animations → verificá el motion que acabás de escribir
6. impeccable audit → verificación (a11y, responsive, perf — no cubre motion)
```

Pasos 1 y 2 son baratos y evitan reescribir. No los saltees.

### Setup, una vez por sesión

```bash
node --version   # el launcher no lo necesita, pero el resto del repo sí
.kiro/skills/impeccable/scripts/impeccable context --target <archivo-o-ruta>
```

Carga `PRODUCT.md`, `DESIGN.md` y el brief de superficie. En Windows: `impeccable.cmd`. La primera corrida baja un binario auto-contenido; si falla, **avisá antes de editar** que el contexto no se cargó.

### Invocar impeccable

```
/impeccable <command> <target>
```

Los 23 comandos (`scripts/command-metadata.json` tiene la descripción y el `argumentHint` de cada uno):

| Categoría | Comandos |
|---|---|
| Build | `shape` · `init` · `document` · `extract` · `craft` *(alias deprecado)* |
| Evaluate | `critique` · `audit` |
| Refine | `polish` · `bolder` · `quieter` · `distill` · `harden` · `onboard` |
| Enhance | `animate` · `colorize` · `typeset` · `layout` · `delight` · `overdrive` |
| Fix | `clarify` · `adapt` · `optimize` |
| Iterate | `live` |

Sin argumento no auto-ejecuta: lee `reference/routing.md` y ofrece el menú.

Atajos: `.kiro/skills/impeccable/scripts/impeccable pin <pin|unpin> <command>` crea un `/<command>` suelto. Aparte están `/impeccable hooks <on|off|status|…>` (detector automático tras editar UI) y `/impeccable doctor` (reporta drift entre `PRODUCT.md`/`DESIGN.md` y lo que la versión instalada lee).

### Consultar el dato

```bash
python3 .kiro/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain ux
python3 .kiro/skills/ui-ux-pro-max/scripts/search.py "<query>" --stack react
```

Dominios útiles acá: `ux`, `icons`, `chart`, `react`. Stack: `react` o `shadcn`.

### taste-skill: origen y versión

Viene de [`Leonxlnx/taste-skill`](https://github.com/Leonxlnx/taste-skill) (`npx skills add https://github.com/Leonxlnx/taste-skill`). La copia del repo está en **v2 (experimental)**, install name `design-taste-frontend`, byte-idéntica a upstream. v2 es un rewrite del original — mantiene los tres dials y agrega reglas duras y skeletons canónicos. `taste-skill-v1` quedó preservada upstream por si algo dependía de su comportamiento exacto; acá no se usa.

## Cuándo NO usar taste-skill

Su propio scope dice: *landing pages, portfolios y rediseños. No dashboards, no tablas de datos, no product UI multi-paso.*

Casi todo Ómicrom es product UI en modo **Operate** — `GemeloTab`, `CredencialModal`, Academia, Empleos, Wallet, Contratos, Gobernanza. **Ahí taste-skill no va.** Va impeccable con `reference/operate.md`.

Sí va en las superficies **Persuade**: `AuthOverlay`, `NoAccess`, `ResetPasswordOverlay`, `OrbOnboarding` y los 5 actos de `GemeloReveal`. Y aun ahí, sus §4.2 (calibración de color) y §4.1 (tipografía) están **ya resueltos** por `DESIGN.md` — no los reabras.

## Motion: 4 skills, una por trabajo

Todas de [`emilkowalski/skills`](https://github.com/emilkowalski/skills). Cada una hace **una** cosa y se delegan entre sí explícitamente:

| Skill | Trabajo | Escribe código |
|---|---|---|
| **`animate`** | Construir una animación desde cero. Secuencia de 7 pasos. | Sí |
| **`review-animations`** | Criticar motion existente contra el bar de craft. `STANDARDS.md` es la tabla de reglas. Por defecto marca; la aprobación se gana. | No |
| **`improve-animations`** | Auditar el motion de todo el codebase y emitir planes priorizados auto-contenidos que otro agente (o un modelo más barato) ejecuta. | No |
| **`find-animation-opportunities`** | Barrer la UI buscando momentos que **deberían** moverse y no se mueven — y rechazar los que no. Read-only, propone con valores exactos. | No |

`animation-vocabulary` es el complemento de entrada: glosario de búsqueda inversa que traduce una descripción vaga a su término exacto ("el efecto rebotón cuando abre el popover" → *Pop in*). Útil para arrancar cuando no sabés cómo se llama lo que querés.

**`animate-expo` NO está instalada a propósito** — es para React Native y Ómicrom es web (`PRODUCT.md` → `Platform: web`).

### `animate` gana sobre `/impeccable animate`

`impeccable` tiene un comando `animate` y hay una skill `animate` dedicada. **Gana la skill.** `reference/animate.md` sirve para saber *si* algo debe moverse; la construcción la hace `animate`. Para verificar lo construido, `review-animations` — no el `audit` de impeccable, que no cubre motion.

### El estado real del motion en este repo

> ⚠️ **Los tokens de motion existen y nadie los usa.** `EASE`, `TIMING`, `SPRING` y `EASING` en `src/theme/animations.ts` tienen **cero consumidores** fuera de su propia declaración, aunque el barrel los re-exporta. Mientras tanto hay **12 `cubic-bezier` hardcodeados** en componentes y 86 `transition:` inline.
>
> Lo bueno: las curvas hardcodeadas son **casi todas las correctas** — `(0.32, 0.72, 0, 1)` ×6 (iOS, = `EASE.default`) y `(0.23,1,0.32,1)` ×6 (el ease-out fuerte que prescribe `review-animations/STANDARDS.md`). Quien las escribió conocía la filosofía.
>
> Lo que hay que arreglar, y es trabajo de `improve-animations`:
> 1. **Importar de `EASE` en vez de hardcodear.** La regla 3 de `animate` ("extendé los tokens del codebase, no los bifurques") hoy no se puede cumplir porque nadie los usa.
> 2. **Dos grafías de la misma curva** — `(0.23,1,0.32,1)` sin espacios ×6 vs `(0.23, 1, 0.32, 1)` con espacios ×1. No es greppable como una sola cosa.
> 3. **`cubic-bezier(0.2, 0.9, 0.25, 1)` ×2 no está en ningún token.** Curva inventada, justo lo que la regla 2 de `animate` prohíbe.
> 4. **`EASING` es código muerto y contiene una curva prohibida** — `EASING.standard` es `[0.4, 0, 0.2, 1]`, exactamente la que la tabla "Never Ship" de `animate` veta por nombre. Cero usos: se borra, no se migra. `EASE.default` es la correcta.
>
> Hasta que eso se limpie: **código nuevo importa de `EASE`/`TIMING`/`SPRING`**, nunca hardcodea, y nunca toca `EASING`.

## No negociable, venga de donde venga

Cualquier sugerencia de cualquiera de las cuatro skills que choque con esto se descarta:

- Dark-mode only. Fondo claro está fuera de mundo.
- El color de lo que representa a la persona sale de `useUserColor()` / `getUserColor()`. Nunca hardcodeado, nunca `C.cyan` (es el gris de marca).
- `#5cc8ff` está prohibido.
- Sin webfonts. Familia de sistema.
- Pantallas premium (auth, credencial, reveal): tokens inline, **cero clases Tailwind**.
- Cada número con su escala: `65/100`.
- Cero jerga. Siempre qué / por qué / qué gana.
- "Gemelo Digital" y "Credencial Ómicrom". Nunca "ADN" en UI.
- `prefers-reduced-motion` en el mismo commit que la animación.
- "Verificada" nunca por heurística.
