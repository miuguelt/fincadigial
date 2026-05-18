/**
 * Regulatory Reports Tests
 * ========================
 * Tests E2E para reportes ICA/SENA.
 */

import { test, expect } from '../fixtures/auth.fixture';

test.describe('Reportes Regulatorios ICA/SENA', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    // Solo propietarios y capataces de fincas tradicionales pueden acceder
    await authenticatedPage.goto('/regulatory-reports');
  });

  test('debería mostrar la página de reportes', async ({ authenticatedPage }) => {
    // Verificar título
    await expect(authenticatedPage.locator('h1')).toContainText('Reportes');

    // Verificar opciones de reporte
    await expect(authenticatedPage.locator('text=Inventario')).toBeVisible();
    await expect(authenticatedPage.locator('text=Movimientos')).toBeVisible();
    await expect(authenticatedPage.locator('text=Sanidad')).toBeVisible();
  });

  test('debería generar reporte de inventario en CSV', async ({ authenticatedPage }) => {
    // Seleccionar tipo de reporte
    await authenticatedPage.click('text=Inventario de Ganado');

    // Seleccionar formato CSV
    await authenticatedPage.selectOption('select[name="format"]', 'csv');

    // Click en descargar
    const [download] = await Promise.all([
      authenticatedPage.waitForEvent('download'),
      authenticatedPage.click('button:has-text("Descargar")'),
    ]);

    // Verificar que se descargó
    expect(download.suggestedFilename()).toContain('.csv');
  });

  test('debería generar reporte de movimientos con filtros', async ({ authenticatedPage }) => {
    // Seleccionar movimientos
    await authenticatedPage.click('text=Movimientos de Ganado');

    // Seleccionar tipo
    await authenticatedPage.selectOption('select[name="type"]', 'births');

    // Seleccionar fechas
    await authenticatedPage.fill('input[name="date_from"]', '2024-01-01');
    await authenticatedPage.fill('input[name="date_to"]', '2024-12-31');

    // Descargar
    const [download] = await Promise.all([
      authenticatedPage.waitForEvent('download'),
      authenticatedPage.click('button:has-text("Descargar")'),
    ]);

    expect(download.suggestedFilename()).toContain('.csv');
  });

  test('debería generar reporte de sanidad', async ({ authenticatedPage }) => {
    // Seleccionar sanidad
    await authenticatedPage.click('text=Reporte de Sanidad');

    // Seleccionar tipo vacunaciones
    await authenticatedPage.selectOption('select[name="type"]', 'vaccinations');

    // Descargar
    const [download] = await Promise.all([
      authenticatedPage.waitForEvent('download'),
      authenticatedPage.click('button:has-text("Descargar")'),
    ]);

    expect(download.suggestedFilename()).toContain('.csv');
  });

  test('debería bloquear acceso a fincas educativas', async ({ loginAs }) => {
    // Loguearse como instructor (finca educativa)
    const page = await loginAs('operario');

    // Intentar acceder a reportes
    await page.goto('/regulatory-reports');

    // Debería mostrar mensaje de restricción
    await expect(page.locator('text=Acceso Restringido')).toBeVisible();
    await expect(page.locator('text=solo están disponibles para fincas tradicionales')).toBeVisible();
  });

  test('debería mostrar información de formatos disponibles', async ({ authenticatedPage }) => {
    // Debería haber información sobre qué se reporta
    await expect(authenticatedPage.locator('text=ICA')).toBeVisible();
    await expect(authenticatedPage.locator('text=SENA')).toBeVisible();
  });
});
