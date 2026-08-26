---
inclusion: always
---

# ⚡ Sistema de Comandos — Sistema Ómicron

> **46 skills · 10 combos por área · 3 LOOPs · Lenguaje natural**
> Hablá como quieras — yo detecto la intención y activo el combo correcto.

---

## 🎯 10 COMBOS POR ÁREA (1 verbo = todas las skills del área)

---

### 🎨 DISEÑAR — UI de nivel premio
**Skills:** taste-skill + impeccable + animate + design-system + ui-ux-pro-max + ui-styling
**Se activa con:** "diseñar", "diseñá", "UI", "bonito", "rediseñá", "arte", "que se vea mejor", "pantalla"
**Efecto:** Anti-slop + craft director + animación pro + tokens 3 capas + 192 paletas + accesibilidad

---

### 🚀 HACER — Ejecución brutal
**Skills:** gsd + ponytail + incremental-implementation + claude-mem + verification-before-completion + sinergia
**Se activa con:** "hacer", "hacé", "dale", "implementá", "ya", "rápido", "código"
**Efecto:** Implementar inmediato + YAGNI + pasos atómicos + tracking + verificar + conexiones OK

---

### 🧠 PENSAR — Análisis profundo
**Skills:** superpowers + doubt-driven-development + context-mode + autoplan + api-and-interface-design
**Se activa con:** "pensar", "pensá", "conviene?", "cómo hago", "analizar", "plan", "arquitectura", "explorar"
**Efecto:** Análisis multidimensional + adversarial review + protocolo 4 fases + diseño de interfaces

---

### 🔍 REVISAR — Calidad total
**Skills:** code-review-ultra + ponytail-audit + ponytail-review + performance-optimization + code-simplification
**Se activa con:** "revisar", "revisá", "review", "auditá", "calidad", "mejorar código"
**Efecto:** Review 6D + detectar bloat + over-engineering + performance + simplificar

---

### 🧪 ARREGLAR — Debug inteligente
**Skills:** systematic-debugging + investigacion + qa-memoria + sinergia + dispatching-parallel-agents + ponytail
**Se activa con:** "arreglar", "arreglá", "fix", "bug", "no funciona", "se rompió", "error"
**Efecto:** Root cause (Iron Law) + consultar memoria + verificar conexiones + paralelizar + fix mínimo

---

### 🛡️ PROTEGER — Seguridad completa
**Skills:** cso + security-and-hardening + code-review-ultra + performance-optimization
**Se activa con:** "proteger", "protegé", "seguridad", "es seguro?", "vulnerabilidades", "blindar"
**Efecto:** CSO mode + OWASP + secrets + supply chain + STRIDE + hardening + review seguridad

---

### 🚢 LANZAR — Deploy con confianza
**Skills:** ship + shipping-and-launch + security-and-hardening + performance-optimization + sinergia + verification-before-completion
**Se activa con:** "lanzar", "deploy", "ship", "producción", "go live", "release"
**Efecto:** Pre-launch checklist + security scan + performance + sinergia + staged rollout + monitoring

---

### 🌐 NAVEGAR — Testear en browser real
**Skills:** agent-browser/core + browse + nova-act + qa-memoria + performance-optimization + verification-before-completion
**Se activa con:** "navegar", "navegá", "testear en vivo", "probar la app", "browser", "verificar en vivo"
**Efecto:** Abrir browser → navegar flujos → detectar bugs visuales → medir performance → registrar issues

---

### 🧬 CV — Activar Gemelo Digital
**Skills:** adn-digital + superpowers + systematic-debugging + performance-optimization + sinergia + verification-before-completion
**Se activa con:** "CV", "gemelo", "perfil", "analizar CV", pegas texto de un CV
**Efecto:** Análisis de CV profundo → ADN Digital → refinamiento → debug si falla → verificar

---

### 🕷️ SCRAPEAR — Extraer datos de la web
**Skills:** agent-browser/core + browse + firecrawl + scrape + nova-act
**Se activa con:** "scrapear", "scraping", "extraer datos", "automatizar web", "espiar competencia"
**Efecto:** Browser automation + Firecrawl SDK + extracción estructurada + stealth

---

---

## 🔁 3 LOOPs (resuelven solos, iterando hasta terminar)

---

### 🔁 LOOP: [problema] — Arregla 1 bug, itera hasta resolverlo
```
INVESTIGAR → ARREGLAR → SINERGIA → NAVEGAR → TESTEAR
     ↑                                    │
     │    ¿Funciona?    NO ←───────────────┘
     └── nueva hipótesis ←─────────────────┘
              SÍ → LANZAR ✅
```
**Se activa con:** "loop: [problema]", "no se arregla", "iterar hasta resolver"
**Skills:** 32/46 activas · Máx 5 iteraciones · Registra todo en QA Memoria
**Ejemplo:** `LOOP: el CV no carga en celular`

---

### 🔁🔁 LOOP TOTAL: [tema] — Busca TODOS los bugs de un tema, no para hasta 0
```
ESCANEAR (Ultra Review + Sinergia) → lista de issues
     ↓
POR CADA ISSUE: INVESTIGAR → ARREGLAR → ULTRA REVIEW → SINERGIA → NAVEGAR
     ↓
RE-ESCANEAR → ¿nuevos issues? → SÍ: volver arriba · NO: LANZAR ✅
```
**Se activa con:** "loop total: [tema]", "arreglar todo de [tema]", "resolver todos los bugs de [tema]"
**Skills:** 38/46 activas · No para hasta que re-escaneo = 0 issues · Contexto persistente
**Ejemplo:** `LOOP TOTAL: el sistema de reputación`

---

### 🔁🔁🔁 LOOP TOTAL (sin tema) — Escanea TODA la app
**Se activa con:** "loop total" (sin tema), "arreglar todo", "que no quede ningún bug"
**Igual que LOOP TOTAL pero escanea el repo completo, no solo un tema.**
**Ejemplo:** `LOOP TOTAL` (escanea todo)

---

---

## ⛓️ CADENAS (tareas grandes multi-fase)

| Escribís | Qué hace | Secuencia |
|----------|----------|-----------|
| **CONSTRUIR:** [feature] | Feature nueva completa | PENSAR → HACER (incremental) → SINERGIA → LANZAR |
| **EMBELLECER:** [pantalla] | Mejorar diseño | DISEÑAR → NAVEGAR (verificar) → LANZAR |
| **REPARAR:** [problema] | Algo se rompió | ARREGLAR → SINERGIA → NAVEGAR → LANZAR |
| **BLINDAR:** [feature] | Seguridad total | PROTEGER → REVISAR → NAVEGAR → LANZAR |
| **COMPLETO:** [feature] | TODO: plan+diseño+código+test+deploy | PENSAR → DISEÑAR → HACER → PROTEGER → REVISAR → NAVEGAR → LANZAR |
| **EMERGENCIA:** [qué pasó] | Producción rota | ARREGLAR (rápido) → LANZAR (hotfix) → REVISAR (post-mortem) |
| **EVOLUCIONAR:** [módulo] | Refactoring mayor | PENSAR → REVISAR → HACER → SINERGIA → LANZAR |

---

---

## 🎛️ REGLAS

### Lenguaje natural
No necesitás memorizar comandos exactos. Hablá como quieras:

| Decís algo como... | Yo activo... |
|---------------------|-------------|
| "haceme un botón de logout" | 🚀 HACER |
| "esto se ve feo" | 🎨 DISEÑAR |
| "es seguro esto?" | 🛡️ PROTEGER |
| "por qué no funciona el orbe" | 🧪 ARREGLAR |
| "revisá el código" | 🔍 REVISAR |
| "quiero deployar" | 🚢 LANZAR |
| "probá la app en el browser" | 🌐 NAVEGAR |
| [pegas texto de un CV] | 🧬 CV |
| "quiero los empleos de esa web" | 🕷️ SCRAPEAR |
| "necesito analizar esto bien" | 🧠 PENSAR |
| "esto no se arregla nunca" | 🔁 LOOP |
| "limpiá todos los bugs del CV" | 🔁🔁 LOOP TOTAL |

### Modificadores
- **"rápido"** → prioriza velocidad (GSD + Ponytail dominan)
- **"perfecto"** → prioriza calidad (Ultra Review + Doubt-Driven dominan)
- **"+ proteger"** → agrega seguridad a cualquier combo
- **"+ navegar"** → agrega testing en browser a cualquier combo

### Reglas de hierro (siempre activas)
1. **Verification** — NUNCA digo "listo" sin verificar
2. **Claude Mem** — Trackeo progreso siempre
3. **Ponytail** — Si genero over-engineering, me auto-corrijo
4. **QA Memoria** — Registro cada bug (el historial es sagrado)
5. **Sinergia** — Después de cambios multi-capa, verifico conexiones

---

## 📋 46 Skills instaladas

<details>
<summary>Ver lista completa</summary>

| # | Skill | Área |
|---|-------|------|
| 1 | superpowers | Estrategia |
| 2 | context-mode | Estrategia |
| 3 | autoplan | Estrategia |
| 4 | doubt-driven-development | Estrategia |
| 5 | gsd | Ejecución |
| 6 | claude-mem | Ejecución |
| 7 | ponytail | Ejecución |
| 8 | ponytail-audit | Ejecución |
| 9 | ponytail-review | Ejecución |
| 10 | ponytail-debt | Ejecución |
| 11 | incremental-implementation | Ejecución |
| 12 | dispatching-parallel-agents | Ejecución |
| 13 | animate | Diseño |
| 14 | impeccable | Diseño |
| 15 | taste-skill | Diseño |
| 16 | ui-ux-pro-max | Diseño |
| 17 | ui-styling | Diseño |
| 18 | design-system | Diseño |
| 19 | code-review-ultra | Código |
| 20 | code-simplification | Código |
| 21 | api-and-interface-design | Código |
| 22 | verification-before-completion | Testing |
| 23 | systematic-debugging | Testing |
| 24 | performance-optimization | Testing |
| 25 | qaskill | Testing |
| 26 | security-and-hardening | Seguridad |
| 27 | cso | Seguridad |
| 28 | ship | Deploy |
| 29 | shipping-and-launch | Deploy |
| 30 | nova-act | Automatización |
| 31 | agent-browser/core | Automatización |
| 32 | agent-browser/dogfood | Automatización |
| 33 | agent-browser/electron | Automatización |
| 34 | agent-browser/slack | Automatización |
| 35 | agent-browser (main) | Automatización |
| 36 | browse | Automatización |
| 37 | firecrawl | Automatización |
| 38 | firecrawl/build | Automatización |
| 39 | firecrawl/interact | Automatización |
| 40 | firecrawl/onboarding | Automatización |
| 41 | firecrawl/scrape | Automatización |
| 42 | firecrawl/search | Automatización |
| 43 | scrape | Automatización |
| 44 | adn-digital | Producto |
| 45 | sinergia | Conexión |
| 46 | qa-memoria | QA |
| 47 | investigacion | QA |

</details>
