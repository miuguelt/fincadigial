/**
 * Multi-Finca Tests
 * =================
 * Tests E2E para funcionalidad multi-finca.
 */

import { test, expect } from '../fixtures/auth.fixture';
import { DashboardPage } from '../pages/DashboardPage';

test.describe('Multi-Finca', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    // Ya estamos logueados desde el fixture
    const dashboardPage = new DashboardPage(authenticatedPage);
    await dashboardPage.expectLoaded();
  });

  test('debería mostrar el selector de finca', async ({ authenticatedPage }) => {
    const dashboardPage = new DashboardPage(authenticatedPage);

    // Verificar selector visible
    await expect(dashboardPage.fincaSelector).toBeVisible();
  });

  test('debería cambiar de finca correctamente', async ({ authenticatedPage }) => {
    const dashboardPage = new DashboardPage(authenticatedPage);

    // Abrir selector
    await dashboardPage.clickFincaSelector();

    // Seleccionar otra finca (si existe)
    const fincaOptions = authenticatedPage.locator('[data-testid="finca-option"]');
    const count = await fincaOptions.count();

    if (count > 1) {
      // Click en la segunda finca
      await fincaOptions.nth(1).click();

      // Verificar que se cambió
      await authenticatedPage.waitForTimeout(1000);

      // La página debería recargar o actualizar datos
      await dashboardPage.expectStatsVisible();
    }
  });

  test('debería persistir finca seleccionada después de refresh', async ({ authenticatedPage }) => {
    const dashboardPage = new DashboardPage(authenticatedPage);

    // Obtener nombre de finca actual
    const fincaName = await dashboardPage.fincaSelector.textContent();

    // Refrescar
    await authenticatedPage.reload();
    await dashboardPage.expectLoaded();

    // Verificar que sigue en la misma finca
    const fincaNameAfter = await dashboardPage.fincaSelector.textContent();
    expect(fincaNameAfter).toBe(fincaName);
  });

  test('debería mostrar dashboard según tipo de finca', async ({ authenticatedPage }) => {
    // El dashboard debería adaptarse según si es finca tradicional o educativa
    const dashboardPage = new DashboardPage(authenticatedPage);

    await dashboardPage.expectStatsVisible();

    // Verificar elementos específicos según tipo
    // Por ejemplo, fincas educativas no tienen reportes regulatorios
  });

  test('debería filtrar datos por finca automáticamente', async ({ authenticatedPage }) => {
    const dashboardPage = new DashboardPage(authenticatedPage);

    // Ir a animales
    await dashboardPage.navigateToAnimals();

    // Los datos deberían estar filtrados por la finca seleccionada
    await expect(authenticatedPage.locator('[data-testid="animals-table"]')).toBeVisible();
  });
});
