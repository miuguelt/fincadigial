import { test, expect } from '@playwright/test';

const E2E_ADMIN_ID = process.env.E2E_ADMIN_ID;
const E2E_ADMIN_PASS = process.env.E2E_ADMIN_PASS;

if (!E2E_ADMIN_ID || !E2E_ADMIN_PASS) {
  throw new Error('Define E2E_ADMIN_ID y E2E_ADMIN_PASS para ejecutar las pruebas Playwright.');
}

test.describe('Villa Luz Critical CRUD & Stability', () => {
  test.beforeEach(async ({ page }) => {
    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`BROWSER CONSOLE ERROR: "${msg.text()}"`);
      }
    });

    // Login flow
    await page.goto('/login', { timeout: 60000 });
    await page.fill('#documento', E2E_ADMIN_ID);
    await page.fill('#password', E2E_ADMIN_PASS);
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard with extended timeout
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 60000 });
  });

  test('Animal Management renders without ReferenceErrors', async ({ page }) => {
    // Navigate to Animals
    await page.goto('/admin/animals');

    // Check if the page title renders
    await expect(page.getByRole('heading', { name: /Animales/i }).first()).toBeVisible();

    // Verify that at least some items are listed or the "No items" message is shown
    // but NO crash overlay or console errors.
    const bodyText = await page.innerText('body');
    expect(bodyText).not.toContain('ReferenceError');
    expect(bodyText).not.toContain('TypeError');

    // Test opening an animal modal (if exists)
    const animalCard = page.locator('[data-testid="animal-card"]').first();
    if (await animalCard.isVisible()) {
      await animalCard.click();
      // Check if modal content renders
      await expect(page.locator('[data-testid="animal-modal-title"]')).toBeVisible();

      // Check if QR/NFC widget is present (New Feature validation)
      await expect(page.locator('text=Identificación Animal')).toBeVisible();
    }
  });

  test('Sidebar navigation works', async ({ page }) => {
    await page.click('text=Operación');
    await page.click('text=Potreros');
    await expect(page).toHaveURL(/.*fields/);
  });
});
