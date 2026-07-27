// eslint.config.js
// Config plana (ESLint 9) para Sistema Ómicron: React + TypeScript + Vite.
// Corre con: npm run lint

import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  // Archivos/directorios fuera del alcance del linting de la app.
  // .kiro/ contiene skills con scripts CommonJS (.cjs) que usan require();
  // no son código de la app y no deben pasar por las reglas de TS/React.
  {
    ignores: [
      'dist',
      'node_modules',
      'supabase/functions/**',
      'scripts/**',
      'e2e/**',
      'playwright.config.ts',
      '.kiro/**',
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // `react-refresh/only-export-components` es una regla SOLO de DX (ayuda al
      // fast-refresh de Vite en desarrollo). No afecta el build ni el runtime.
      // Varios archivos exportan a proposito hooks/utilidades junto al componente
      // (ej. AppContext -> useApp, Onboarding -> shouldShowOnboarding). Se apaga
      // para mantener el CI limpio sin fragmentar esos archivos.
      'react-refresh/only-export-components': 'off',
      // Empezamos en 'warn' (no bloquea el build) para poder ir limpiando
      // el código existente gradualmente sin romper el flujo de trabajo.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  // ── Override final para .cjs (máxima prioridad: es el ÚLTIMO bloque del array) ──
  // En ESLint 9 flat config, cuando varios bloques matchean el mismo archivo, el
  // que aparece MÁS TARDE en el array gana. Este bloque queda al final a propósito:
  // sin importar qué reglas TS se hayan aplicado antes (via ignores, o spread de
  // recommended), esta es la última palabra para cualquier archivo .cjs, esté donde
  // esté (incluyendo .kiro/skills/**/*.cjs). Verificado con una reproducción aislada
  // del binario real de ESLint: este bloque por sí solo exime a los .cjs sin
  // depender de que 'ignores' matchee directorios con punto en todos los runners.
  {
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-undef': 'off',
    },
  }
);
