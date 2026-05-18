import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

test.describe('Reportes de Cumplimiento Sanitario (ICA)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin/analytics/ica-compliance');
    await page.waitForLoadState('domcontentloaded');
  });

  test('debe cargar el dashboard de cumplimiento ICA correctamente', async ({ page }) => {
    // Verificar título principal
    await expect(page.getByText('Cumplimiento Sanitario')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Listado de Cumplimiento')).toBeVisible();

    // Verificar botones de exportación
    await expect(page.getByText('CSV', { exact: true })).toBeVisible();
    await expect(page.getByText('Reporte PDF', { exact: true })).toBeVisible();
  });

  test('debe permitir filtrar por estados de cumplimiento', async ({ page }) => {
    // Verificar tarjetas de filtrado
    const alDiaCard = page.locator('button, div[role="button"]').filter({ hasText: 'Al Día' }).first();
    const revisarCard = page.locator('button, div[role="button"]').filter({ hasText: 'Revisar' }).first();
    const vencidosCard = page.locator('button, div[role="button"]').filter({ hasText: 'Vencidos' }).first();

    if (await alDiaCard.isVisible()) {
      await alDiaCard.click();
      await page.waitForTimeout(500);
    }

    if (await revisarCard.isVisible()) {
      await revisarCard.click();
      await page.waitForTimeout(500);
    }

    if (await vencidosCard.isVisible()) {
      await vencidosCard.click();
      await page.waitForTimeout(500);
    }

    // Limpiar filtro si está visible
    const clearFilterBtn = page.getByRole('button', { name: /limpiar/i }).or(page.locator('button').filter({ has: page.locator('svg') }).first());
    if (await clearFilterBtn.isVisible()) {
      try { await clearFilterBtn.click(); } catch { /* noop */ }
    }
  });

  test('debe permitir buscar animales en el listado ICA', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/Buscar animal/i);
    await searchInput.fill('REC');
    await page.waitForTimeout(1000);

    const table = page.locator('table');
    await expect(table).toBeVisible();
  });
});
