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
  // NOTA HISTÓRICA (corrige un intento anterior, commit c2abfdb): se probó la teoría
  // de que "...tseslint.configs.recommended" suelto en la raíz del array filtraba
  // reglas TS a TODO archivo sin importar 'ignores'. Se verificó con una reproducción
  // directa del binario de ESLint que esa teoría es INCORRECTA: 'ignores' sí excluye
  // correctamente los archivos que matchea de los bloques de reglas que le siguen en
  // el array. No reintroducir el scoping a 'files: ["src/**"]' por esa razón.
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
  // ── Override para scripts CommonJS de .kiro/skills/ (terceros, no código de la app) ──
  // Acotado EXPLÍCITAMENTE a '.kiro/**/*.cjs' (no a '**/*.cjs' global). Un .cjs futuro
  // en scripts/ o en la raíz del repo sigue recibiendo 'no-undef' normal — esa regla
  // sí detecta bugs reales (variables no definidas), a diferencia de las reglas de
  // estilo require()/CommonJS que sí tiene sentido apagar solo para skills de terceros.
  // Nota: '.kiro/**' ya está en 'ignores' arriba, lo que por sí solo alcanza para
  // excluir estos archivos del lint. Este bloque queda como segunda capa explícita
  // (a propósito, documentado) para que la exención sea visible sin tener que mirar
  // 'ignores', y sobreviva aunque cambie el mecanismo de ignore en el futuro.
  {
    files: ['.kiro/**/*.cjs'],
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
