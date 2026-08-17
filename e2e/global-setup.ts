import { chromium, FullConfig } from '@playwright/test';

/**
 * global-setup.ts — Se ejecuta UNA VEZ antes de todos los tests de Playwright.
 *
 * Responsabilidades:
 *  1. Esperar a que el backend esté listo (health check).
 *  2. Crear los usuarios de test vía API REST (si no existen).
 *  3. Guardar el estado de autenticación en disco para reutilizarlo
 *     en todos los tests sin tener que hacer login en cada uno.
 *
 * Las credenciales se leen de variables de entorno para no hardcodear nada:
 *   E2E_ADMIN_ID, E2E_ADMIN_PASS, E2E_OP_ID, E2E_OP_PASS
 */

const BACKEND_URL = process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:5000';
const FRONTEND_URL = process.env.E2E_BASE_URL || 'http://localhost:3005';

interface E2EUser {
  identifier: string;
  password: string;
  storageStateFile: string;
}

function getRequiredPassword(primaryName: string, legacyName: string): string {
  const value = process.env[primaryName] || process.env[legacyName];
  if (!value) {
    throw new Error(
      `[E2E Setup] Falta ${primaryName}. Inyecta la contraseña desde el entorno; no existe un valor por defecto.`,
    );
  }
  return value;
}

const E2E_USERS: E2EUser[] = [
  {
    identifier: process.env.E2E_ADMIN_ID || '10000001',
    password: getRequiredPassword('VILLALUZ_E2E_ADMIN_PASSWORD', 'E2E_ADMIN_PASS'),
    storageStateFile: 'e2e/.auth/admin.json',
  },
  {
    identifier: process.env.E2E_OP_ID || '10000002',
    password: getRequiredPassword('VILLALUZ_E2E_WORKER_PASSWORD', 'E2E_OP_PASS'),
    storageStateFile: 'e2e/.auth/operario.json',
  },
];

/**
 * Espera hasta que el backend responda en /api/v1/health.
 * Reintenta hasta 30 veces con 2 segundos entre intentos.
 */
async function waitForBackend(maxAttempts = 30): Promise<void> {
  const url = `${BACKEND_URL}/api/v1/health`;
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        console.log(`[E2E Setup] Backend listo en intento ${i}`);
        return;
      }
    } catch {
      // Backend aún no disponible
    }
    console.log(`[E2E Setup] Esperando backend... (${i}/${maxAttempts})`);
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error(`[E2E Setup] Backend no respondió después de ${maxAttempts * 2}s`);
}

/**
 * Registra un usuario de test vía API REST si no existe.
 * Usa el endpoint de registro público del backend.
 */
async function ensureUserExists(user: E2EUser): Promise<void> {
  // 1. Intentar login — si funciona el usuario ya existe
  const loginRes = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: user.identifier, password: user.password }),
  });

  if (loginRes.ok) {
    console.log(`[E2E Setup] Usuario ${user.identifier} ya existe ✓`);
    return;
  }

  // 2. Si no existe, registrarlo
  const isAdmin = user.identifier === E2E_USERS[0].identifier;
  const registerRes = await fetch(`${BACKEND_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identification: parseInt(user.identifier),
      fullname: isAdmin ? 'Admin E2E Test' : 'Operario E2E Test',
      email: `e2e_${user.identifier}@test.villaluz`,
      phone: `300${user.identifier.slice(-7)}`,
      password: user.password,
      role: isAdmin ? 'Administrador' : 'Operario',
    }),
  });

  if (!registerRes.ok) {
    const body = await registerRes.text();
    console.warn(
      `[E2E Setup] No se pudo registrar usuario ${user.identifier}: ${registerRes.status} ${body}`
    );
    // No lanzar error — algunos endpoints de registro requieren aprobación
    // El test fallará con un mensaje claro si las credenciales son inválidas
  } else {
    console.log(`[E2E Setup] Usuario ${user.identifier} registrado ✓`);
  }
}

/**
 * Hace login con el browser y guarda el storageState (cookies + localStorage)
 * en disco para reutilizarlo en los tests sin repetir el flujo de login.
 */
async function saveAuthState(user: E2EUser): Promise<void> {
  // Crear directorio si no existe
  const { mkdirSync } = await import('fs');
  mkdirSync('e2e/.auth', { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto(`${FRONTEND_URL}/login`);
    await page.fill('[name=identifier]', user.identifier);
    await page.fill('[name=password]', user.password);
    await page.click('button[type=submit]');

    // Esperar la redirección al dashboard
    await page.waitForURL('**/dashboard', { timeout: 15_000 });

    // Guardar el estado de auth (cookies + localStorage)
    await page.context().storageState({ path: user.storageStateFile });
    console.log(`[E2E Setup] Estado de auth guardado: ${user.storageStateFile} ✓`);
  } catch (err) {
    console.warn(
      `[E2E Setup] No se pudo guardar auth state para ${user.identifier}: ${err}`
    );
    // Guardar un estado vacío para que los tests fallen con un mensaje claro
    // en lugar de fallar en el setup con un error críptico
    const { writeFileSync } = await import('fs');
    writeFileSync(user.storageStateFile, JSON.stringify({ cookies: [], origins: [] }));
  } finally {
    await browser.close();
  }
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  console.log('\n[E2E Setup] Iniciando configuración global de tests E2E...');

  // 1. Esperar backend
  await waitForBackend();

  // 2. Crear usuarios si no existen
  for (const user of E2E_USERS) {
    await ensureUserExists(user);
  }

  // 3. Guardar estados de auth para reutilizar en tests
  for (const user of E2E_USERS) {
    await saveAuthState(user);
  }

  console.log('[E2E Setup] Configuración global completada ✓\n');
}
