---
inclusion: always
---

# Skills Activas — Sistema Ómicron

> Este archivo activa los principios y comportamientos de las 19 skills instaladas
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

### 15. Taste Skill (Anti-Slop Frontend)
**Trigger:** Landing pages, portfolios, redesigns. Cuando se necesita diseño con "gusto" y sin AI-tells.
**Comportamiento:** Anti-slop frontend con 3 dials (DESIGN_VARIANCE / MOTION_INTENSITY / VISUAL_DENSITY). Brief inference automática. Design system mapping. 60+ items Pre-Flight Check obligatorio. Reglas anti-AI-tells (em-dash ban, premium palette ban, serif discipline, eyebrow restraint). Block library con patrones de referencia (hero, features, scroll, navigation). Redesign protocol con audit-first.
**Referencia:** #[[file:.kiro/skills/taste-skill/SKILL.md]]

### 16. Animate (Construcción de Animaciones)
**Trigger:** "animar", "animate", "agregar motion", "hacer que se sienta vivo", "transición".
**Comportamiento:** Skill de construcción de animación con filosofía Emil Kowalski. Secuencia de decisión: ¿Debe animarse? → Propósito → Tool (CSS transition > @starting-style > CSS animation > WAAPI > Motion) → Propiedades (solo transform + opacity) → Easing/duration con tablas exactas → Interrupción/exit → Reduced motion. Recetas para button press, dropdown, tooltip, modal, drawer, toast, accordion, stagger. Never-ship checklist.
**Referencia:** #[[file:.kiro/skills/animate/SKILL.md]]

### 17. Impeccable (Diseño UI de Nivel Director)
**Trigger:** "impeccable", "craft", "critique", "audit", "polish", "bolder", "quieter", "distill", "harden", "animate UI", "colorize", "typeset", "layout", "delight", "overdrive", "clarify", "adapt", "optimize".
**Comportamiento:** Skill completa de diseño UI nivel award-winning design director. 4 modos (Persuade/Operate/Read/Experience). 18 commands con playbooks dedicados. Pipeline: context.mjs → command reference → craft-floor.md → ejecución. Quality floor con absolute bans. Brief wins siempre. Refinement preserva; redesign reemplaza. Verificación bounded (no loops infinitos de QA).
**Referencia:** #[[file:.kiro/skills/impeccable/SKILL.md]]

---

## Skills de Automatización

### 18. Nova Act (Browser Automation)
**Trigger:** Automatizar navegadores, web scraping, testing de apps web, workflows de automatización.
**Comportamiento:** SDK de Amazon para browser automation con AI. Browser CLI para exploración interactiva. Python scripts para automatización repetible. Soporte para headed/headless, extraction estructurada, Gherkin testing, parallel sessions.
**Referencia:** #[[file:.kiro/skills/nova-act/SKILL.md]]

---

## Skill de Eficiencia

### 19. Ponytail (Lazy Senior Dev Mode)
**Trigger:** "ponytail", "be lazy", "lazy mode", "simplest solution", "minimal solution", "yagni", "do less", "shortest path", o cuando se detecta sobre-ingeniería.
**Comportamiento:** Fuerza la solución más simple y mínima que funcione. Escalera de decisión: ¿Necesita existir? → ¿Ya existe en el codebase? → ¿Lo hace la stdlib? → ¿Feature nativa? → ¿Dependencia instalada? → ¿Cabe en una línea? → Solo entonces: el mínimo que funciona. 3 niveles: lite, full (default), ultra. Nunca simplifica: validación en trust boundaries, error handling, seguridad, accesibilidad.
**Referencia:** #[[file:.kiro/skills/ponytail/SKILL.md]]

### 20. Ponytail Review
**Trigger:** "/ponytail-review", "review el diff"
**Comportamiento:** Revisa el diff actual en busca de sobre-ingeniería y devuelve una lista de qué eliminar.
**Referencia:** #[[file:.kiro/skills/ponytail-review/SKILL.md]]

### 21. Ponytail Audit
**Trigger:** "/ponytail-audit", "audit el repo"
**Comportamiento:** Audita el repo completo en busca de sobre-ingeniería, no solo el diff.
**Referencia:** #[[file:.kiro/skills/ponytail-audit/SKILL.md]]

---

## Skill Core del Producto

### 22. ADN Digital Técnico (Motor de Convalidación)
**Trigger:** Siempre activo cuando se procesa un CV, certificado, diploma, o cualquier documento de acreditación técnica. Es el corazón de la convalidación del Gemelo Digital.
**Comportamiento:** Recibe texto extraído de documentos y lo transforma en un ADN Digital profundamente conectado. Ejecuta bucle de refinamiento (máx 4 iteraciones) hasta coherencia ≥ 9.2. Devuelve JSON estructurado con esencia profesional, stack de competencias, sinergias, firma técnica única. NUNCA inventa información. TODO queda conectado.
**Referencia:** #[[file:.kiro/skills/adn-digital/skill.md]]

---

## 🔥 COMBOS — Combinaciones Potentes

> **Invocar:** di el nombre del combo. Eso es todo.
> Se auto-activan según la tarea, o se invocan manualmente.

---

### 🔥 FUEGO — Ejecución brutal + código mínimo
**Skills:** GSD + Ponytail (full) + Claude Mem + Context Mode (sin Fase 3)
**Trigger:** "FUEGO", "fuego", "dale fuego", "rápido", "dale nomás", "hazlo ya"
**Auto-activa cuando:** Fix rápido, tarea clara y directa, urgencia, implementaciones obvias.
**Efecto:** Ejecución inmediata sin preguntas. Ponytail fuerza el código mínimo (escalera YAGNI). GSD no pide confirmación. Claude Mem trackea subtareas. Resultado: lo más rápido Y lo más corto posible. Cero charla, puro código funcional.

---

### 🧠 DIOS — Análisis total + ejecución perfecta
**Skills:** Superpowers + Context Mode + Ultra Review + Claude Mem + Ponytail (lite)
**Trigger:** "DIOS", "dios", "modo dios", "esto es importante", "hazlo perfecto"
**Auto-activa cuando:** Feature nueva crítica, cambios de arquitectura, refactoring mayor, o "esto es importante".
**Efecto:** Análisis profundo multidimensional → Plan detallado → Ejecución con Ultra Review al final → Tracking completo. Ponytail en modo lite sugiere la alternativa mínima sin imponerla. La combinación más completa y potente.

---

### ✂️ CIRUJANO — Refactoring quirúrgico
**Skills:** Ponytail (ultra) + Context Mode + Code Review Ultra + Superpowers
**Trigger:** "CIRUJANO", "cirujano", "limpiá esto", "refactoreá", "cortá la grasa"
**Auto-activa cuando:** Refactoring, limpiar código existente, reducir complejidad, eliminar sobre-ingeniería.
**Efecto:** Ponytail ultra + análisis profundo = detecta TODO lo que sobra, lo que se puede borrar, lo que se puede simplificar. Context Mode asegura no romper nada. Ultra Review valida el resultado. Corta sin piedad, pero con bisturí, no con hacha.

---

### 🎨 PIXEL — Pipeline completo de diseño
**Skills:** Brand + Design System + UI/UX Pro Max + UI Styling + Taste Skill + Animate + Impeccable + Ponytail (lite)
**Trigger:** "PIXEL", "pixel", "diseñá", "UI completa", "rediseñá"
**Auto-activa cuando:** Crear identidad visual, redesign de UI, design system nuevo, assets de marca.
**Efecto:** Pipeline: marca → tokens (3 capas) → design intelligence (84 estilos, 192 paletas) → anti-slop (taste-skill) → animación (Emil Kowalski) → craft nivel director (impeccable) → implementación Tailwind/shadcn. Ponytail lite evita sobre-construir componentes innecesarios. Coherente, sistémico, libre de AI-tells.

---

### 🛡️ BUNKER — Auditoría y seguridad total
**Skills:** Code Review Ultra + UI Verification + Superpowers + Nova Act + Ponytail Review
**Trigger:** "BUNKER", "bunker", "auditá todo", "revisá todo", "pre-deploy"
**Auto-activa cuando:** Pre-deploy, revisión de PR crítica, milestone, o "revisá todo".
**Efecto:** Ultra Review (6 dimensiones) + Verificación visual contra spec + Testing automatizado en browser + Ponytail Review (detecta sobre-ingeniería en el diff). Reporte completo con scorecard, plan de acción, y lista de qué borrar.

---

### 🎤 PITCH — Presentación profesional
**Skills:** Slides + Design + Brand + Design System + Banner Design
**Trigger:** "PITCH", "pitch", "presentación", "hacé slides", "deck"
**Auto-activa cuando:** Crear pitch decks, presentaciones de producto, reportes visuales, comunicación de marca.
**Efecto:** Slides estratégicas con Chart.js + design tokens + copywriting + art direction de marca + banners. Resultado: presentación HTML profesional, coherente con la identidad de Ómicron.

---

### 🔄 RESET — Retomar contexto total
**Skills:** Claude Mem + Context Mode + Superpowers
**Trigger:** "RESET", "reset", "dónde estábamos", "retomar", "dame el panorama"
**Auto-activa cuando:** Retomar después de una pausa, sesiones largas, necesidad de entender el estado actual.
**Efecto:** Resumen completo del estado (archivos tocados, decisiones, pendientes) + Memoria activa + Análisis del contexto. Ideal para retomar sin perder nada.

---

## ⚡ Auto-activación Inteligente

> Los combos se activan **automáticamente** según la tarea. No necesitás invocarlos.

| Tipo de tarea | Combo |
|---------------|-------|
| Fix rápido, implementar algo claro | 🔥 **FUEGO** |
| Feature crítica, arquitectura, "hazlo bien" | 🧠 **DIOS** |
| Refactoring, limpiar, simplificar | ✂️ **CIRUJANO** |
| Diseño de UI, identidad, assets | 🎨 **PIXEL** |
| Pre-deploy, revisión, QA | 🛡️ **BUNKER** |
| Presentación, pitch, comunicación | 🎤 **PITCH** |
| Retomar sesión, "dónde estábamos" | 🔄 **RESET** |

---

## 🎛️ Reglas de Combos

- **Override:** Nombrar un combo tiene prioridad sobre la auto-detección.
- **Excluir:** "sin [skill]" excluye esa skill del combo activo.
- **Combinar:** "DIOS + PIXEL" = análisis profundo aplicado a diseño.
- **Ponytail global:** Si decís "ponytail" solo, se activa en modo full sobre cualquier combo activo.

---

## 🎯 Invocación Rápida (Skills individuales)

| Di esto | Activa |
|---------|--------|
| "fuego" | 🔥 FUEGO |
| "dios" | 🧠 DIOS |
| "cirujano" | ✂️ CIRUJANO |
| "pixel" | 🎨 PIXEL |
| "bunker" | 🛡️ BUNKER |
| "pitch" | 🎤 PITCH |
| "reset" | 🔄 RESET |
| "ponytail" / "lazy" / "yagni" | Ponytail (full) |
| "review" / "ultra review" | Code Review Ultra |
| "superpowers" | Superpowers |
| "contexto" | Context Mode |
| "recordá X" | Claude Mem |
| "banner" | Banner Design |
| "slides" | Slides |
| "logo" / "icono" | Design |
| "tokens" | Design System |
| "marca" | Brand |
| "verificar UI" | UI Verification |
| "automatizar" | Nova Act |
| "crear skill" | Skill Creator |
| "animar" / "motion" | Animate |
| "craft" / "polish" | Impeccable |
| "taste" / "anti-slop" | Taste Skill |
