/**
 * Auth Tests
 * ==========
 * Tests E2E para flujos de autenticación.
 */

import { test, expect } from '../fixtures/auth.fixture';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';

test.describe('Autenticación', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('debería mostrar la página de login', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Verificar elementos visibles
    await expect(loginPage.identifierInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
    await expect(page.locator('h1')).toContainText('Iniciar sesión');
  });

  test('debería iniciar sesión con credenciales válidas', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    // Login
    await loginPage.login('99999999', 'password123');

    // Verificar redirección
    await loginPage.expectLoginSuccess();

    // Verificar que estamos en el dashboard
    await dashboardPage.expectLoaded();
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('debería mostrar error con credenciales inválidas', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Login con credenciales incorrectas
    await loginPage.login('99999999', 'password_incorrecta');

    // Verificar mensaje de error
    await loginPage.expectLoginError();
    await expect(page.locator('text=Error')).toBeVisible();
  });

  test('debería mostrar error con campos vacíos', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Click en submit sin llenar campos
    await loginPage.submitButton.click();

    // Verificar validación HTML5 o mensaje de error
    await expect(loginPage.identifierInput).toHaveAttribute('required', '');
  });

  test('debería cerrar sesión correctamente', async ({ authenticatedPage }) => {
    const dashboardPage = new DashboardPage(authenticatedPage);
    const loginPage = new LoginPage(authenticatedPage);

    // Logout
    await dashboardPage.logout();

    // Verificar redirección a login
    await expect(authenticatedPage).toHaveURL(/.*login/);
    await expect(loginPage.identifierInput).toBeVisible();
  });

  test('debería redirigir a login si no está autenticado', async ({ page }) => {
    // Intentar acceder a página protegida
    await page.goto('/dashboard');

    // Debería redirigir a login
    await expect(page).toHaveURL(/.*login/);
  });

  test('debería mantener sesión después de refresh', async ({ authenticatedPage }) => {
    // Refrescar página
    await authenticatedPage.reload();

    // Debería seguir autenticado
    const dashboardPage = new DashboardPage(authenticatedPage);
    await dashboardPage.expectLoaded();
  });
});
