# 🚀 Puesta en Marcha — Dejar Ómicrom VIVO

> **Guía rápida y consolidada en [`README.md`](./README.md).** Este documento detalla la
> activación de la IA (Edge Functions) y el checklist de recorrido.

---

## 🟢 Estado actual (cierre) — qué hay que hacer para verla funcionando

La app React completa está **mergeada en `main` y desplegada en Vercel**
(auth, Inicio con núcleo 3D, Academia, Servicios, Empleos, Billetera, Gobernanza, Bóveda,
Chat, PWA) + toda la **capa en tiempo real** (presencia, ranking en vivo, "el trabajo te
busca", conexión/DM, Oráculo por voz) + **reputación unificada** (una sola fuente).

**Para dejarla 100% viva:**

1. **Variables en Vercel** (ya configuradas): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
2. **Migraciones Supabase** (`supabase db push` o SQL Editor). Las clave del cierre:
   - `0046_gemelo_profiles.sql` — Gemelo convalidado (RLS por usuario).
   - `0047_realtime_publication.sql` — **habilita Realtime** en `profiles`, `job_postings`,
     `job_matches` (ranking en vivo + "el trabajo te busca").
3. **Abrir producción:** `https://sistema-omicrom-git-main-tuprofendustrial-s-projects.vercel.app`
   — para ver lo multiusuario, abrila en **2 sesiones/dispositivos**.

> Presencia/actividad/DM funcionan sin la migración 0047; ranking y ofertas en vivo la necesitan.

---

## 🤖 Activación de la IA (Coach, Tutor, Examinador, Carta, Asesor, Oráculo, Redactor, Relator, Radar, Pasaporte y Premium)

Hazlo en orden.

---

## 0) Revisar el `.env.local` (en tu Mac, carpeta del proyecto)
Debe tener la URL y la anon key CORRECTAS (Supabase → Settings → API):
```
VITE_SUPABASE_URL=https://cuwuyqpxaibbqjrvamjb.supabase.co
VITE_SUPABASE_ANON_KEY=<tu anon/publishable key real>
```

## 1) Bajar el código
```bash
cd ~/Downloads/"project 6"
git pull
git checkout fix/coach-academia-simulador   # (si no estás en la rama)
```

## 2) Base de datos (una sola vez)
Supabase → **SQL Editor** → New query → pega **`supabase/PUESTA_EN_MARCHA.sql`** completo → **Run**.
> Incluye migraciones 0033–0039. Es idempotente (seguro de re-ejecutar).

## 3) Secreto de la IA (si no está)
Supabase → Edge Functions → Secrets → `GEMINI_API_KEY`.
> Para producción: activar **billing** de Gemini (el plan gratis tope ~20 llamadas).

## 4) Desplegar las Edge Functions
```bash
supabase functions deploy coach
supabase functions deploy tutor
supabase functions deploy run-code
supabase functions deploy examen-ia
supabase functions deploy carta-ia
supabase functions deploy market-match
supabase functions deploy vault-oracle
supabase functions deploy chat-assist
supabase functions deploy arbiter-ia
supabase functions deploy credential
```
> `arbiter-ia` en realidad se llama `arbiter-ai`. (Ojo con el nombre.)

## 5) Probar local
```bash
npm install
npm run dev
```
Abre `http://localhost:5173/`.

## 6) Probar la IA como Premium
Supabase → Table Editor → `profiles` → tu fila → `is_premium = true`.
(O SQL: `update profiles set is_premium=true where username='TU_USUARIO';`)

## 7) Mergear el PR
GitHub → Pull Request #1 → **Merge** (deja todo en `main`).

---

## ✅ Qué probar (recorrido)
- **Aprender** → nodo → "Rendir Examen IA" → preguntas → defensa → Acta con 4 ejes.
- **Perfil → Gemelo** → Dossier de Evidencia + "Generar Carta de Competencias" + "Generar Pasaporte Verificable".
- **Mercado** → Sello de Confianza + "Asesor IA de contratación".
- **Bóveda** → "Oráculo".
- **Empleos → Radar** → activar ubicación.
- **Mensajes** (canal de contrato) → botón ✨ Redactor IA.
- **Gobernanza** (caso como árbitro) → abrir Caja Negra → "Relator IA".

## ⚠️ Pendientes de endurecimiento (Fase 2)
- Reforzar el candado Premium en el **servidor** (hoy es frontend).
- **Tope de gasto** de IA por usuario.
- Verificar el **build de producción** (`npm run build`) antes de Vercel.
- Cerrar hallazgos de `AUDITORIA_COMPLETA.md` antes de la beta.
