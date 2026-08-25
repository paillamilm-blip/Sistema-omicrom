# 🔥 Firecrawl — Web Data API for Agents

> Scraping, búsqueda y extracción web a escala para agentes de IA.  
> Fuente: [github.com/firecrawl/firecrawl](https://github.com/firecrawl/firecrawl) | Licencia: ISC

---

## 🤔 ¿Qué es Firecrawl?

**Firecrawl** es una API que convierte cualquier página web en datos limpios (Markdown, JSON, screenshots) que un agente de IA puede usar directamente. Es el "ojo" que le da al agente acceso real a la web.

### ¿Por qué es diferente a un scraper normal?

| Feature | Scraper normal | Firecrawl |
|---------|---------------|-----------|
| JS-heavy pages | ❌ Falla | ✅ 96% de la web |
| Velocidad | Lenta | ⚡ P95 latency 3.4s |
| Output | HTML crudo | 📝 Markdown limpio / JSON |
| Proxies | Manual | 🔄 Automático |
| Interacción (clicks, forms) | ❌ | ✅ `/interact` |
| Búsqueda web | ❌ | ✅ `/search` |
| PDFs/DOCX | ❌ | ✅ Parsea automático |

---

## 📋 Skills incluidas

| # | Skill | Carpeta | Para qué |
|---|-------|---------|----------|
| 1 | **Firecrawl Build** | [`firecrawl-build/`](./firecrawl-build/) | Skill principal: integrar Firecrawl en tu app para obtener datos web |
| 2 | **Firecrawl Scrape** | [`firecrawl-build-scrape/`](./firecrawl-build-scrape/) | Extraer contenido de UNA página (markdown, HTML, metadata) |
| 3 | **Firecrawl Search** | [`firecrawl-build-search/`](./firecrawl-build-search/) | Buscar en la web y obtener resultados con contenido |
| 4 | **Firecrawl Interact** | [`firecrawl-build-interact/`](./firecrawl-build-interact/) | Clicks, formularios, paginación, auth flows en páginas dinámicas |
| 5 | **Firecrawl Onboarding** | [`firecrawl-build-onboarding/`](./firecrawl-build-onboarding/) | Setup inicial: API key, SDK, configuración |

---

## ⚡ Comandos rápidos

| Comando / Trigger | Qué hace |
|-------------------|----------|
| `"Scrapeá [URL]"` | Extrae contenido de una página como Markdown |
| `"Buscá en la web: [query]"` | Búsqueda web + contenido de resultados |
| `"Interactuá con [sitio]: [acciones]"` | Clicks, forms, scroll antes de extraer |
| `"Setup firecrawl en el proyecto"` | Onboarding: API key + SDK |
| `"Necesito datos de [sitio] para la app"` | Integración completa en código |

---

## 🎯 Cuándo usarlo en tus proyectos

| Proyecto | Caso de uso |
|----------|-------------|
| **Sistema Ómicron** | Scraping de ofertas de empleo, datos de mercado, contenido de cursos |
| **CausasPro** | Complemento/alternativa al bot PJUD para extraer datos del portal |
| **Cualquier app** | Research automático, datos en tiempo real, content aggregation |

---

## 🔗 Recursos

- **API Docs:** [docs.firecrawl.dev](https://docs.firecrawl.dev)
- **Dashboard:** [firecrawl.dev](https://firecrawl.dev)
- **GitHub:** [github.com/firecrawl/firecrawl](https://github.com/firecrawl/firecrawl)
- **MCP Server:** Compatible con Claude/Kiro via MCP

---

## 💡 Requisito

Necesitás un `FIRECRAWL_API_KEY`. Obtenerla en [firecrawl.dev](https://firecrawl.dev) (tiene free tier).
