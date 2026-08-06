<div align="center">

# Sistema Omicrom

**Aprendizaje continuo en tiempo real, para todo el mundo — conectado a oportunidades reales del mercado, al instante.**

`React + Vite` · `Supabase` · `Three.js` · `Realtime` · `PWA` · `Industria 5.0`

</div>

---

## Que es

Omicron es una herramienta de aprendizaje continuo en tiempo real, pensada para cualquier
persona en cualquier lugar. Construyes una reputacion verificable e imposible de falsear
— tu **Gemelo Digital** — y esa reputacion se conecta, al instante, con oportunidades
reales del mercado laboral.

El corazon es un **Orbe Neuronal 3D** vivo, alimentado por datos reales de tu CV,
rodeado por tu red en tiempo real. Un **Oraculo** te guia por voz hacia tu mejor
proximo paso, y el trabajo te busca a ti.

---

## El Gemelo Digital

```
REPUTACION = 20% credenciales + 80% promedio(Ejecucion, Calidad, Trascendencia, Fundamento)
```

- **Convalidar** CV / titulos / experiencia sube tu reputacion real.
- Skills con nivel real (% del analisis IA) + sinergia entre nodos relacionados.
- El Nodo evoluciona: Operativo -> Core -> Arquitecto.

---

## Stack

| Capa | Tecnologia |
|------|------------|
| Frontend | React 18 + TypeScript + Vite 5 |
| 3D | Three.js (OrbNeuronal) + Framer Motion |
| Estilos | Design system propio (`src/theme.ts`) |
| Backend | Supabase (Postgres + Auth + Realtime + Edge Functions) |
| IA | OpenRouter (Gemma 4) + Edge Functions (Coach, Tutor, Examen) |
| Deploy | Vercel (PWA instalable) |

---

## Puesta en marcha (local)

**1. Variables de entorno** — crea `.env.local` (ver `.env.example`):

```bash
VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<tu-anon-key>
VITE_OPENROUTER_KEY=<tu-key-openrouter>
```

**2. Instalar y correr:**

```bash
npm install
npm run dev        # http://localhost:5173
```

**3. Scripts:**

| Comando | Que hace |
|---------|----------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de produccion |
| `npm run preview` | Previsualiza el build |
| `npm run typecheck` | Chequeo de tipos (tsc) |
| `npm run lint` | ESLint |
| `npm run test` | Tests (Vitest) |

---

## Base de datos (Supabase)

Migraciones en `supabase/migrations/` (63 archivos, idempotentes):

```bash
supabase db push
```

Edge Functions en `supabase/functions/` (21 funciones):
coach, tutor, examen-ia, carta-ia, chat-assist, arbiter-ai, vault-oracle,
market-match, stripe-webhook, crear-checkout, verificar-pago, y mas.

---

## Estructura

```
src/
├── App.tsx                  Shell + providers
├── components/
│   ├── omicron/             OrbShell, OrbNeuronal (3D), OmicronAssistant, ConvalidaOmicron
│   ├── perfil/              PerfilSkillVisual, ProfileCard, PasaporteGemelo, CartaCompetencias
│   ├── shared/              BottomNav, ConnectionBanner, Toast, LivePresence
│   └── tabs/                PerfilTab, AcademiaTab, EmpleosTab, MarketTab, WalletTab...
├── hooks/                   useGemeloProfile, useGemeloActivation, useRealtimeNetwork
├── store/                   AppContext, ProfileContext, NavigationContext, RealtimeContext
├── lib/                     oraculo, voiceEngine, cvAnalyzer, geminiClient, omicronCoach
└── services/                reputationService
supabase/
├── migrations/              63 migraciones SQL
└── functions/               21 Edge Functions
```

---

## Deploy (PWA)

- Cada push a `main` despliega automaticamente en Vercel.
- PWA instalable: abre en el movil > "Anadir a pantalla de inicio".
- Para produccion (Stripe, Sentry, SMTP): ver `GUIA_ACTIVACION_PRODUCCION.md`.

---

## Documentos del proyecto

| Documento | Contenido |
|-----------|-----------|
| `DEFINICION_OMICROM.md` | Vision, pilares, modelo economico, norte del producto |
| `DEFINICION_OMICROM_v8_BACKEND.md` | Arquitectura tecnica backend (con estado de implementacion) |
| `DEFINICION_REPUTACION_OMICROM.md` | Formula canonica del Gemelo Digital (fuente unica de verdad) |
| `PLAN_PRODUCCION.md` | Roadmap + estado operativo + milestones + KPIs |
| `GUIA_ACTIVACION_PRODUCCION.md` | Pasos para activar produccion (Stripe, Sentry, SMTP, claves) |
| `CHANGELOG.md` | Historial de cambios |
| `TERMINOS_SERVICIO.md` | Terminos legales de uso |
| `POLITICA_PRIVACIDAD.md` | Politica de privacidad |

---

<div align="center">

Hecho con fuerza para la Industria 5.0 · Aprendizaje continuo en tiempo real · Sin fronteras

</div>
