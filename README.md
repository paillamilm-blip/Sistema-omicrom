<div align="center">

# ⚡ Sistema Ómicrom

**Aprendizaje continuo en tiempo real, para todo el mundo — conectado a oportunidades reales del mercado, al instante.**

`React + Vite` · `Supabase` · `Realtime` · `PWA` · `Industria 5.0`

</div>

---

## 🌐 Qué es

Ómicrom es una herramienta de **aprendizaje continuo en tiempo real**, pensada para cualquier
persona en cualquier lugar, sin restricción geográfica. Construís una **reputación verificable
e imposible de falsear** — tu **Gemelo Digital** — y esa reputación se conecta, al instante,
con **oportunidades reales del mercado laboral**. Rompe el círculo _"sin experiencia no me
contratan → sin que me contraten no gano experiencia"_.

Es la Industria 5.0 aplicada al talento: en un mundo donde todo es instantáneo, tu capacidad
real ya no debería tardar meses en ser reconocida.

El corazón es el **Núcleo (Gemelo Digital)**: un núcleo 3D vivo, alimentado por datos reales,
rodeado por tu red en tiempo real. Un **Oráculo** te guía por voz hacia tu mejor próximo paso,
y **el trabajo te busca a ti**.

> La visión conceptual completa está en [`DEFINICION_OMICROM.md`](./DEFINICION_OMICROM.md) y
> [`DEFINICION_OMICROM_v8_BACKEND.md`](./DEFINICION_OMICROM_v8_BACKEND.md).

---

## 🧬 El Gemelo Digital (una sola reputación)

La reputación se gana con **evidencia real** (regla 80/20) y es **una sola fuente de verdad**
(`profiles` en Supabase), consistente en toda la app — ranking, presencia, núcleo, header y Oráculo:

```
REPUTACIÓN = promedio de 4 ejes → Ejecución · Calidad · Trascendencia · Fundamento
```

- **Convalidar** CV / títulos / experiencia / aportes **sube tu reputación real** (y tu puesto en el ranking).
- El **Nodo** evoluciona: Operativo → Core → Arquitecto → (Fundador).

---

## 🛰️ Red en tiempo real (multiusuario)

Construido sobre **Supabase Realtime** (Presence + Broadcast + `postgres_changes`):

- **Presencia real**: contador de nodos en línea + **satélites orbitando** tu núcleo + tira de conectados.
- **Panel "Red Ómicron en vivo"** (badge del header): quién está conectado + actividad de la red.
- **Ranking en vivo**: se actualiza cuando cambian las reputaciones.
- **Conexión social**: tocá un nodo → su credencial → **Conectar** / **DM**.
- **"El trabajo te busca"**: push en vivo al publicarse una oferta (`job_postings`) y **match personalizado** (`job_matches`).
- **Oráculo proactivo** por voz: te saluda con la red en vivo + tu mejor próximo paso.

---

## 🧱 Stack

| Capa | Tecnología |
|------|------------|
| Frontend | React 18 + TypeScript + Vite 5 |
| Estilos | Tailwind CSS + design system propio (`src/theme.ts`) |
| Animación | Framer Motion + GSAP + canvas puro (núcleo 3D) |
| Backend | Supabase (Postgres + Auth + Realtime + Edge Functions) |
| Deploy | Vercel (PWA instalable) |

---

## 🚀 Puesta en marcha (local)

**1. Variables de entorno** — crea `.env.local` (ver `.env.example`):

```bash
VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<tu-anon-key>
```

**2. Instalar y correr:**

```bash
npm install
npm run dev        # http://localhost:5173
```

**3. Scripts disponibles:**

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run preview` | Previsualiza el build |
| `npm run typecheck` | Chequeo de tipos (tsc) |
| `npm run lint` | ESLint |
| `npm run test` | Tests (Vitest) |

---

## 🗄️ Base de datos (Supabase)

Las migraciones están en `supabase/migrations/` (idempotentes). Aplicarlas con la CLI o el SQL Editor:

```bash
supabase db push
```

Claves recientes:

- **`0046_gemelo_profiles.sql`** — tabla del Gemelo convalidado (CV/títulos/años/aportes) con RLS por usuario.
- **`0047_realtime_publication.sql`** — habilita **Realtime replication** en `profiles`, `job_postings` y `job_matches` (necesario para ranking en vivo y "el trabajo te busca").

Para las funciones de IA (Coach/Tutor/Examinador/etc.) y el despliegue de Edge Functions,
ver [`GUIA_ACTIVACION_PRODUCCION.md`](./GUIA_ACTIVACION_PRODUCCION.md).

> Presencia, actividad y DM funcionan con Presence/Broadcast (no requieren replication).
> Ranking y ofertas en vivo requieren la migración `0047`.

---

## ☁️ Deploy e instalación (PWA)

- **Producción (rama `main`):**
  `https://sistema-omicrom-git-main-tuprofendustrial-s-projects.vercel.app`
- Cada push a `main` despliega automáticamente en Vercel.
- Es una **PWA instalable**: abrí el link en el móvil → **"Añadir a pantalla de inicio"** (o el botón **Instalar app** dentro de la app) y queda como una app nativa.
- Para la voz del Oráculo: Chrome/Edge con sonido activo (el primer toque desbloquea el audio en móvil).

---

## 📁 Estructura

```
src/
├── App.tsx                 Shell + navegación + providers (Realtime)
├── components/
│   ├── omicron/ParticleOrb.tsx  Núcleo único (canvas 2.5D, reactivo a voz) — el ÚNICO orbe de toda la app
│   ├── OraculoBar.tsx      Oráculo por voz (proactivo)
│   ├── shared/             LivePresence, LiveRanking, IncomingJobs, GemeloBadge…
│   ├── perfil/             CartaCompetencias, RedSocial, Pasaporte…
│   └── tabs/               Perfil(Inicio), Academia, Market, Empleos, Wallet…
├── hooks/                  useGemeloProfile, useRealtimeNetwork
├── store/                  AppContext, RealtimeContext
├── lib/                    supabase, gemeloProfile, oraculo
└── services/               reputationService
public/prototipos/          Prototipos estáticos (holo-gemelo, núcleo, os…)
supabase/migrations/        Migraciones SQL
```

---

## 📚 Documentos del proyecto

| Documento | Contenido |
|-----------|-----------|
| [`PLAN_PRODUCCION.md`](./PLAN_PRODUCCION.md) | 🚀 Plan de producción vivo: fases, progreso real, PRs asociados |
| [`DEFINICION_OMICROM.md`](./DEFINICION_OMICROM.md) | Visión y definición del sistema |
| [`DEFINICION_OMICROM_v8_BACKEND.md`](./DEFINICION_OMICROM_v8_BACKEND.md) | Definición técnica del backend |
| [`DEFINICION_REPUTACION_OMICROM.md`](./DEFINICION_REPUTACION_OMICROM.md) | Fórmula canónica de reputación (fuente única de verdad) |
| [`VISION_OMICROM.md`](./VISION_OMICROM.md) | Norte de producto: el asistente que empuja a la mejora |
| [`GUIA_ACTIVACION_PRODUCCION.md`](./GUIA_ACTIVACION_PRODUCCION.md) | Guía paso a paso para activar producción (pagos, monitoreo, correo) |
| [`PANEL_DE_CONTROL.md`](./PANEL_DE_CONTROL.md) | Dónde van las claves/secretos + checklist maestro |

> 📌 **Pendientes de documentar** (no existen aún en el repo, se están priorizando):
> Bitácora histórica de decisiones, auditoría técnica formal, y revisión de UX.
> Ver [`PLAN_PRODUCCION.md`](./PLAN_PRODUCCION.md) para el roadmap activo con estado real.

---

## 🔭 Prototipos

Experiencias estáticas navegables (sin build) en `public/prototipos/`, servidas por el mismo deploy:

`/prototipos/index.html` · `/prototipos/holo-gemelo.html` · `/prototipos/nucleo.html` ·
`/prototipos/os.html` · `/prototipos/aprendizaje.html` …

---

<div align="center">

Hecho con ⚡ para la Industria 5.0 · Aprendizaje continuo en tiempo real · Sin fronteras · Confianza Cero

</div>
