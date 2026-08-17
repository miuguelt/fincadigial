import { Page } from '@playwright/test';
import * as path from 'path';

/**
 * Credenciales de los usuarios E2E.
 * Se leen de variables de entorno para evitar hardcoding.
 * Definidas en .env.test en la raíz del proyecto.
 */
const CREDENTIALS = {
  admin: {
    identifier: process.env.E2E_ADMIN_ID || '10000001',
    password: getRequiredPassword('VILLALUZ_E2E_ADMIN_PASSWORD', 'E2E_ADMIN_PASS'),
    storageStateFile: path.resolve(__dirname, '../.auth/admin.json'),
  },
  operario: {
    identifier: process.env.E2E_OP_ID || '10000002',
    password: getRequiredPassword('VILLALUZ_E2E_WORKER_PASSWORD', 'E2E_OP_PASS'),
    storageStateFile: path.resolve(__dirname, '../.auth/operario.json'),
  },
} as const;

function getRequiredPassword(primaryName: string, legacyName: string): string {
  const value = process.env[primaryName] || process.env[legacyName];
  if (!value) {
    throw new Error(
      `Falta ${primaryName}. Inyecta la contraseña E2E desde el entorno; no existe un valor por defecto.`,
    );
  }
  return value;
}

export type E2ERole = keyof typeof CREDENTIALS;

/**
 * Hace login como el rol indicado.
 *
 * PREFERIR el uso de storageState en playwright.config.ts en lugar de
 * llamar a loginAs() en cada test. Esta función existe como fallback
 * cuando el storageState no esté disponible o haya expirado.
 */
export async function loginAs(page: Page, role: E2ERole = 'admin'): Promise<void> {
  const creds = CREDENTIALS[role];

  await page.goto('/login');

  // Esperar que el formulario esté visible antes de escribir
  await page.waitForSelector('[name=identifier]', { state: 'visible', timeout: 10_000 });

  await page.fill('[name=identifier]', creds.identifier);
  await page.fill('[name=password]', creds.password);
  await page.click('button[type=submit]');

  // Esperar la redirección al dashboard
  await page.waitForURL('**/dashboard', { timeout: 15_000 });
}

/**
 * Retorna la ruta al archivo de storageState para el rol indicado.
 * Úsala en test.use({ storageStatePath: storageStatePath('admin') })
 */
export function storageStatePath(role: E2ERole = 'admin'): string {
  return CREDENTIALS[role].storageStateFile;
}
