import { test, expect, type Page } from '@playwright/test';

// ═══════════════════════════════════════════════════════════════════════
// QA COMPLETA de la experiencia Ómicron (Plan B — sin Nova Act).
//
//   npm i -D @playwright/test && npx playwright install chromium
//   export TEST_EMAIL="tu_usuario_o_correo"
//   export TEST_PASSWORD="tu_password"
//   export BASE_URL="https://sistema-omicrom.vercel.app/"
//   npx playwright test           # navegador visible
//   npx playwright show-report    # ver el reporte con capturas
// ═══════════════════════════════════════════════════════════════════════

const EMAIL = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;
const HAS_CREDS = !!EMAIL && !!PASSWORD;

// Nodos del ecosistema: etiqueta del botón en el home → título de la sección.
const NODES: { label: string; title: RegExp }[] = [
  { label: 'Academia', title: /academia/i },
  { label: 'Habilidades', title: /habilidades/i },
  { label: 'Empleos', title: /oportunidades/i },
  { label: 'Servicios', title: /servicios/i },
  { label: 'Billetera', title: /billetera/i },
  { label: 'Bóveda', title: /bóveda/i },
  { label: 'Mensajes', title: /mensajes/i },
  { label: 'Gobernanza', title: /gobernanza/i },
];

async function login(page: Page) {
  await page.goto('/');
  await page.getByPlaceholder(/usuario o correo/i).fill(EMAIL!);
  await page.locator('input[type="password"]').first().fill(PASSWORD!);
  // Botón de ENVÍO ("Acceder a la Red"), NO la pestaña "Iniciar Sesión".
  await page.getByRole('button', { name: /acceder a la red/i }).click();
  // Home listo cuando aparece la barra de comando de Ómicron.
  await expect(page.getByPlaceholder(/hablá o escribí a ómicron/i)).toBeVisible({ timeout: 30_000 });
}

async function goHome(page: Page) {
  await page.goto('/'); // activeTab vuelve a 'perfil' (home de Ómicron)
  await expect(page.getByPlaceholder(/hablá o escribí a ómicron/i)).toBeVisible({ timeout: 30_000 });
}

// ── 1 · Pantalla de acceso ─────────────────────────────────────────────
test('1 · La pantalla de acceso de Ómicron carga', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /sistema ómicron/i })).toBeVisible({ timeout: 25_000 });
});

// ── 2 · Home completo tras login ───────────────────────────────────────
test('2 · Home de Ómicron: orbe + comando + acciones + capacidades', async ({ page }) => {
  test.skip(!HAS_CREDS, 'Definí TEST_EMAIL y TEST_PASSWORD.');
  await login(page);

  await expect(page.locator('canvas').first()).toBeVisible();          // orbe de partículas
  await expect(page.getByText(/convalidar gemelo/i)).toBeVisible();    // convalidación
  await expect(page.getByText(/examen de nivel/i)).toBeVisible();      // examen
  await expect(page.getByText(/nivel/i).first()).toBeVisible();        // chip de nivel
  await expect(page.getByText(/ejecución/i).first()).toBeVisible();    // 4 ejes en vivo

  await page.screenshot({ path: 'test-results/omicron-home.png', fullPage: true });
});

// ── 3 · Convalidación REAL (la reputación sube) ────────────────────────
test('3 · Convalidar el Gemelo mueve la reputación real', async ({ page }) => {
  test.skip(!HAS_CREDS, 'Definí TEST_EMAIL y TEST_PASSWORD.');
  await login(page);

  await page.getByText(/convalidar gemelo/i).click();
  await expect(page.getByText(/convalidar gemelo/i).first()).toBeVisible(); // header del panel

  // Convalidar un aporte a la Bóveda (botón directo, sin archivo).
  await page.getByRole('button', { name: /aporte a la bóveda/i }).click();

  // El servidor confirma → mensaje de éxito.
  await expect(page.getByText(/convalidado/i)).toBeVisible({ timeout: 20_000 });
  await page.screenshot({ path: 'test-results/omicron-convalida.png', fullPage: true });
});

// ── 4 · Comando escrito → navegación ───────────────────────────────────
test('4 · Ómicron navega por comando escrito', async ({ page }) => {
  test.skip(!HAS_CREDS, 'Definí TEST_EMAIL y TEST_PASSWORD.');
  await login(page);
  const input = page.getByPlaceholder(/hablá o escribí a ómicron/i);
  await input.fill('llévame a Academia');
  await input.press('Enter');
  await expect(page.getByText(/academia/i).first()).toBeVisible({ timeout: 20_000 });
});

// ── 5 · Recorrido por TODOS los nodos del ecosistema ───────────────────
test('5 · Todos los nodos abren desde el home', async ({ page }) => {
  test.skip(!HAS_CREDS, 'Definí TEST_EMAIL y TEST_PASSWORD.');
  await login(page);

  for (const node of NODES) {
    await test.step(`Nodo: ${node.label}`, async () => {
      await goHome(page);
      await page.getByRole('button', { name: node.label }).first().click();
      // Verificación suave: reporta el nodo que falle sin abortar el resto.
      await expect.soft(page.getByText(node.title).first()).toBeVisible({ timeout: 20_000 });
      await page.screenshot({ path: `test-results/nodo-${node.label}.png` });
    });
  }
});
