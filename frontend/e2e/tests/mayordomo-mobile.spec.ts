import { test, expect } from '../fixtures/auth.fixture';

test.use({ viewport: { width: 390, height: 844 } });

test.describe('Flujo móvil del mayordomo (390x844)', () => {
  test('carga login móvil sin desbordamiento horizontal', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[name="identifier"]')).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow).toBe(false);
  });

  test('operario abre Acción, registra ordeño y consulta inventario con etiquetas de vista', async ({
    loginAs,
  }) => {
    test.skip(
      !process.env.E2E_WORKER_PASS,
      'Pendiente: definir E2E_WORKER_PASS en el entorno para ejecutar flujo autenticado de operario',
    );

    const page = await loginAs('operario');

    // 1. Abrir «Acción» en la barra inferior y validar que solo muestra acciones permitidas
    const actionBtn = page.getByRole('button', { name: /acciones rápidas de la finca/i });
    await expect(actionBtn).toBeVisible();
    await actionBtn.click();

    await expect(page.getByText('Leche')).toBeVisible();
    await expect(page.getByText('Peso')).toBeVisible();
    await expect(page.getByText('Traslado')).toBeVisible();
    await expect(page.getByText('Salud')).toHaveCount(0);

    // 2. Abrir y cerrar el modal de ordeño
    await page.getByRole('button', { name: /leche/i }).first().click();
    await expect(page.getByRole('heading', { name: /registrar leche/i })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: /registrar leche/i })).toHaveCount(0);

    // 3. Abrir inventario de ganado y verificar etiquetas de vista en móvil
    await page.getByRole('button', { name: /ir a ganado/i }).click();
    await page.waitForURL('**/operario/animals**');
    await expect(page.getByRole('button', { name: /vista en tabla/i })).toContainText('Tabla');
    await expect(page.getByRole('button', { name: /vista en tarjetas/i })).toContainText('Tarjetas');
    await expect(page.getByRole('button', { name: /vista potreros/i })).toContainText('Potreros');
  });
});
