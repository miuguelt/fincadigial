import { test, expect } from '@playwright/test';
import { loginAs, storageStatePath } from './helpers/auth';
import * as fs from 'fs';

/**
 * Pruebas del módulo Sanidad: vistas de Casos clínicos y Tratamientos.
 *
 * Verifican que las dos páginas CRUD rendericen tras las mejoras de UI
 * (encabezado del módulo, filtros y tabla) y que los modales de creación
 * se abran y cierren sin errores. Si el storageState existe, se usa para
 * velocidad; si no, se hace login real.
 */

const adminAuthFile = storageStatePath('admin');
const useStorageState = fs.existsSync(adminAuthFile);

test.describe('Módulo Sanidad: Casos clínicos y Tratamientos (CRUD)', () => {
  if (useStorageState) {
    test.use({ storageState: adminAuthFile });
  }

  test.beforeEach(async ({ page }) => {
    if (!useStorageState) {
      await loginAs(page, 'admin');
    }
  });

  test.describe.configure({ mode: 'serial' });

  test('la vista de Casos clínicos carga sin errores y muestra filtros', async ({ page }) => {
    await page.goto('/admin/disease-animals');

    await expect(
      page.getByRole('heading', { name: /casos clínicos/i }).first()
    ).toBeVisible({ timeout: 20_000 });

    // Navegación del módulo y filtros de estado visibles (botones con píldora activa)
    await expect(
      page.getByRole('button', { name: /animales enfermos|enfermos/i }).first()
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /todos los registros/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /casos graves/i }).first()).toBeVisible();

    // Sin pantallazos de error en el cuerpo
    const bodyText = await page.innerText('body');
    expect(bodyText).not.toContain('ReferenceError');
    expect(bodyText).not.toContain('TypeError');
  });

  test('abre y cierra el modal de creación de un caso clínico', async ({ page }) => {
    await page.goto('/admin/disease-animals');

    const nuevoBtn = page.getByRole('button', { name: /nuevo|crear caso/i }).first();
    await nuevoBtn.click();

    await expect(page.getByText(/crear caso clínico/i).first()).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: /cancelar/i }).click();
    await expect(page.getByText(/crear caso clínico/i).first()).toBeHidden({ timeout: 10_000 });
  });

  test('la vista de Tratamientos carga y sus filtros rápidos funcionan', async ({ page }) => {
    await page.goto('/admin/treatments');

    await expect(
      page.getByRole('heading', { name: /tratamientos/i }).first()
    ).toBeVisible({ timeout: 20_000 });

    // Filtros rápidos del módulo
    await expect(page.getByText(/en retiro/i).first()).toBeVisible();
    await expect(page.getByText(/últ\.? 30 días|últimos 30 días/i).first()).toBeVisible();
    await expect(page.getByText(/con inversión/i).first()).toBeVisible();

    // La pestaña de Recomendaciones lleva a su propia vista (puede quedar
    // fuera del scroll horizontal de píldoras, así que se valida en DOM).
    await expect(
      page.locator('a:has-text("Recomendaciones")').first()
    ).toBeAttached({ timeout: 15_000 });

    // Cambiar filtro y confirmar que la tabla sigue viva
    await page.getByText(/en retiro/i).first().click();
    await expect(page.locator('table').first()).toBeVisible({ timeout: 15_000 });

    const bodyText = await page.innerText('body');
    expect(bodyText).not.toContain('ReferenceError');
    expect(bodyText).not.toContain('TypeError');
  });

  test('la vista de Recomendaciones carga y permite abrir su modal de creación', async ({ page }) => {
    await page.goto('/admin/treatment_recommendations');

    await expect(
      page.getByRole('heading', { name: /recomendaciones/i }).first()
    ).toBeVisible({ timeout: 20_000 });

    const nuevoBtn = page.getByRole('button', { name: /nuevo|crear recomendación/i }).first();
    await nuevoBtn.click();

    await expect(page.getByText(/crear recomendación/i).first()).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: /cancelar/i }).click();
    await expect(page.getByText(/crear recomendación/i).first()).toBeHidden({ timeout: 10_000 });
  });

  test('abre y cierra el modal de creación de un tratamiento', async ({ page }) => {
    await page.goto('/admin/treatments');

    const nuevoBtn = page.getByRole('button', { name: /nuevo|crear tratamiento/i }).first();
    await nuevoBtn.click();

    await expect(page.getByText(/crear tratamiento/i).first()).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: /cancelar/i }).click();
    await expect(page.getByText(/crear tratamiento/i).first()).toBeHidden({ timeout: 10_000 });
  });
});
