/* eslint-disable react-hooks/rules-of-hooks */
/**
 * Auth Fixture
 * ============
 * Proporciona usuarios autenticados para tests E2E.
 */

import { test as base, expect, type Page } from '@playwright/test';

// Usuarios de test
export const testUsers = {
  propietario: {
    identifier: '99999999',
    password: 'password123',
    role: 'Propietario',
  },
  admin: {
    identifier: '88888888',
    password: 'admin123',
    role: 'Administrador',
  },
  operario: {
    identifier: '77777777',
    password: 'operario123',
    role: 'Operario',
  },
  veterinario: {
    identifier: '66666666',
    password: 'vet123',
    role: 'Veterinario',
  },
};

// Tipo extendido con authenticatedPage
type TestFixtures = {
  authenticatedPage: Page;
  loginAs: (role: keyof typeof testUsers) => Promise<Page>;
};

// Fixture extendida
export const test = base.extend<TestFixtures>({
  // Página ya autenticada como propietario por defecto
  authenticatedPage: async ({ page }, use) => {
    const user = testUsers.propietario;

    // Ir a login
    await page.goto('/login');

    // Llenar formulario
    await page.fill('input[name="identifier"]', user.identifier);
    await page.fill('input[name="password"]', user.password);

    // Click en login
    await page.click('button[type="submit"]');

    // Esperar redirección a dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Verificar que estamos logueados
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

    await use(page);
  },

  // Helper para loguearse con cualquier rol
  loginAs: async ({ page }, use) => {
    const loginFn = async (role: keyof typeof testUsers) => {
      const user = testUsers[role];

      await page.goto('/login');
      await page.fill('input[name="identifier"]', user.identifier);
      await page.fill('input[name="password"]', user.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard', { timeout: 10000 });

      return page;
    };

    await use(loginFn);
  },
});

export { expect };
