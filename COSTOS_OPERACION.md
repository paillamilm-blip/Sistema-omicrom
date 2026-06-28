# 💰 Costos de Operación — Sistema Ómicrom
_Cifras verificadas (junio 2026). Estimaciones reales por etapa._

> ⚠️ Los precios de proveedores cambian. Verifica en supabase.com/pricing y ai.google.dev/gemini-api/docs/pricing antes de decidir.

---

## 🟢 ETAPA 1 — Desarrollo / Pruebas (HOY)
_Lo que estás haciendo ahora: probar localmente con cuentas de prueba._

| Servicio | Costo | Nota |
|----------|------|------|
| Supabase Free | **$0** | 500 MB DB · pgvector incluido · ⚠️ **pausa el proyecto** tras inactividad |
| Edge Functions | **$0** | dentro del cupo gratis |
| Embeddings (gte-small) | **$0** | modelo gratis de Supabase, no Gemini |
| Vercel | **$0** | aún no desplegado |
| **TOTAL** | **$0/mes** | |

---

## 🔵 ETAPA 2 — Beta / Lanzamiento inicial (10-100 usuarios reales)
_Cuando abras a la comunidad de talento._

| Servicio | Costo | Nota |
|----------|------|------|
| **Supabase Pro** | **$25/mes** | ~8GB DB, sin pausas, pgvector estable, backups |
| Edge Functions | ~$0 | free hasta el cupo; luego ~$2 por 1M ejecuciones |
| Embeddings (gte-small) | $0 | sigue gratis |
| Gemini (auditoría IA) | **$0-20/mes** | SOLO si activas la auditoría de código. Pagas por token |
| Vercel (Hobby) | $0 | suficiente para empezar |
| Dominio | ~$1/mes | ~$10-15/año |
| Email (Resend free) | $0 | hasta ~3.000 correos/mes gratis |
| Monitoreo (Sentry free) | $0 | plan gratis |
| **TOTAL** | **~$25-45/mes** | |

---

## 🟠 ETAPA 3 — Crecimiento (cientos a ~5.000 usuarios)
| Servicio | Costo aprox. | Driver de costo |
|----------|-------------|-----------------|
| Supabase Pro + extras | **$25-80/mes** | compute, ancho de banda, storage de avatares/documentos |
| Gemini (más auditorías) | **$20-100/mes** | volumen de código auditado |
| Vercel Pro (si hace falta) | $20/mes | tráfico |
| Email/analítica/monitoreo | $0-30/mes | al pasar de los planes free |
| **TOTAL** | **~$70-200/mes** | |

---

## 🔴 ETAPA 4 — Escala (10.000-100.000 usuarios)
- Supabase: compute tiers más altos + ancho de banda + storage → **cientos de USD/mes** ($200-1.000+).
- Gemini: escala con uso (mitigable con caché y modelos Flash/Flash-Lite).
- Aquí ya tienes ingresos (comisiones + premium de empresas) que **deben cubrir** estos costos.

---

## 🧠 Cómo mantener los costos BAJOS
1. **Embeddings con gte-small (Supabase) = gratis** → no uses Gemini para esto. ✅ (ya lo haces)
2. **Gemini solo en el momento clave** (auditoría final del reto), no en cada tecleo.
3. Usa **modelos Flash/Flash-Lite** (mucho más baratos que Pro) para auditorías.
4. **Caché de prompts** repetidos (puede bajar 60-80% el costo de IA).
5. Mantente en **planes Free** de servicios auxiliares (Resend, Sentry, PostHog) lo más posible.
6. Comprime/limita el tamaño de avatares y documentos (storage).

---

## 📊 Resumen
```
HOY (pruebas):        $0/mes
BETA (lanzamiento):   $25-45/mes   ← objetivo realista para abrir al público
CRECIMIENTO:          $70-200/mes  ← ya con ingresos
ESCALA:               $200-1.000+/mes (cubierto por comisiones + premium)
```

> 💡 Lo importante: **puedes lanzar tu beta por ~$25-45/mes.** Eso es barato. Lo avanzado
> (Gemini, TEE, ZKP) lo agregas cuando haya volumen e ingresos, no antes.

_Cifras reformuladas y verificadas contra fuentes oficiales (Supabase, Google Gemini API) — jun 2026._
