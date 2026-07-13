# ✅ Checklist de Lanzamiento — Sistema Ómicron
**Lo que falta para lanzar la app a producción**
_Última revisión: 9 de julio de 2026_

---

## 🎯 ESTADO ACTUAL

### ✅ Lo que YA tienes (implementado al 100%)
- ✅ **Frontend completo**: React + Vite + TypeScript + Tailwind
- ✅ **Autenticación**: Supabase Auth con email/password
- ✅ **9 módulos principales**:
  - ✅ Inicio (HoloGemeloHome con galaxia 3D)
  - ✅ Perfil/Gemelo Digital (5 ejes + convalidación)
  - ✅ MaxSkill (árbol habilidades + simulador)
  - ✅ Academia (cursos + examen IA)
  - ✅ Empleos (publicar, aplicar, matchmaking)
  - ✅ Mercado (servicios)
  - ✅ Billetera (saldo tokens)
  - ✅ Gobernanza (arbitraje)
  - ✅ Bóveda (conocimiento vendible)
  - ✅ Chat (mensajería + caja negra)
- ✅ **Sistema de Reputación**: 80/20 automático por triggers
- ✅ **Tiempo Real**: presencia online, ranking en vivo
- ✅ **PWA**: manifest.json + service worker + offline-ready
- ✅ **Gemelo Proactivo con Memoria**: 
  - ✅ Memoria contextual (50 conversaciones)
  - ✅ 7 detectores proactivos
  - ✅ Orbe emocional (5 estados)
  - ✅ Notificaciones inteligentes
- ✅ **CI/CD**: GitHub Actions + deploy Vercel automático
- ✅ **Tests**: Vitest configurado + tests reputación
- ✅ **Voz Premium**: voiceEngine con pausas naturales

### 🟡 Lo que está a medias (necesita completarse)
- 🟡 **Academia**: cursos existen pero sin contenido real (placeholder)
- 🟡 **Empleos**: matchmaking implementado pero sin algoritmo IA
- 🟡 **Bóveda**: estructura lista pero sin anti-plagio embeddings
- 🟡 **Billetera**: muestra saldo pero sin historial transacciones
- 🟡 **Gobernanza**: arbitraje sin quórum 2-de-3 (A2 de auditoría)
- 🟡 **Responsive**: funciona desktop pero no optimizado móvil
- 🟡 **Tests**: solo reputationService, faltan RPCs críticos

### 🔴 Lo que NO está (bloqueante para producción)
- 🔴 **Seguridad RLS**: 3 hallazgos ALTOS sin cerrar (A1, A2, A3)
- 🔴 **Migraciones versionadas**: RLS de contracts no está en migración
- 🔴 **Variables de entorno**: `.env` expuesto en frontend
- 🔴 **Legal**: sin Términos de Servicio ni Política de Privacidad
- 🔴 **Monetización**: no está definido (tokens vs dinero real)
- 🔴 **Separación dev/prod**: mismo proyecto Supabase
- 🔴 **Dominio propio**: usando dominio Vercel temporal
- 🔴 **Monitoreo**: sin Sentry ni analytics
- 🔴 **Backups**: sin estrategia backup BD
- 🔴 **Manejo errores**: solo `alert()`, sin toasts consistentes

---

## 🚨 BLOQUEANTES CRÍTICOS (resolver YA antes de abrir al público)

### 1. **Seguridad: Cerrar 3 hallazgos ALTOS** ⏱️ 1-2 días
**Archivo**: `AUDITORIA_COMPLETA.md`

#### A1: Contenido Bóveda expuesto
- [ ] Crear RPC `get_vault_content(doc_id)` que verifique acceso
- [ ] Cambiar política SELECT de `knowledge_vault_documents` a solo metadata
- [ ] Actualizar frontend para llamar RPC, no leer columna `description`
- [ ] Migración: `0048_vault_content_protection.sql`

#### A2: Arbitraje sin quórum
- [ ] Crear tabla `arbitration_votes` (case_id, arbiter_id, vote, timestamp)
- [ ] Modificar RPC `resolve_dispute` para registrar votos
- [ ] Solo ejecutar resolución cuando 2 de 3 árbitros votan igual
- [ ] Migración: `0049_arbitration_quorum.sql`

#### A3: RLS faltante en gobernanza
- [ ] Correr `supabase/auditoria_check.sql` para verificar estado RLS
- [ ] Agregar políticas SELECT/INSERT/UPDATE a:
  - `disputes` (solo partes + árbitros)
  - `arbitration_cases` (solo árbitros asignados)
  - `human_venture_stakes` (solo dueño del stake)
- [ ] Migración: `0050_governance_rls.sql`

### 2. **Variables de Entorno Seguras** ⏱️ 30 min
- [ ] Mover `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` a Vercel Environment Variables
- [ ] Verificar que `.env` está en `.gitignore`
- [ ] Crear `.env.example` con placeholders
- [ ] Documentar en README cómo configurar variables locales

### 3. **Legal: Términos + Privacidad** ⏱️ 1-2 días
**Crítico para marketplace con dinero real**

- [ ] Redactar Términos de Servicio:
  - Definición del servicio
  - Derechos y obligaciones usuarios
  - Propiedad intelectual (Bóveda)
  - Responsabilidad limitada
  - Ley aplicable (Chile)
  - Resolución de conflictos
- [ ] Redactar Política de Privacidad:
  - Qué datos se recopilan
  - Cómo se usan
  - Con quién se comparten (Supabase)
  - Derechos GDPR/LOPD
  - Cookies
- [ ] Crear páginas `/terminos` y `/privacidad`
- [ ] Agregar checkbox "Acepto términos" en registro
- [ ] Guardar consentimiento en tabla `user_consents`

### 4. **Monetización: Definir modelo** ⏱️ decisión inmediata
**Esto cambia TODO el roadmap**

#### Opción A: Tokens internos (más rápido)
- ✅ Ya implementado
- [ ] Definir **valor tokens** (ej: 100 tokens = USD $1)
- [ ] Agregar **recarga manual** admin (tabla `token_purchases`)
- [ ] **Lanzamiento**: ~1 semana más

#### Opción B: Dinero real (más complejo)
- [ ] Integrar **Stripe** (pagos)
- [ ] Implementar **KYC** (verificación identidad)
- [ ] Cumplimiento **legal** Chile (boletas, impuestos)
- [ ] Políticas anti-lavado (AML)
- [ ] **Lanzamiento**: +3-4 semanas

**👉 DECISIÓN REQUERIDA:** ¿Tokens internos o dinero real?

---

## 🟡 IMPORTANTES (no bloquean launch pero afectan calidad)

### 5. **Separación dev/prod en Supabase** ⏱️ 2 horas
- [ ] Crear proyecto Supabase nuevo para **producción**
- [ ] Correr todas las migraciones en orden (0001-0050)
- [ ] Configurar Edge Functions en prod
- [ ] Actualizar variables Vercel para apuntar a prod
- [ ] Dejar proyecto actual como **dev/staging**

### 6. **Dominio propio** ⏱️ 1-2 horas
- [ ] Registrar dominio (ej: `omicron.cl` o `sistema-omicron.com`)
- [ ] Configurar DNS en Vercel
- [ ] Agregar SSL (automático con Vercel)
- [ ] Actualizar URLs en código (redirects, meta tags)

### 7. **Responsive móvil** ⏱️ 3-4 días
**Crítico: 70% tráfico será móvil**

- [ ] Galaxia 3D optimizada para táctil
- [ ] Sidebar colapsable en móvil
- [ ] Formularios touch-friendly (inputs grandes)
- [ ] Navegación bottom nav en móvil
- [ ] Probar en dispositivos reales (iOS + Android)

### 8. **Manejo de errores profesional** ⏱️ 2 días
- [ ] Eliminar todos los `alert()`
- [ ] Implementar sistema toasts consistente:
  - Cargando (loading)
  - Éxito (success)
  - Error (error con detalles)
  - Advertencia (warning)
- [ ] Error boundaries en componentes críticos
- [ ] Logging de errores en Supabase

### 9. **Estados vacíos y carga** ⏱️ 2 días
**Cada pantalla necesita 3 estados:**

- [ ] **Cargando**: skeleton loaders
- [ ] **Vacío**: mensaje + acción (ej: "No tienes contratos. ¡Crea uno!")
- [ ] **Error**: mensaje claro + botón reintentar

Aplicar a:
- [ ] Empleos
- [ ] Contratos
- [ ] Academia
- [ ] Bóveda
- [ ] Billetera
- [ ] Chat

### 10. **Monitoreo y analytics** ⏱️ 1 día
- [ ] Integrar **Sentry** para errores:
  - Capturar excepciones frontend
  - Source maps para debug
  - Alertas a email
- [ ] Integrar **PostHog** o **Google Analytics**:
  - Pageviews
  - Conversiones (registro, primer contrato)
  - Embudos
- [ ] Dashboard Supabase:
  - Revisar logs diarios
  - Queries lentas
  - Rate limits

### 11. **Backups automatizados** ⏱️ 1 hora
- [ ] Activar **Point-in-Time Recovery** en Supabase (plan Pro)
- [ ] Script backup manual semanal:
  ```bash
  pg_dump -h ... -U postgres > backup_$(date +%Y%m%d).sql
  ```
- [ ] Guardar backups en S3 o Google Drive
- [ ] Probar restauración (1 vez al mes)

---

## 🟢 NICE-TO-HAVE (post-lanzamiento, iterar según feedback)

### 12. **Tests ampliados** ⏱️ 3-4 días
- [ ] RPCs críticos:
  - `start_contract`
  - `submit_work`
  - `approve_work`
  - `resolve_dispute`
  - `stake_human_venture`
  - `get_vault_content`
- [ ] Componentes UI:
  - OraculoBar (voz)
  - HoloNucleo3D (canvas)
  - GemeloProactive (notificaciones)
- [ ] Integración E2E (Playwright):
  - Flujo registro → perfil → contrato → pago

### 13. **Performance** ⏱️ 2 días
- [ ] Lighthouse audit (target: 90+ score)
- [ ] Lazy loading rutas (`React.lazy`)
- [ ] Imágenes optimizadas (WebP, srcset)
- [ ] Bundle analysis (`vite-bundle-visualizer`)
- [ ] Índices BD para queries lentas
- [ ] Cache CDN para assets estáticos

### 14. **Accesibilidad** ⏱️ 2 días
- [ ] aria-labels en botones icono
- [ ] Focus visible en navegación teclado
- [ ] Contraste colores (WCAG AA)
- [ ] Alt text en imágenes
- [ ] Screen reader testing

### 15. **Onboarding guiado** ⏱️ 3 días
- [ ] Tour interactivo primera vez:
  1. Completa tu perfil
  2. Convalida tu primera credencial
  3. Toma tu primer reto MaxSkill
  4. Explora la Academia
- [ ] Tooltips contextuales
- [ ] Checklist de progreso (gamificación)

### 16. **Notificaciones email** ⏱️ 2 días
**Supabase Auth ya envía verificación**

- [ ] Bienvenida (onboarding)
- [ ] Contrato nuevo recibido
- [ ] Trabajo entregado
- [ ] Pago recibido
- [ ] Disputa abierta
- [ ] Milestone alcanzado (Nodo 2, Nodo 3)

### 17. **Landing page marketing** ⏱️ 3-4 días
**Página pública separada de la app**

- [ ] Hero con propuesta valor
- [ ] Demo video (30-60 seg)
- [ ] Testimonios (beta testers)
- [ ] CTA claro ("Regístrate gratis")
- [ ] SEO optimizado
- [ ] Link a Términos/Privacidad

---

## 📊 RESUMEN EJECUTIVO

### Tiempo mínimo para lanzar producción
| Bloque | Tiempo | Acumulado |
|--------|--------|-----------|
| **BLOQUEANTES** (1-4) | 3-5 días | 5 días |
| **IMPORTANTES** (5-11) | 8-10 días | 15 días |
| **TOTAL MVP LANZABLE** | | **~2-3 semanas** |

### Si eliges dinero real (Stripe)
- **+3-4 semanas** (KYC, legal, integración)
- **Total: 5-7 semanas**

### Prioridad según estrategia

#### 🎯 **LANZAMIENTO RÁPIDO** (tokens internos, beta cerrada)
1. ✅ Seguridad (A1, A2, A3)
2. ✅ Variables entorno
3. ✅ Legal básico (términos/privacidad)
4. ✅ Separación dev/prod
5. ✅ Manejo errores (toasts)
6. ✅ Responsive móvil
7. 🚀 **LANZAR BETA** (~2-3 semanas)

#### 🏆 **LANZAMIENTO PROFESIONAL** (dinero real, público general)
1. Todo lo anterior +
2. ✅ Stripe + KYC
3. ✅ Dominio propio
4. ✅ Monitoreo (Sentry + analytics)
5. ✅ Backups
6. ✅ Performance (Lighthouse 90+)
7. ✅ Onboarding guiado
8. ✅ Landing page
9. 🚀 **LANZAR PRODUCCIÓN** (~5-7 semanas)

---

## 🎬 PLAN DE ACCIÓN INMEDIATO (próximos 3 días)

### Día 1: Seguridad
- ⏰ **Mañana (4.5h)**: Cerrar A1 (Bóveda RPC), A2 (quórum arbitraje)
- ⏰ **Noche (3.5h)**: Cerrar A3 (RLS gobernanza), versionar migraciones

### Día 2: Legal + Entorno
- ⏰ **Mañana**: Redactar Términos de Servicio
- ⏰ **Noche**: Redactar Política de Privacidad, crear páginas legales, mover variables a Vercel

### Día 3: Separación + Decisión
- ⏰ **Mañana**: Crear proyecto Supabase prod, correr migraciones
- ⏰ **Noche**: **DECISIÓN monetización** (tokens vs dinero real), actualizar README con plan

---

## ✅ CHECKLIST FINAL PRE-LAUNCH

Antes de abrir al público, verificar:

### Seguridad
- [ ] Todas las políticas RLS activas (`auditoria_check.sql` sin errores)
- [ ] Contenido Bóveda solo vía RPC
- [ ] Arbitraje con quórum 2-de-3
- [ ] Variables sensibles en Vercel (no en código)
- [ ] HTTPS activo (SSL)

### Legal
- [ ] Términos de Servicio publicados
- [ ] Política de Privacidad publicada
- [ ] Checkbox consentimiento en registro
- [ ] Consentimientos guardados en BD

### Funcional
- [ ] Flujo completo probado: registro → perfil → contrato → pago
- [ ] Todos los módulos principales funcionan
- [ ] Sin errores críticos en consola
- [ ] Manejo errores con toasts (no `alert`)
- [ ] Estados carga/vacío en todas las pantallas

### Técnico
- [ ] Proyecto Supabase prod separado
- [ ] Dominio propio configurado (opcional)
- [ ] CI/CD pasando (GitHub Actions verde)
- [ ] Build producción sin errores (`npm run build`)
- [ ] Monitoreo activo (Sentry)
- [ ] Analytics configurado (PostHog/GA)
- [ ] Backups automáticos (PITR o script)

### UX
- [ ] Responsive móvil/tablet/desktop
- [ ] Carga rápida (<3 seg First Contentful Paint)
- [ ] PWA instalable
- [ ] Accesibilidad básica (contraste, focus)

### Marketing
- [ ] Landing page pública
- [ ] Demo video grabado
- [ ] Plan de difusión listo (redes, comunidades)
- [ ] Canal de soporte definido (email, Discord, WhatsApp)

---

## 🚦 CRITERIOS DE ÉXITO POST-LAUNCH

**Semana 1:**
- 10-20 usuarios beta activos
- 5+ contratos completados
- 0 bugs críticos reportados
- Feedback recopilado (encuesta)

**Mes 1:**
- 100+ usuarios registrados
- 50+ contratos completados
- Tasa retención 30-day > 40%
- NPS > 40

**Mes 3:**
- 500+ usuarios activos
- 200+ contratos completados
- 1+ universidad con cohorte activa
- 3+ docentes mentores activos
- Postulación CORFO enviada

---

## 📞 SIGUIENTE PASO

**👉 NECESITAS DECIDIR AHORA:**

1. **¿Tokens internos o dinero real?**
   - Tokens = lanzar en 2-3 semanas
   - Dinero real = lanzar en 5-7 semanas

2. **¿Beta cerrada (10-20 usuarios) o lanzamiento público?**
   - Beta = probar con confianza, menos presión
   - Público = más exposición, más riesgo

3. **¿Cuándo empezamos?**
   - Hoy = día 1 del plan arriba
   - Esta semana = ajustamos timeline

**Respóndeme estas 3 preguntas y armamos el plan final de lanzamiento.** 🚀

---

_Documento creado: 9 de julio de 2026_
_Autor: Kiro AI + Pablo (Sistema Ómicron)_
