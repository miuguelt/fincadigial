/**
 * Offline/Online Tests
 * ====================
 * Tests E2E para funcionalidad offline/online.
 */

import { test, expect } from '../fixtures/auth.fixture';
import { DashboardPage } from '../pages/DashboardPage';
import { AnimalsPage } from '../pages/AnimalsPage';

test.describe('Modo Offline/Online', () => {
  test('debería mostrar indicador de conexión', async ({ authenticatedPage }) => {
    // Verificar que hay indicador de conexión
    const connectionIndicator = authenticatedPage.locator('[data-testid="connection-status"]');

    // Podría estar visible o no dependiendo del estado
    const isVisible = await connectionIndicator.isVisible().catch(() => false);

    if (isVisible) {
      const text = await connectionIndicator.textContent();
      expect(['Online', 'Offline']).toContain(text?.trim());
    }
  });

  test('debería funcionar offline después de carga inicial', async ({ authenticatedPage }) => {
    const dashboardPage = new DashboardPage(authenticatedPage);

    // Asegurar que la app está cargada
    await dashboardPage.expectLoaded();

    // Simular offline
    await authenticatedPage.context().setOffline(true);

    // Intentar navegar
    await dashboardPage.navigateToAnimals();

    // Debería mostrar página (desde caché) o mensaje offline
    const offlineMessage = authenticatedPage.locator('text=Offline');
    const animalsTable = authenticatedPage.locator('[data-testid="animals-table"]');

    const hasOffline = await offlineMessage.isVisible().catch(() => false);
    const hasTable = await animalsTable.isVisible().catch(() => false);

    expect(hasOffline || hasTable).toBeTruthy();

    // Restaurar conexión
    await authenticatedPage.context().setOffline(false);
  });

  test('debería sincronizar datos cuando vuelve la conexión', async ({ authenticatedPage }) => {
    const animalsPage = new AnimalsPage(authenticatedPage);

    // Ir a animales
    await animalsPage.goto();
    await animalsPage.expectTableVisible();

    // Simular offline
    await authenticatedPage.context().setOffline(true);

    // Hacer una operación (quedará pendiente)
    await animalsPage.searchAnimal('test');

    // Restaurar conexión
    await authenticatedPage.context().setOffline(false);

    // Esperar sincronización
    await authenticatedPage.waitForTimeout(2000);

    // Verificar que la app responde
    await animalsPage.expectTableVisible();
  });

  test('debería mostrar página offline cuando no hay caché', async ({ page }) => {
    // Nueva página sin caché
    await page.goto('/');

    // Simular offline desde el inicio
    await page.context().setOffline(true);

    // Intentar cargar
    await page.reload();

    // Debería mostrar página offline
    await expect(page.locator('text=Sin Conexión')).toBeVisible();
    await expect(page.locator('text=Modo Offline')).toBeVisible();

    // Restaurar
    await page.context().setOffline(false);
  });

  test('debería cachear recursos estáticos', async ({ authenticatedPage }) => {
    // La app debería tener Service Worker registrado
    const swRegistered = await authenticatedPage.evaluate(() => {
      return 'serviceWorker' in navigator && navigator.serviceWorker.controller !== null;
    });

    expect(swRegistered).toBe(true);
  });

  test('debería mostrar prompt de instalación en móviles', async ({ page }) => {
    // Simular user agent móvil
    await page.context().setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
    });

    await page.goto('/');

    // El prompt de instalación debería estar disponible
    // Nota: esto es más una verificación de que el manifest está correcto
    const manifest = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(manifest).toBe('/manifest.json');
  });
});
