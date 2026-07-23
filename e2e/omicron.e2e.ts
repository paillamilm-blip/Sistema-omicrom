import { test, expect, type Page } from '@playwright/test';

// ═══════════════════════════════════════════════════════════════════════
// QA de la experiencia Ómicron (Plan B — sin Nova Act, sin cuentas nuevas).
//
// Cómo correrlo (en TU máquina):
//   npm i -D @playwright/test
//   npx playwright install chromium
//   export TEST_EMAIL="tu_usuario_o_correo"
//   export TEST_PASSWORD="tu_password"
//   export BASE_URL="https://sistema-omicrom.vercel.app/"
//   npx playwright test
// ═══════════════════════════════════════════════════════════════════════

const EMAIL = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;

async function login(page: Page) {
  await page.goto('/');
  await page.getByPlaceholder(/usuario o correo/i).fill(EMAIL!);
  await page.locator('input[type="password"]').first().fill(PASSWORD!);
  // OJO: usar el botón de ENVÍO ("Acceder a la Red"), NO la pestaña
  // "Iniciar Sesión" (que solo cambia de modo y limpia los campos).
  await page.getByRole('button', { name: /acceder a la red/i }).click();
}

test('1 · La pantalla de acceso de Ómicron carga', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /sistema ómicron/i })).toBeVisible({ timeout: 25_000 });
});

test('2 · Login → home de Ómicron (comando + convalidar + nivel)', async ({ page }) => {
  test.skip(!EMAIL || !PASSWORD, 'Definí TEST_EMAIL y TEST_PASSWORD para este test.');
  await login(page);
  // Barra de comando debajo de la orbe.
  await expect(page.getByPlaceholder(/hablá o escribí a ómicron/i)).toBeVisible({ timeout: 30_000 });
  // Convalidación real y chip de nivel.
  await expect(page.getByText(/convalidar gemelo/i)).toBeVisible();
  await expect(page.getByText(/nivel/i).first()).toBeVisible();
});

test('3 · Ómicron navega por comando escrito', async ({ page }) => {
  test.skip(!EMAIL || !PASSWORD, 'Definí TEST_EMAIL y TEST_PASSWORD para este test.');
  await login(page);
  const input = page.getByPlaceholder(/hablá o escribí a ómicron/i);
  await expect(input).toBeVisible({ timeout: 30_000 });
  await input.fill('llévame a Academia');
  await input.press('Enter');
  // Debería navegar al nodo Academia.
  await expect(page.getByText(/academia/i).first()).toBeVisible({ timeout: 20_000 });
});
