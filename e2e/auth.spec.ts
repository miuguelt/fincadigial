import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

test.describe('Flujos de Autenticación', () => {
  test('login exitoso redirige al dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name=username]', 'admin');
    await page.fill('[name=password]', 'test123');
    await page.click('button[type=submit]');
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.getByText(/Gestión total en tiempo real/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('login fallido muestra error de validación', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name=username]', 'mal_usuario');
    await page.fill('[name=password]', '123');
    await page.click('button[type=submit]');
    await expect(page.getByText('La contraseña debe tener al menos 4 caracteres')).toBeVisible();
  });
});
