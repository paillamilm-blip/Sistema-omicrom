import { test, expect } from '@playwright/test';

// ═══════════════════════════════════════════════════════════════════════
// QA de la experiencia Ómicron (Plan B — sin Nova Act, sin cuentas).
//
// Cómo correrlo (en TU máquina):
//   1) npm i -D @playwright/test
//   2) npx playwright install chromium
//   3) Definí (opcional) un usuario de prueba ya registrado:
//        export TEST_EMAIL="tu_correo_o_usuario"
//        export TEST_PASSWORD="tu_password"
//   4) Apuntá a tu app:
//        export BASE_URL="https://tu-app.vercel.app"   (o dejá localhost:5173)
//   5) npx playwright test          (navegador visible)
//
// Los selectores usan textos/roles reales de la app; si cambian, ajustalos.
// ═══════════════════════════════════════════════════════════════════════

const EMAIL = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;

test('1 · La app carga y la orbe de Ómicron se renderiza', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto('/');

  // La orbe de partículas dibuja un <canvas> (pantalla de carga o home).
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 25_000 });

  // La marca Ómicron debe aparecer en algún lugar (auth, carga o home).
  await expect(page.getByText(/ómicron|omicron/i).first()).toBeVisible({ timeout: 25_000 });
});

test('2 · Login → home de Ómicron (orbe + comando + convalidación)', async ({ page }) => {
  test.skip(!EMAIL || !PASSWORD, 'Definí TEST_EMAIL y TEST_PASSWORD para correr este test.');

  await page.goto('/');

  // Formulario de acceso (modo login usa "Tu usuario o correo").
  await page.getByPlaceholder(/usuario o correo/i).fill(EMAIL!);
  await page.locator('input[type="password"]').first().fill(PASSWORD!);
  await page.getByRole('button', { name: /entrar|iniciar|ingresar|acceder/i }).first().click();

  // Home de Ómicron: barra de comando debajo de la orbe.
  await expect(page.getByPlaceholder(/hablá o escribí a ómicron/i)).toBeVisible({ timeout: 30_000 });

  // Botón de convalidación real del Gemelo.
  await expect(page.getByText(/convalidar gemelo/i)).toBeVisible();

  // Chip de nivel.
  await expect(page.getByText(/nivel/i).first()).toBeVisible();
});

test('3 · Ómicron responde a un comando escrito', async ({ page }) => {
  test.skip(!EMAIL || !PASSWORD, 'Definí TEST_EMAIL y TEST_PASSWORD para correr este test.');

  await page.goto('/');
  await page.getByPlaceholder(/usuario o correo/i).fill(EMAIL!);
  await page.locator('input[type="password"]').first().fill(PASSWORD!);
  await page.getByRole('button', { name: /entrar|iniciar|ingresar|acceder/i }).first().click();

  const input = page.getByPlaceholder(/hablá o escribí a ómicron/i);
  await expect(input).toBeVisible({ timeout: 30_000 });

  // Le pedimos ir a Academia; Ómicron debería navegar allí.
  await input.fill('llévame a Academia');
  await input.press('Enter');

  // Señal de navegación al nodo Academia (título de la sección).
  await expect(page.getByText(/academia/i).first()).toBeVisible({ timeout: 20_000 });
});
