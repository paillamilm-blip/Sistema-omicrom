# Plan de Producción en Masa — Sistema Ómicron

Estado y hoja de ruta para escalar la app a miles de usuarios. Basado en la
auditoría de código + base de datos + infraestructura.

> Leyenda: 🔴 P0 (bloqueador de lanzamiento) · 🟡 P1 (operar con usuarios reales) · 🟢 P2 (crecimiento)
> Responsable: **[Tú]** = dashboard/cuenta externa · **[Código]** = se resuelve en el repo.

---

## Estado actual (lo que YA está)
- **Frontend:** React 18 + Vite + TS + Tailwind. Limpio (0 errores de tipos, sin `any`, sin `console.log`, sin XSS, sin secretos). PWA instalable con **auto-actualización**.
- **Backend:** Supabase hosted (`cuwuyqpxaibbqjrvamjb`, sa-east-1). 56+ migraciones, ~17 edge functions, IA con Gemini.
- **Seguridad (auditada y endurecida):** RLS en todas las tablas public; funciones de pagos/sistema solo `service_role`; políticas RLS optimizadas; índices en FKs; `search_path` fijo.
- **Legal:** Términos y Política de Privacidad en el repo.

---

## 🔴 P0 — Bloqueadores de lanzamiento
| # | Tarea | Responsable | Notas |
|---|-------|-------------|-------|
| 1 | Subir **Supabase a Pro** | Tú | Free pausa la BD por inactividad y limita CPU/conexiones/almacenamiento. ~US$25/mes. |
| 2 | **SMTP propio** para correos de Auth (Resend/SES) | Tú (cuenta) + Código (config) | El correo integrado de Supabase limita ~3-4/hora → los mails de confirmación no llegan en registros masivos. |
| 3 | **Connection Pooling** (Supavisor, modo transaction) | Tú | Para muchos usuarios concurrentes. |
| 4 | **Quitar Vercel Deployment Protection** + **dominio propio** | Tú | Hoy el sitio da 403 al público. |
| 5 | **Leaked Password Protection** (Supabase Auth) | Tú | Toggle de seguridad. |

## 🟡 P1 — Operar con usuarios reales
| # | Tarea | Responsable |
|---|-------|-------------|
| 6 | **Sentry** (monitoreo de errores) | Código (env-gated) + Tú (cuenta/DSN) |
| 7 | **Analítica de producto** (Plausible/PostHog) | Código (env-gated) + Tú (cuenta) |
| 8 | **Backups PITR** | Tú (incluido en Pro) |
| 9 | **Control de costos de IA** (créditos + alertas de facturación) | Código + Tú |
| 10 | **Compra de tokens (Stripe)**: checkout + webhook + UI | Código + Tú (claves live) |
| 11 | **Más tests** de flujos críticos | Código |

## 🟢 P2 — Crecimiento / pulido
- Contenido real a escala (cursos, árbol de habilidades).
- Flujo "eliminar mi cuenta/datos" (ley de datos Chile / GDPR) + banner de cookies.
- SEO: sitemap, robots, OG por página.
- Consolidar políticas RLS duplicadas (hecho) · revisar peso del bundle.

---

## Acciones que debes hacer TÚ (dashboards)
1. **Supabase → Settings → Billing:** subir a **Pro**. Luego **Database → Backups:** activar PITR.
2. **Supabase → Authentication:** activar *Leaked Password Protection*; configurar **SMTP** propio (te paso los datos de Resend/SES).
3. **Supabase → Database → Connection Pooling:** usar la cadena del **pooler** (transaction mode).
4. **Vercel → Settings → Deployment Protection:** *Disabled*; **Domains:** agregar tu dominio.
5. Crear cuentas: **Resend** (o SES), **Sentry**, **Stripe** (modo live) y pasarme las claves para dejarlas como variables de entorno.

## Variables de entorno a definir (Vercel y/o Supabase)
- Frontend (Vercel): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SENTRY_DSN`, `VITE_ANALYTICS_DOMAIN`.
- Edge Functions (Supabase secrets): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (para pagos).
