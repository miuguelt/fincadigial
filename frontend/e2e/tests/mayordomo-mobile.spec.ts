import { test, expect, testUsers } from '../fixtures/auth.fixture';

test.use({ viewport: { width: 390, height: 844 } });

function getTodayColombiaString(): string {
  const now = new Date();
  const colombia = new Date(now.toLocaleString('en-US', { timeZone: 'America/Bogota' }));
  const y = colombia.getFullYear();
  const m = String(colombia.getMonth() + 1).padStart(2, '0');
  const d = String(colombia.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

test.describe('Flujo móvil del mayordomo y roles de finca (390x844)', () => {
  test('1. carga login móvil sin desbordamiento horizontal y valida campos obligatorios', async ({
    page,
  }) => {
    await page.goto('/login');
    await expect(page.locator('input[name="identifier"]')).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow).toBe(false);

    await page.click('button[type="submit"]');
    await expect(page.locator('#documento-error')).toBeVisible();
    await expect(page.locator('#password-error')).toBeVisible();
  });

  test('2. operario abre Acción, registra ordeño y consulta inventario con etiquetas de vista', async ({
    loginAs,
  }) => {
    test.skip(
      !testUsers.operario.password,
      'Pendiente: definir contraseña semilla local o E2E_WORKER_PASS',
    );

    const page = await loginAs('operario');
    const today = getTodayColombiaString();

    // Verificar acciones rápidas en OperarioDashboard filtradas por RBAC
    await expect(page.getByRole('button', { name: /registrar ordeño/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /registrar control o pesaje/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /trasladar animal/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /registrar enfermedad/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /registrar tratamiento/i })).toHaveCount(0);

    // 1. Abrir «Acción» en la barra inferior y validar que solo muestra acciones permitidas
    const actionBtn = page.getByRole('button', { name: /acciones rápidas de la finca/i });
    await expect(actionBtn).toBeVisible();
    await actionBtn.click();

    await expect(page.getByText('Leche', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Peso', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Traslado', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Salud', { exact: true })).toHaveCount(0);

    // 2. Abrir modal rápido de ordeño, verificar tope de fecha y cerrar
    await page.getByRole('button', { name: /leche/i }).first().click();
    await expect(page.getByRole('heading', { name: /registrar leche/i })).toBeVisible();
    await expect(page.locator('input[type="date"]').first()).toHaveAttribute('max', today);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: /registrar leche/i })).toHaveCount(0);

    // 3. Abrir inventario de ganado y verificar etiquetas de vista en móvil
    await page.getByRole('button', { name: /ir a ganado/i }).click();
    await page.waitForURL('**/operario/animals**');
    await expect(page.getByRole('button', { name: /vista en tabla/i })).toContainText('Tabla');
    await expect(page.getByRole('button', { name: /vista en tarjetas/i })).toContainText('Tarjetas');
    await expect(page.getByRole('button', { name: /vista potreros/i })).toContainText('Potreros');
  });

  test('3. operario usa Ganadería Operativa y Cuaderno de Labores con filtros RBAC y fechas Colombia', async ({
    loginAs,
  }) => {
    test.skip(
      !testUsers.operario.password,
      'Pendiente: definir contraseña semilla local o E2E_WORKER_PASS',
    );

    const page = await loginAs('operario');
    const today = getTodayColombiaString();

    await page.goto('/campesino/ganaderia');
    await expect(page.getByRole('button', { name: /registrar ordeño.*anota litros/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /mover ganado/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /avisar un animal enfermo/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /registrar tratamiento/i })).toHaveCount(0);

    // Abrir modal de ordeño en Ganadería Operativa y verificar límites de litros y fecha
    await page.getByRole('button', { name: /registrar ordeño.*anota litros/i }).click();
    await expect(page.locator('#milk-liters')).toHaveAttribute('min', '0.1');
    await expect(page.locator('#milk-date')).toHaveAttribute('max', today);
    await page.keyboard.press('Escape');

    // Cuaderno de Labores para Operario: etiquetas visibles, sin botón de crear plantillas
    await page.goto('/operario/tasks');
    await expect(page.getByRole('button', { name: /cuaderno/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /tabla/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /plantillas de faena/i })).toHaveCount(0);
  });

  test('4. aprendiz consulta Cuaderno de Labores en modo solo lectura sin botones de mutación', async ({
    loginAs,
  }) => {
    test.skip(
      !testUsers.aprendiz.password,
      'Pendiente: definir contraseña semilla local o E2E_APPRENTICE_PASS',
    );

    const page = await loginAs('aprendiz');

    await page.goto('/apprentice/tasks');
    await expect(page.getByRole('button', { name: /cuaderno/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /tabla/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /plantillas de faena/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^iniciar faena$/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^¡completar!$/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^cumplir$/i })).toHaveCount(0);
  });

  test('5. administrador ejecuta flujos móviles de parto asistido, finanzas, tareas, fincas y alertas', async ({
    loginAs,
  }) => {
    test.skip(
      !testUsers.admin.password,
      'Pendiente: definir contraseña semilla local o E2E_ADMIN_PASS',
    );

    const page = await loginAs('admin');
    const today = getTodayColombiaString();

    // 1. Enlace directo de Parto (?calving=1) abre modal de parto asistido
    await page.goto('/admin/reproduction?calving=1');
    await expect(page.getByText(/asistente de parto|registrar parto/i).first()).toBeVisible({
      timeout: 15000,
    });

    // 2. Finanzas: Nuevo movimiento con scroll móvil, botón cerrar de 44 px y fecha Colombia
    await page.goto('/admin/financial');
    const newTxBtn = page.getByRole('button', { name: /nuevo movimiento/i });
    await expect(newTxBtn).toBeVisible();
    await newTxBtn.click();

    const financeDialog = page.getByRole('dialog');
    await expect(financeDialog).toBeVisible();
    await expect(financeDialog).toHaveClass(/max-h-\[90dvh\]/);
    await expect(page.locator('#fecha-movimiento')).toHaveAttribute('max', today);
    await expect(page.locator('#monto-movimiento')).toHaveAttribute('min', '1');
    await page.getByRole('button', { name: /cerrar/i }).click();

    // 3. Tareas: Administrador sí ve Plantillas de Faena y etiquetas móviles
    await page.goto('/admin/tasks');
    await expect(page.getByRole('button', { name: /plantillas de faena/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /cuaderno/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /tabla/i })).toBeVisible();

    // 4. Fincas y Alertas: etiquetas móviles visibles y botones táctiles
    await page.goto('/admin/fincas');
    await expect(page.getByRole('button', { name: /tarjetas/i })).toContainText('Tarjetas');
    await expect(page.getByRole('button', { name: /tabla/i })).toContainText('Tabla');

    await page.goto('/admin/alerts');
    const evalBtn = page.getByRole('button', { name: /evaluar ahora/i });
    await expect(evalBtn).toBeVisible();
    await expect(evalBtn).toHaveClass(/min-h-\[44px\]/);
  });

  test('6. veterinario o administrador valida días de retiro e inocuidad en QuickTreatment y fechas en QuickTransfer', async ({
    loginAs,
  }) => {
    test.skip(
      !testUsers.admin.password,
      'Pendiente: definir contraseña semilla local o E2E_ADMIN_PASS',
    );

    const page = await loginAs('admin');
    const today = getTodayColombiaString();

    // 1. Abrir QuickTreatment y verificar selector de días de retiro con alerta de inocuidad
    await page.goto('/dashboard?quick=treatment');
    await expect(page.getByRole('heading', { name: /registrar tratamiento/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/días de retiro de leche \/ carne/i)).toBeVisible();

    // Presionar preset de 5 días
    await page.getByRole('button', { name: /^5 días$/i }).click();
    await expect(page.getByText(/retiro sanitario activo/i)).toBeVisible();
    await expect(page.getByText(/por normativa del ica y seguridad alimentaria/i)).toBeVisible();

    // Comprobar que la fecha de aplicación tiene tope de hoy
    await expect(page.locator('#date')).toHaveAttribute('max', today);

    // Cerrar modal
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: /registrar tratamiento/i })).toHaveCount(0);

    // 2. Abrir QuickTransfer y verificar fecha tope con getTodayColombia
    await page.goto('/dashboard?quick=transfer');
    await expect(page.getByRole('heading', { name: /trasladar a potrero/i })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#date')).toHaveAttribute('max', today);

    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: /trasladar a potrero/i })).toHaveCount(0);
  });

  test('7. resiliencia offline: indicador muestra estado sin conexión sobre MobileBottomNav y restaura conectividad', async ({
    loginAs,
  }) => {
    test.skip(
      !testUsers.admin.password,
      'Pendiente: definir contraseña semilla local o E2E_ADMIN_PASS',
    );

    const page = await loginAs('admin');
    await page.goto('/dashboard');
    await expect(page.getByRole('banner')).toBeVisible({ timeout: 15000 });

    // Simular corte de conectividad en campo
    await page.context().setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));

    // Debe emerger el OnlineStatusIndicator con elevación táctil superior a MobileBottomNav (z-[1045])
    const offlineIndicator = page.getByRole('button', { name: 'Sin conexión' });
    await expect(offlineIndicator).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Trabajando sin conexión')).toBeVisible();

    // Restaurar conectividad
    await page.context().setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));

    // El indicador debe sincronizarse y ocultarse tras volver en línea sin pendientes
    await expect(offlineIndicator).toHaveCount(0, { timeout: 8000 });
  });
});
