import { test, expect } from '@playwright/test';
import { loginAs, storageStatePath } from './helpers/auth';
import * as fs from 'fs';

const adminAuthFile = storageStatePath('admin');
const useStorageState = fs.existsSync(adminAuthFile);

test.describe('Pestaña de alertas reproductivas', () => {
  if (useStorageState) {
    test.use({ storageState: adminAuthFile });
  }

  test.beforeEach(async ({ page }) => {
    if (!useStorageState) {
      await loginAs(page, 'admin');
    }
    await page.goto('/admin/reproduction?tab=alertas');
    await expect(page.getByRole('heading', { name: 'Gestión Reproductiva' })).toBeVisible({ timeout: 15_000 });
  });

  test('abre la pestaña solicitada y muestra el protocolo de detección', async ({ page }) => {
    await expect(page).toHaveURL(/\/admin\/reproduction\?tab=alertas/);
    await expect(page.getByRole('tab', { name: 'Alertas Celo' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('heading', { name: 'Protocolo de Detección de Celos' })).toBeVisible();
    await expect(page.getByText(/Regla Mañana-Tarde/)).toBeVisible();
  });

  test('mantiene la lectura y los controles principales en una pantalla móvil', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await expect(page.getByRole('tab', { name: 'Alertas Celo' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Protocolo de Detección de Celos' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Actualizar alertas de celo' })).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
  });
});
