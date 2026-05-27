import { test, expect } from '@playwright/test';
import { loginAs, storageStatePath } from './helpers/auth';
import * as fs from 'fs';

/**
 * Tests del módulo Animales (CRUD).
 *
 * Usan loginAs() en beforeEach porque el módulo de animales requiere
 * autenticación y queremos verificar el flujo real de navegación.
 * Si el storageState está disponible, úsalo con test.use() para velocidad.
 */

// Usar el estado de auth guardado por globalSetup si existe
const adminAuthFile = storageStatePath('admin');
const useStorageState = fs.existsSync(adminAuthFile);

test.describe('Gestión de Animales (CRUD)', () => {
  // Si el storageState existe, usarlo — mucho más rápido que hacer login en cada test
  if (useStorageState) {
    test.use({ storageState: adminAuthFile });
  }

  test.beforeEach(async ({ page }) => {
    if (!useStorageState) {
      await loginAs(page, 'admin');
    }
    await page.goto('/admin/animals');
    // Esperar a que la página cargue datos reales (no solo el skeleton)
    await page.waitForLoadState('networkidle', { timeout: 15_000 });
  });

  test.describe.configure({ mode: 'serial' });

  test('debe cargar el listado de animales correctamente', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /animales/i }).first()
    ).toBeVisible({ timeout: 15_000 });

    // Verificar que hay un botón para crear
    await expect(
      page.getByRole('button', { name: /crear nuevo|nuevo/i }).first()
    ).toBeVisible();
  });

  test('debe permitir abrir el modal de creación y registrar un nuevo animal', async ({ page }) => {
    const uniqueRecord = `REC-E2E-${Date.now().toString().slice(-6)}`;

    // Abrir modal de creación
    const nuevoBtn = page
      .getByRole('button', { name: /crear nuevo registro|nuevo/i })
      .first();
    await nuevoBtn.click();

    // Esperar a que el modal esté visible
    await expect(page.getByText(/crear animal/i)).toBeVisible({ timeout: 10_000 });

    // Llenar formulario — esperar cada campo antes de escribir
    await page.waitForSelector('#record', { state: 'visible' });
    await page.fill('#record', uniqueRecord);
    await page.fill('#birth_date', '2025-01-01');
    await page.fill('#weight', '450');

    // Seleccionar opciones
    await page.selectOption('select[id="breed_id"]', { index: 1 });
    await page.selectOption('select[id="gender"]', { index: 1 });
    await page.selectOption('select[id="status"]', { index: 1 });

    // Enviar formulario
    await page.click('button[type=submit]');

    // Verificar éxito — esperar el mensaje de confirmación
    await expect(
      page.getByText(/creado correctamente|registrado|éxito|success/i)
    ).toBeVisible({ timeout: 15_000 });
  });

  test('debe permitir buscar animales en el listado', async ({ page }) => {
    const searchInput = page
      .getByRole('main')
      .getByPlaceholder(/buscar/i)
      .first();

    await searchInput.fill('REC');

    // Esperar el debounce del buscador
    await page.waitForTimeout(800);

    // La tabla debe seguir visible (puede estar vacía pero no debe romperse)
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 10_000 });
  });
});
