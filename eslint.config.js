// eslint.config.js
// Config plana (ESLint 9) para Sistema Ómicron: React + TypeScript + Vite.
// Corre con: npm run lint

import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  // scripts/**: utilidades de build en CommonJS puro (.cjs), fuera del
  // alcance de las reglas de TypeScript/React (no son código de la app).
  { ignores: ['dist', 'node_modules', 'supabase/functions/**', 'scripts/**'] },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Empezamos en 'warn' (no bloquea el build) para poder ir limpiando
      // el código existente gradualmente sin romper el flujo de trabajo.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  }
);
