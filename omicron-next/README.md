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

| Script              | Descripción                          |
| ------------------- | ------------------------------------ |
| `npm run dev`       | Servidor de desarrollo               |
| `npm run build`     | Build de producción                  |
| `npm run start`     | Sirve el build de producción         |
| `npm run lint`      | ESLint (config de Next)              |
| `npm run type-check`| Verificación de tipos con `tsc`      |

## Diseño

Dark mode profesional con acentos en **azul** (`hsl(217 91% 60%)`) y **morado**
(`hsl(271 81% 66%)`). Los degradados y sombras de marca están centralizados en
`tailwind.config.ts` (`bg-omicron-gradient`, `shadow-glow`) y en las variables de
`src/app/globals.css`.

## Estructura

```
src/
├── app/
│   ├── layout.tsx            # Layout raíz (dark, fuente Inter, metadata)
│   ├── page.tsx              # Redirige a /dashboard
│   ├── globals.css           # Tokens de diseño + utilidades
│   └── dashboard/
│       └── page.tsx          # Dashboard principal del usuario
├── components/
│   ├── ui/                   # Primitivos shadcn/ui (button, card, avatar, ...)
│   └── dashboard/            # Componentes del dashboard
│       ├── dashboard-header.tsx
│       ├── logo.tsx
│       ├── level-overview.tsx    # Nodo + XP + progreso al siguiente nodo
│       ├── progress-ring.tsx     # Anillo de progreso SVG
│       ├── skill-map.tsx         # Mapa de habilidades circular (radar SVG)
│       ├── earnings-card.tsx     # Ganancias del mes
│       ├── opportunities-section.tsx
│       └── opportunity-card.tsx
├── lib/
│   ├── utils.ts              # cn(), formatCurrency(), formatNumber()
│   └── mock-data.ts          # Datos de ejemplo (reemplazar por API)
└── types/
    └── index.ts              # Tipos de dominio del dashboard
```

## Datos

Actualmente el dashboard consume datos de ejemplo desde `src/lib/mock-data.ts`.
Para conectar un backend real, reemplaza esa fuente por una llamada a tu API
(por ejemplo Supabase) dentro de un Server Component.
