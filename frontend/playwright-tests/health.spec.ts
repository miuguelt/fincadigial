import { test, expect } from '@playwright/test';

test('has title and loads login page', async ({ page }) => {
  // Ir a la raíz (usará el baseURL configurado, ej: http://localhost:3005)
  await page.goto('/');

  // Debería redirigir o cargar la página de inicio/login
  await expect(page).toHaveTitle(/Finca/i);

  // Verificar que hay algún elemento clave (por ejemplo, el texto de bienvenida o formulario)
  // Dependiendo de tu UI, podemos buscar un heading o texto general
  const body = page.locator('body');
  await expect(body).toBeVisible();
});
