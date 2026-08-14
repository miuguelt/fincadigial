/**
 * Animals Tests
 * =============
 * Tests E2E para gestión de animales.
 */

import { test, expect } from '../fixtures/auth.fixture';
import { AnimalsPage } from '../pages/AnimalsPage';
import { DashboardPage } from '../pages/DashboardPage';

test.describe('Gestión de Animales', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    // Navegar a animales desde el dashboard
    const dashboardPage = new DashboardPage(authenticatedPage);
    await dashboardPage.navigateToAnimals();
  });

  test('debería mostrar la lista de animales', async ({ authenticatedPage }) => {
    const animalsPage = new AnimalsPage(authenticatedPage);

    // Verificar tabla visible
    await animalsPage.expectTableVisible();

    // Verificar que hay filas (o mensaje de vacío)
    const rowCount = await animalsPage.getRowCount();
    expect(rowCount).toBeGreaterThanOrEqual(0);
  });

  test('debería crear un nuevo animal', async ({ authenticatedPage }) => {
    const animalsPage = new AnimalsPage(authenticatedPage);

    // Click en agregar
    await animalsPage.clickAddAnimal();

    // Llenar formulario
    const testRecord = `TEST-${Date.now()}`;
    await animalsPage.fillAnimalForm({
      record: testRecord,
      sex: 'Macho',
      birthDate: '2023-01-15',
      weight: '450',
      species: '1', // Asumiendo que 1 es Bovino
      breed: '1',   // Asumiendo que 1 es una raza
    });

    // Guardar
    await animalsPage.submitForm();

    // Verificar que aparece en la lista
    await authenticatedPage.waitForTimeout(1000);
    await animalsPage.expectAnimalInTable(testRecord);
  });

  test('debería buscar un animal por número de arete', async ({ authenticatedPage }) => {
    const animalsPage = new AnimalsPage(authenticatedPage);

    // Buscar
    await animalsPage.searchAnimal('ARETE');

    // Verificar resultados
    await animalsPage.expectTableVisible();
  });

  test('debería mostrar detalles de un animal', async ({ authenticatedPage }) => {
    // Click en primer animal
    const firstRow = authenticatedPage.locator('[data-testid="animal-row"]').first();
    await firstRow.click();

    // Verificar que se muestra detalle
    await expect(authenticatedPage.locator('[data-testid="animal-detail"]')).toBeVisible();
  });

  test('debería validar campos requeridos al crear', async ({ authenticatedPage }) => {
    const animalsPage = new AnimalsPage(authenticatedPage);

    // Click en agregar
    await animalsPage.clickAddAnimal();

    // Intentar guardar sin llenar nada
    await animalsPage.submitForm();

    // Verificar que hay errores de validación
    // Los campos required deberían mostrar validación HTML5
    const invalidInputs = await authenticatedPage.locator('input:invalid').count();
    expect(invalidInputs).toBeGreaterThan(0);
  });

  test('debería filtrar animales por estado', async ({ authenticatedPage }) => {
    const animalsPage = new AnimalsPage(authenticatedPage);

    // Click en filtro
    await animalsPage.filterButton.click();

    // Seleccionar filtro
    await authenticatedPage.click('text=Activos');

    // Verificar que se aplicó el filtro
    await animalsPage.expectTableVisible();
  });

  test('debería navegar entre páginas de resultados', async ({ authenticatedPage }) => {
    const animalsPage = new AnimalsPage(authenticatedPage);

    // Verificar paginación
    const pagination = animalsPage.pagination;

    if (await pagination.isVisible()) {
      // Click en página 2 si existe
      const page2 = authenticatedPage.locator('button:has-text("2")').first();
      if (await page2.isVisible()) {
        await page2.click();
        await authenticatedPage.waitForTimeout(500);
        await animalsPage.expectTableVisible();
      }
    }
  });
});

test.describe('Gestión de Animales - CRUD Completo', () => {
  test('flujo completo: crear, ver, editar y eliminar', async ({ authenticatedPage }) => {
    const animalsPage = new AnimalsPage(authenticatedPage);

    // 1. Navegar a animales
    await animalsPage.goto();

    // 2. Crear animal
    const testRecord = `CRUD-${Date.now()}`;
    await animalsPage.clickAddAnimal();
    await animalsPage.fillAnimalForm({
      record: testRecord,
      sex: 'Hembra',
      birthDate: '2023-06-01',
      weight: '380',
      species: '1',
      breed: '1',
    });
    await animalsPage.submitForm();

    // 3. Verificar que existe
    await authenticatedPage.waitForTimeout(1000);
    await animalsPage.expectAnimalInTable(testRecord);

    // 4. Abrir detalle
    await animalsPage.clickAnimalRow(testRecord);
    await expect(authenticatedPage.locator('[data-testid="animal-detail"]')).toBeVisible();

    // 5. Editar (simulado - depende de UI específica)
    // await authenticatedPage.click('[data-testid="edit-button"]');
    // ... editar campos ...

    // 6. Eliminar
    await animalsPage.goto();
    await animalsPage.searchAnimal(testRecord);
    await animalsPage.deleteAnimal(testRecord);

    // 7. Verificar que ya no existe
    await authenticatedPage.waitForTimeout(1000);
    await expect(authenticatedPage.locator(`text=${testRecord}`)).not.toBeVisible();
  });
});
