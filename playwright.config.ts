import { defineConfig, devices } from '@playwright/test';

// ─────────────────────────────────────────────────────────────
// Playwright E2E — prueba la experiencia Ómicron como un humano.
// Se corre en TU máquina (este repo no lo ejecuta en CI):
//   npm i -D @playwright/test
//   npx playwright install chromium
//   BASE_URL="https://tu-app.vercel.app" npx playwright test
// (o dejá el default localhost si corrés `npm run dev`)
// ─────────────────────────────────────────────────────────────
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    headless: false, // navegador visible para que VEAS a Ómicron probándose
    viewport: { width: 420, height: 860 }, // móvil (la app es PWA)
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    ignoreHTTPSErrors: true,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
