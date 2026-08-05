---
inclusion: always
---

# Skills Activas — Sistema Ómicron

> Este archivo activa los principios y comportamientos de las 16 skills instaladas
> en `.kiro/skills/`. Todas están disponibles en toda sesión.

---

## Skills de Ejecución y Productividad

### 1. GSD (Get Stuff Done)
**Trigger:** "modo GSD", "hacelo", "dale", "implementalo", "just do it"
**Comportamiento:** Ejecución rápida y directa. Menos charla, más acción. Implementar soluciones completas sin pedir confirmación innecesaria. Decisiones pragmáticas.
**Referencia:** #[[file:.kiro/skills/gsd/skill.md]]

### 2. Claude Mem (Memoria y Tracking)
**Trigger:** Siempre activo. Comandos: "Recordá", "Qué sabés de", "Olvidá", "Memoria"
**Comportamiento:** Memoria persistente categorizada (proyecto, preferencias, decisiones, config) + agente de ejecución enfocado con tracking de progreso y recovery de interrupciones. Descomponer tareas en subtareas numeradas, trackear estado, reportar progreso.
**Referencia:** #[[file:.kiro/skills/claude-mem/skill.md]]

### 3. Context Mode (Protocolo de Cambios)
**Trigger:** Activo por defecto antes de cualquier cambio. Trigger "contexto" o "resumen".
**Comportamiento:** Protocolo de 4 fases obligatorio: Análisis → Plan → Confirmación → Ejecución. Gestión inteligente de contexto con memoria de sesión. NUNCA actuar por impulso.
**Referencia:** #[[file:.kiro/skills/context-mode/skill.md]]

### 4. Superpowers (Modo Experto)
**Trigger:** "modo superpowers", tareas que requieran análisis profundo.
**Comportamiento:** Maximizar calidad, profundidad y completitud. Razonamiento extendido. Considerar todos los ángulos: performance, seguridad, mantenibilidad, UX. Anticipación proactiva de problemas.
**Referencia:** #[[file:.kiro/skills/superpowers/skill.md]]

### 5. Skill Creator
**Trigger:** Cuando el usuario pida crear una nueva skill.
**Comportamiento:** Transformar descripciones de flujos de trabajo en skills reutilizables y estructuradas. Formato estandarizado con variables, pasos, ejemplos y edge cases.
**Referencia:** #[[file:.kiro/skills/skill-creator/skill.md]]

---

## Skills de Revisión de Código

### 6. Code Review Ultra
**Trigger:** "review", "ultra review", "revisión profunda", "auditoría"
**Comportamiento:**
- **Review estándar:** Bugs, edge cases, errores de tipeo, imports, código muerto. Veredicto rápido.
- **Ultra Review:** Todo lo anterior + Seguridad (XSS, injection, CSRF) + Performance (re-renders, memory leaks, N+1) + Arquitectura (acoplamiento, responsabilidades) + Patrones (anti-patterns) + Accesibilidad (ARIA, keyboard, contraste). Scorecard 6 dimensiones con plan de acción.
**Referencia:** #[[file:.kiro/skills/code-review-ultra/skill.md]]

---

## Skills de Diseño y UI/UX

### 7. Design (Diseño General Unificado)
**Trigger:** Tareas de diseño: logos, CIP, slides, banners, iconos, fotos sociales.
**Comportamiento:** Skill unificado que rutea a sub-skills según la tarea. Logo (55 estilos, Gemini AI), CIP (50 deliverables), Slides (Chart.js + tokens), Banners (22 estilos), Iconos (15 estilos SVG), Fotos sociales (HTML→screenshot).
**Referencia:** #[[file:.kiro/skills/design/SKILL.md]]

### 8. Design System (Tokens y Especificaciones)
**Trigger:** Tokens de diseño, CSS variables, Tailwind theme, component specs, slides.
**Comportamiento:** Arquitectura de tokens 3 capas (Primitive → Semantic → Component). Generación de CSS variables, integración Tailwind, specs de componentes. Sistema de slides con Chart.js y copywriting.
**Referencia:** #[[file:.kiro/skills/design-system/SKILL.md]]

### 9. Brand (Identidad de Marca)
**Trigger:** Voz de marca, identidad visual, messaging, assets, consistencia.
**Comportamiento:** Definir y mantener brand voice, visual identity, messaging frameworks, asset management. Scripts para inyectar contexto de marca, sincronizar tokens, validar assets.
**Referencia:** #[[file:.kiro/skills/brand/SKILL.md]]

### 10. Banner Design
**Trigger:** Diseño de banners, covers, headers para redes sociales, ads, web, print.
**Comportamiento:** 22 estilos de art direction. Workflow: requisitos → research → diseño HTML/CSS → export PNG. Soporte para Facebook, Twitter, LinkedIn, YouTube, Instagram, Google Ads, web heroes.
**Referencia:** #[[file:.kiro/skills/banner-design/SKILL.md]]

### 11. Slides (Presentaciones)
**Trigger:** Crear presentaciones, pitch decks, slides estratégicas.
**Comportamiento:** Presentaciones HTML estratégicas con Chart.js, design tokens, layouts responsivos, fórmulas de copywriting. Sistema de decisión contextual con BM25 search.
**Referencia:** #[[file:.kiro/skills/slides/SKILL.md]]

### 12. UI Styling
**Trigger:** Construir UI, implementar design systems, responsive layouts, componentes accesibles.
**Comportamiento:** shadcn/ui + Tailwind CSS + canvas-based design. Componentes accesibles (Radix UI), utility-first CSS, dark mode, theming. Patrones de forms, layouts responsivos, datos.
**Referencia:** #[[file:.kiro/skills/ui-styling/SKILL.md]]

### 13. UI/UX Pro Max
**Trigger:** Diseñar, construir o revisar UI. Decisiones de color, tipografía, layout, animación, data viz.
**Comportamiento:** Base de datos searchable: 84 estilos, 192 paletas, 74 font pairings, 192 product types, 98 UX guidelines, 104 icon entries, 16 GSAP motion presets, 25 chart types, 22 stacks. Prioridad 1→10 por categoría. Design system generation con persistencia.
**Referencia:** #[[file:.kiro/skills/ui-ux-pro-max/SKILL.md]]

### 14. UI Verification
**Trigger:** Verificar que la app en vivo coincide con su spec de diseño. Verificar flows de usuario.
**Comportamiento:** Verificación visual (CSS determinístico contra DOM) + verificación de flows (Gherkin via Nova Act). 5 categorías: Visual Style, Components, Accessibility, Project Rules, Platform Conventions. Produce reporte con screenshots anotados.
**Referencia:** #[[file:.kiro/skills/ui-verification/SKILL.md]]

---

## Skills de Automatización

### 15. Nova Act (Browser Automation)
**Trigger:** Automatizar navegadores, web scraping, testing de apps web, workflows de automatización.
**Comportamiento:** SDK de Amazon para browser automation con AI. Browser CLI para exploración interactiva. Python scripts para automatización repetible. Soporte para headed/headless, extraction estructurada, Gherkin testing, parallel sessions.
**Referencia:** #[[file:.kiro/skills/nova-act/SKILL.md]]

---

## Combos con Nombre (Combinaciones Potentes)

> Invocar por nombre: "activá [NOMBRE DEL COMBO]" o simplemente decir el nombre.
> Estos combos se activan automáticamente según el tipo de tarea detectada.

### TITAN — Máxima potencia de análisis y ejecución
**Skills:** Superpowers + Context Mode + Ultra Review + Claude Mem
**Trigger:** "modo TITAN", "TITAN"
**Auto-activa cuando:** Refactoring mayor, features nuevas críticas, cambios de arquitectura, o cuando el usuario dice "esto es importante".
**Efecto:** Análisis profundo multidimensional (Fase 1 extendida con security/performance/a11y) → Plan detallado → Ejecución con Ultra Review automático al final → Tracking completo de progreso. La combinación más completa posible.

### RAYO — Ejecución brutal sin fricción
**Skills:** GSD + Claude Mem + Context Mode (sin Fase 3)
**Trigger:** "modo RAYO", "RAYO", "rápido", "dale nomás"
**Auto-activa cuando:** Tareas claras y directas, fixes menores, implementaciones obvias, o cuando el usuario muestra urgencia.
**Efecto:** Ejecución inmediata sin preguntas innecesarias. Tracking de subtareas pero sin confirmación. Fases 1/2/4 se mantienen (no se pierde el control), pero todo va rápido. Decisiones pragmáticas automáticas.

### FORJA — Pipeline completo de diseño visual
**Skills:** Brand + Design System + UI/UX Pro Max + UI Styling + Banner Design
**Trigger:** "modo FORJA", "FORJA"
**Auto-activa cuando:** Crear identidad visual, redesign de UI, nuevo design system, generar assets de marca, o cuando la tarea involucra diseño integral.
**Efecto:** Pipeline: definir marca → generar tokens (3 capas) → design intelligence (84 estilos, 192 paletas) → implementación con Tailwind/shadcn → export de assets. Todo coherente y sistémico.

### GUARDIAN — Auditoría y verificación total
**Skills:** Code Review Ultra + UI Verification + Superpowers + Nova Act
**Trigger:** "modo GUARDIAN", "GUARDIAN", "auditá todo"
**Auto-activa cuando:** Pre-deploy, revisión de PR crítica, verificación de calidad antes de milestone, o cuando el usuario dice "revisá todo".
**Efecto:** Ultra Review del código (6 dimensiones) + Verificación visual de la UI contra spec + Análisis profundo de riesgos + Testing automatizado en browser. Reporte completo con scorecard y plan de acción.

### OMEGA — Presentación y comunicación profesional
**Skills:** Slides + Design + Brand + Design System
**Trigger:** "modo OMEGA", "OMEGA", "hacé una presentación"
**Auto-activa cuando:** Crear pitch decks, presentaciones de producto, reportes visuales, o comunicación de marca.
**Efecto:** Slides estratégicas con Chart.js + design tokens + copywriting formulas + art direction de marca. Resultado: presentación HTML profesional, consistente con la identidad de Ómicron.

### NEXUS — Memoria y contexto total
**Skills:** Claude Mem + Context Mode + Superpowers
**Trigger:** "modo NEXUS", "NEXUS", "dame el panorama"
**Auto-activa cuando:** Retomar trabajo después de una pausa, sesiones largas, o cuando el usuario necesita entender dónde está parado.
**Efecto:** Resumen completo del estado (archivos tocados, decisiones, pendientes) + Memoria persistente activa + Análisis profundo del contexto actual. Ideal para retomar sin perder nada.

---

## Auto-activación Inteligente

> Las combinaciones se activan **automáticamente** según el tipo de tarea sin necesidad
> de invocarlas. El agente detecta la intención y aplica el combo correcto.

### Reglas de auto-activación:

| Tipo de tarea detectada | Combo auto-activado |
|-------------------------|---------------------|
| Feature nueva, refactoring, arquitectura | **TITAN** |
| Fix rápido, tarea simple y clara, urgencia | **RAYO** |
| Diseño de UI, identidad visual, assets | **FORJA** |
| Pre-deploy, revisión de código, QA | **GUARDIAN** |
| Presentación, pitch, comunicación | **OMEGA** |
| Retomar sesión, "dónde estábamos", contexto | **NEXUS** |

### Regla de override:
- Si el usuario nombra un combo explícitamente, **ese combo tiene prioridad** sobre la auto-detección.
- Si el usuario dice "sin [skill]", se excluye esa skill del combo activo.
- Los combos se pueden combinar entre sí: "TITAN + FORJA" = análisis profundo aplicado a diseño.

---

## Invocación Manual (Skills individuales)

Para activar una skill específica fuera de un combo:

| Trigger | Skill |
|---------|-------|
| "modo GSD" | GSD |
| "review" / "ultra review" | Code Review Ultra |
| "modo superpowers" | Superpowers |
| "contexto" / "resumen" | Context Mode |
| "recordá X" / "qué sabés de X" | Claude Mem |
| "diseñá un banner" | Banner Design |
| "crear slides" | Slides |
| "diseñá logo" / "crear icono" | Design |
| "tokens" / "design system" | Design System |
| "marca" / "brand" | Brand |
| "verificar UI" | UI Verification |
| "automatizar browser" | Nova Act |
| "crear skill" | Skill Creator |
| "UI de [página]" | UI/UX Pro Max + UI Styling |
