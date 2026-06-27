# 🚀 Bitácora de Lanzamiento — Sistema Ómicron
**Camino a la profesionalidad y salida al mercado**
_Última actualización: 27 de junio de 2026_

> Estimaciones pensadas para 1 desarrollador trabajando con asistencia de IA, ritmo medio
> (~15-20 h/semana). Si le dedicas tiempo completo, divide los tiempos a la mitad.

---

## ✅ ESTADO ACTUAL (lo que YA tienes)

- Autenticación + perfiles (Supabase Auth)
- **Gemelo Digital 100% conectado** a la realidad (5 ejes: Tradicional, Fundamento, Ejecución, Calidad, Trascendencia)
- Credenciales (CV/certificados) + foto de perfil + Storage
- Árbol de habilidades (MaxSkill) con retos y simulador
- Contratos + Escrow + Ghost Approval + Caja Negra (chat cifrado)
- Calificaciones con estrellas
- Reputación 80/20 automática por triggers
- Seguridad: RLS, columnas protegidas, rate limiting, runner en Edge Function
- Tests de lógica de reputación (Vitest)
- Navegación de 5 hubs

**Madurez estimada: ~55% para un MVP lanzable.**

---

## 🩹 FASE 0 — Estabilización  ·  ⏱️ 3-5 días
_Dejar todo lo actual sólido antes de seguir construyendo._

- [ ] Resolver caída/pausa del proyecto Supabase + 404 de `contracts` (reinicio/caché)
- [ ] Separar entornos: proyecto Supabase **dev** vs **prod**
- [ ] Verificar que TODAS las migraciones corran en orden limpio (0001 → 0018)
- [ ] Probar flujos completos con cuentas de prueba (contratar → entregar → aprobar → calificar)
- [ ] Manejo de errores visible (toasts) en cada acción que llama a Supabase

---

## 🧱 FASE 1 — Completar el núcleo funcional  ·  ⏱️ 3-4 semanas
_Que todos los módulos funcionen de punta a punta._

- [ ] **Academia** (tablas `academy_courses`, `user_course_progress`, quizzes) + conectar a Fundamento — *1 sem*
- [ ] **Gobernanza** real (disputas → árbitros → resolución → liberar/reembolsar) — *1 sem*
- [ ] **Wallet** completo (saldo, historial, conversión de tokens) — *3-4 días*
- [ ] **Empleos** (publicar, matchmaking, aplicar) — *3-4 días*
- [ ] **Bóveda de conocimiento** (publicar, comprar, regalías) — *3-4 días*
- [ ] Panel de **validación de credenciales** (Tanda C) — *2-3 días*
- [ ] Auditoría automática de rango (`resolve_audit`, trigger de baja de reputación) — *2 días*

---

## 🎨 FASE 2 — Profesionalización  ·  ⏱️ 2-3 semanas
_Que se sienta y se vea como producto serio._

- [ ] Estados de carga, vacíos y error en TODAS las pantallas — *3 días*
- [ ] Validación de formularios (límites, mensajes claros) — *2 días*
- [ ] Responsive real (móvil/tablet/desktop) + accesibilidad básica — *3 días*
- [ ] Suite de tests ampliada (componentes críticos + RPCs) — *3-4 días*
- [ ] Revisión de seguridad: cobertura RLS de cada tabla, sin fugas — *2-3 días*
- [ ] Performance: índices, optimización de queries, imágenes (avatares) — *2 días*
- [ ] Notificaciones por email (bienvenida, contrato, disputa) — *2 días*

---

## 🛫 FASE 3 — Pre-lanzamiento  ·  ⏱️ 2-3 semanas
_Lo necesario para abrir al público con responsabilidad._

- [ ] **Legal**: Términos y Condiciones + Política de Privacidad (clave para un marketplace) — *3-4 días*
- [ ] Definir **monetización**: ¿tokens internos o dinero real? (si es dinero real → Stripe + cumplimiento, +2-3 sem extra)
- [ ] **Onboarding** guiado para usuarios nuevos — *3 días*
- [ ] **Analítica** (PostHog / GA4) — *1 día*
- [ ] **Monitoreo de errores** (Sentry) + logs de Supabase — *1 día*
- [ ] Backups automáticos de la BD + estrategia de migraciones — *1 día*
- [ ] **Deploy a producción** (Vercel) + dominio propio + variables de entorno — *2 días*
- [ ] **Beta cerrada** con 10-20 usuarios reales → recoger feedback — *1 semana*

---

## 🎉 FASE 4 — Lanzamiento  ·  ⏱️ 1-2 semanas
- [ ] Landing page de marketing + demo
- [ ] Canal de soporte (correo / Discord / WhatsApp)
- [ ] Plan de difusión (redes, comunidades, lista de espera)
- [ ] Lanzamiento público 🚀

---

## 🔁 FASE 5 — Post-lanzamiento (continuo)
- [ ] Iterar según feedback y métricas
- [ ] Escalar infraestructura según uso
- [ ] Roadmap de nuevas funciones (staking avanzado, IA de matchmaking, etc.)

---

## ⏳ RESUMEN DE TIEMPOS

| Fase | Duración | Acumulado |
|------|----------|-----------|
| 0 · Estabilización | 3-5 días | ~1 sem |
| 1 · Núcleo funcional | 3-4 sem | ~5 sem |
| 2 · Profesionalización | 2-3 sem | ~8 sem |
| 3 · Pre-lanzamiento | 2-3 sem | ~11 sem |
| 4 · Lanzamiento | 1-2 sem | ~12-13 sem |

### 🎯 Estimación total hasta lanzamiento
- **Ritmo medio (15-20 h/sem):** ~**3 meses**
- **Tiempo completo (40 h/sem):** ~**6-7 semanas**
- ⚠️ Si decides manejar **dinero real** (no tokens internos): suma **3-4 semanas** (Stripe, KYC, cumplimiento legal).

---

## 🔑 PRIORIDADES SI QUIERES LANZAR RÁPIDO (MVP mínimo)
1. Estabilizar (Fase 0)
2. Solo 2 módulos núcleo completos: **Contratos+Calidad** y **MaxSkill** (lo demás "próximamente")
3. Legal básico + deploy + beta
→ **MVP lanzable en ~4-5 semanas** a ritmo medio.
