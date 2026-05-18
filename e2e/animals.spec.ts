import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

test.describe('Gestión de Animales (CRUD)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin/animals');
    await page.waitForLoadState('domcontentloaded');
  });

  test.describe.configure({ mode: 'serial' });

  test('debe cargar el listado de animales correctamente', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Animales', exact: true }).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Villa Luz').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Crear nuevo registro' }).or(page.getByText('Nuevo', { exact: true })).first()).toBeVisible();
  });

  test('debe permitir abrir el modal de creación y registrar un nuevo animal', async ({ page }) => {
    const uniqueRecord = `REC-${Date.now().toString().slice(-4)}`;

    // Abrir modal de creación
    const nuevoBtn = page.getByRole('button', { name: 'Crear nuevo registro' }).or(page.getByText('Nuevo', { exact: true })).first();
    await nuevoBtn.click();

    // Esperar a que el modal esté visible
    await expect(page.getByText('Crear Animal')).toBeVisible();

    // Llenar formulario
    await page.fill('#record', uniqueRecord);
    await page.fill('#birth_date', '2025-01-01');
    await page.fill('#weight', '450');

    // Seleccionar Raza
    await page.selectOption('select[id="breed_id"]', { label: 'Angus' });

    // Seleccionar opciones en los selects nativos
    await page.selectOption('select[id="gender"]', { index: 1 });
    await page.selectOption('select[id="status"]', { index: 1 });

    // Enviar formulario
    await page.click('button[type=submit]');

    // Esperar a que el modal se cierre o aparezca el mensaje de éxito
    await expect(page.getByText('creado correctamente')).toBeVisible({ timeout: 10000 });
  });

  test('debe permitir buscar un animal en el listado', async ({ page }) => {
    const searchInput = page.getByRole('main').getByPlaceholder(/Buscar/i).first();
    await searchInput.fill('REC');
    await page.waitForTimeout(1000); // Esperar debounce

    const table = page.locator('table');
    await expect(table).toBeVisible();
  });
});
