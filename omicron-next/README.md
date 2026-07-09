# Omicron · Next.js

Reconstrucción del proyecto **Omicron** con una arquitectura limpia y moderna.

## Stack

- **Next.js 14** (App Router) + **React 18**
- **TypeScript** (modo estricto)
- **Tailwind CSS 3** + sistema de tokens con variables CSS
- **shadcn/ui** (Radix UI + CVA)
- **lucide-react** para iconografía

## Puesta en marcha

```bash
npm install
npm run dev
```

La app queda disponible en [http://localhost:3000](http://localhost:3000). La raíz `/`
redirige automáticamente a `/dashboard`.

### Scripts

| Script               | Descripción                     |
| -------------------- | ------------------------------- |
| `npm run dev`        | Servidor de desarrollo          |
| `npm run build`      | Build de producción             |
| `npm run start`      | Sirve el build de producción    |
| `npm run lint`       | ESLint (config de Next)         |
| `npm run type-check` | Verificación de tipos con `tsc` |
| `npm run test`       | Tests con Vitest                |
| `npm run test:watch` | Tests en modo watch             |

## Diseño

Dark mode profesional con acentos en **azul** (`hsl(217 91% 60%)`) y **morado**
(`hsl(271 81% 66%)`). Los degradados y sombras de marca están centralizados en
`tailwind.config.ts` (`bg-omicron-gradient`, `shadow-glow`) y en las variables de
`src/app/globals.css`.

## Rutas

| Ruta                  | Descripción                                            |
| --------------------- | ------------------------------------------------------ |
| `/`                   | Redirige a `/dashboard`                                |
| `/login`, `/registro` | Autenticación (grupo `(auth)`)                         |
| `/dashboard`          | Dashboard: nodo, XP, habilidades, ganancias, actividad |
| `/oportunidades`      | Listado con filtros (tipo + búsqueda)                  |
| `/oportunidades/[id]` | Detalle de una oportunidad                             |
| `/ranking`            | Leaderboard de nodos con podio                         |
| `/ganancias`          | Ingresos por mes, desglose y pagos                     |
| `/perfil`             | Perfil, insignias y progresión de nodos                |

Las rutas internas comparten el layout del grupo `(app)` (sidebar + topbar).

## Autenticación

Implementada con Supabase Auth (`@supabase/ssr`):

- `src/middleware.ts` refresca la sesión y protege las rutas internas.
- Server Actions en `src/lib/auth/actions.ts` (`signIn`, `signUp`, `signOut`).
- **Degradación elegante**: si Supabase no está configurado, el middleware
  deja pasar todo y las acciones entran directo al dashboard (modo demo).

## Base de datos

Migraciones y seed en `supabase/`:

- `supabase/migrations/*.sql`: tablas (`profiles`, `skills`, `opportunities`,
  `activity`, `achievements`, `earnings`), RLS y un trigger que crea el perfil
  al registrarse un usuario.
- `supabase/seed.sql`: oportunidades de ejemplo.

```bash
supabase start      # entorno local
supabase db reset   # aplica migraciones + seed
```

## Tests y CI

- **Vitest + Testing Library** (entorno jsdom). Tests en `src/**/*.test.ts(x)`.
- CI en `.github/workflows/omicron-next-ci.yml`: lint, type-check, test y build
  en cada push/PR que toque `omicron-next/`.

## Estructura

```
src/
├── app/
│   ├── layout.tsx            # Layout raíz (dark, fuente Inter, metadata)
│   ├── page.tsx              # Redirige a /dashboard
│   ├── not-found.tsx         # 404 global
│   ├── globals.css           # Tokens de diseño + utilidades
│   └── (app)/                # Grupo con sidebar + topbar
│       ├── layout.tsx        # App shell (Sidebar + Topbar)
│       ├── loading.tsx       # Skeletons de carga
│       ├── error.tsx         # Error boundary
│       ├── dashboard/
│       ├── oportunidades/    # page.tsx + [id]/page.tsx
│       ├── ranking/
│       └── perfil/
├── components/
│   ├── ui/                   # Primitivos shadcn/ui
│   ├── layout/               # sidebar, topbar, page-header
│   ├── dashboard/            # level-overview, skill-map, earnings, stats, ...
│   ├── opportunities/        # opportunities-explorer (filtros)
│   ├── ranking/              # leaderboard
│   └── profile/              # profile-header, achievements, node-progression
├── lib/
│   ├── utils.ts              # cn(), formatCurrency, formatNumber, formatDate, timeAgo
│   ├── icon-map.ts           # Resuelve iconos por nombre
│   ├── navigation.ts         # Rutas de la navegación lateral
│   ├── mock-data.ts          # Datos de ejemplo
│   ├── data/                 # Repositorios (Supabase con fallback a mock)
│   └── supabase/             # Clientes browser/server + tipos de DB
└── types/
    └── index.ts              # Tipos de dominio
```

## Datos y Supabase

La capa `src/lib/data/*` intenta leer de **Supabase** y, si no hay credenciales
(`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`), recurre
automáticamente a los datos mock de `src/lib/mock-data.ts`. Esto permite
desarrollar toda la UI sin backend.

Para conectar Supabase:

1. Copia `.env.example` a `.env.local` y completa las variables.
2. Crea las tablas (ver `src/lib/supabase/database.types.ts` como referencia).
3. Genera los tipos: `npx supabase gen types typescript ... > src/lib/supabase/database.types.ts`.
