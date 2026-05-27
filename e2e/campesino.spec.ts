import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

test.describe('Modulo Campesino', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/campesino');
    await page.waitForLoadState('domcontentloaded');
  });

  test('debe cargar el dashboard campesino con todas las herramientas', async ({ page }) => {
    await expect(page.getByText('Modulo Campesino')).toBeVisible({ timeout: 15000 });
    const tools = [
      'Parcelas y Cultivos',
      'Bitacora de Labores',
      'Fuentes de Agua',
      'Alertas Climaticas',
      'Mercado Campesino',
      'Asistencia Tecnica',
      'Aprendizaje Offline',
    ];
    for (const tool of tools) {
      await expect(page.getByText(tool).first()).toBeVisible();
    }
  });

  test('debe navegar a Parcelas y Cultivos al hacer clic', async ({ page }) => {
    await page.getByText('Parcelas y Cultivos').first().click();
    await expect(page).toHaveURL(/.*campesino\/crop-plots/);
    await expect(page.getByText('Gestion de Parcelas y Cultivos')).toBeVisible({ timeout: 10000 });
  });

  test('debe navegar a Bitacora de Labores al hacer clic', async ({ page }) => {
    await page.getByText('Bitacora de Labores').first().click();
    await expect(page).toHaveURL(/.*campesino\/crop-activities/);
    await expect(page.getByText('Bitacora de Labores de Cultivo')).toBeVisible({ timeout: 10000 });
  });

  test('debe navegar a Fuentes de Agua al hacer clic', async ({ page }) => {
    await page.getByText('Fuentes de Agua').first().click();
    await expect(page).toHaveURL(/.*campesino\/water-sources/);
    await expect(page.getByText('Gestion de Fuentes de Agua')).toBeVisible({ timeout: 10000 });
  });

  test('debe navegar a Mercado Campesino al hacer clic', async ({ page }) => {
    await page.getByText('Mercado Campesino').first().click();
    await expect(page).toHaveURL(/.*campesino\/market-offers/);
    await expect(page.getByText('Mercado Campesino')).toBeVisible({ timeout: 10000 });
  });

  test('debe mostrar el panel de navegacion lateral con opcion Campesino', async ({ page }) => {
    const sidebar = page.locator('#dashboard-sidebar');
    await expect(sidebar).toBeVisible();
    const campesinoSection = sidebar.getByText('Campesino');
    await expect(campesinoSection).toBeVisible();
  });

  test('debe mostrar el indicador de conexion en el dashboard', async ({ page }) => {
    const badge = page.locator('text=v1.0');
    await expect(badge).toBeVisible();
  });
});
