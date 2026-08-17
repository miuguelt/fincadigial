import { test, expect } from '@playwright/test';
import { randomBytes } from 'node:crypto';

const ADMIN_PASSWORD = process.env.VILLALUZ_E2E_ADMIN_PASSWORD || process.env.E2E_ADMIN_PASS;
if (!ADMIN_PASSWORD) {
  throw new Error(
    'Falta VILLALUZ_E2E_ADMIN_PASSWORD. Inyecta la contraseña E2E desde el entorno; no existe un valor por defecto.',
  );
}
import { loginAs } from './helpers/auth';

/**
 * Tests de autenticación.
 *
 * NOTA: Estos tests NO usan storageState porque prueban el flujo
 * de login/logout en sí mismo. Los demás módulos (animals, campesino, etc.)
 * sí usan storageState para evitar repetir el login.
 */
test.describe('Flujos de Autenticación', () => {
  test('login exitoso redirige al dashboard', async ({ page }) => {
    await page.goto('/login');

    // Esperar que el formulario esté listo
    await page.waitForSelector('[name=identifier]', { state: 'visible' });

    await page.fill('[name=identifier]', process.env.E2E_ADMIN_ID || '10000001');
    await page.fill('[name=password]', ADMIN_PASSWORD);
    await page.click('button[type=submit]');

    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15_000 });
    await expect(page.locator('main')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Resumen|Inicio|Panel/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('login fallido muestra error de validación (contraseña corta)', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('[name=identifier]', { state: 'visible' });

    await page.fill('[name=identifier]', '9999');
    await page.fill('[name=password]', '123'); // Menos de 4 caracteres
    await page.click('button[type=submit]');

    // Validación del lado del cliente debe mostrar el error sin llamar al backend
    await expect(page.getByText(/contraseña.*4 caracteres|mínimo.*4|at least 4/i)).toBeVisible({
      timeout: 5_000,
    });
  });

  test('login fallido con credenciales incorrectas muestra error del servidor', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('[name=identifier]', { state: 'visible' });

    await page.fill('[name=identifier]', '99999999');
    await page.fill('[name=password]', randomBytes(18).toString('hex'));
    await page.click('button[type=submit]');

    // El backend debe responder con un error, el frontend debe mostrarlo
    await expect(
      page.getByText(/credenciales|incorrecto|inválido|no encontrado|invalid/i)
    ).toBeVisible({ timeout: 10_000 });
  });
});
