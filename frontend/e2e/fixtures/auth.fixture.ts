/* eslint-disable react-hooks/rules-of-hooks */
/**
 * Auth Fixture
 * ============
 * Proporciona usuarios autenticados para pruebas E2E usando los perfiles
 * semilla locales y resolviendo la contraseña desde variables de entorno
 * o archivos .env locales (sin exponer secretos en el repositorio).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test as base, expect, type Page } from '@playwright/test';
import { resolveDevelopmentProfilePassword } from '../../src/shared/config/developmentProfilePassword';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, '../..');
const repoRoot = path.resolve(frontendRoot, '..');

function parseDotEnvFile(filePath: string): Record<string, string | undefined> {
  if (!fs.existsSync(filePath)) return {};
  const result: Record<string, string | undefined> = {};
  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIndex = line.indexOf('=');
    if (eqIndex <= 0) continue;
    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

const frontendEnv = parseDotEnvFile(path.join(frontendRoot, '.env'));
const backendEnv = parseDotEnvFile(path.join(repoRoot, 'backend', '.env'));
const defaultSeedPassword = resolveDevelopmentProfilePassword(
  frontendEnv,
  backendEnv,
  process.env as Record<string, string | undefined>,
);

const envOrSeed = (name: string) => {
  const explicit = (process.env[name] ?? '').trim();
  return explicit || defaultSeedPassword;
};

// Usuarios semilla canónicos del entorno de desarrollo
export const testUsers = {
  propietario: {
    identifier: process.env.E2E_OWNER_ID?.trim() || '55555555',
    password: envOrSeed('E2E_OWNER_PASS'),
    role: 'Propietario',
  },
  admin: {
    identifier: process.env.E2E_ADMIN_ID?.trim() || '1098',
    password: envOrSeed('E2E_ADMIN_PASS'),
    role: 'Administrador',
  },
  capataz: {
    identifier: process.env.E2E_FOREMAN_ID?.trim() || '66666666',
    password: envOrSeed('E2E_FOREMAN_PASS'),
    role: 'Capataz',
  },
  instructor: {
    identifier: process.env.E2E_INSTRUCTOR_ID?.trim() || '11111111',
    password: envOrSeed('E2E_INSTRUCTOR_PASS'),
    role: 'Instructor',
  },
  aprendiz: {
    identifier: process.env.E2E_APPRENTICE_ID?.trim() || '22222222',
    password: envOrSeed('E2E_APPRENTICE_PASS'),
    role: 'Aprendiz',
  },
  operario: {
    identifier: process.env.E2E_WORKER_ID?.trim() || '33333333',
    password: envOrSeed('E2E_WORKER_PASS'),
    role: 'Operario',
  },
  veterinario: {
    identifier: process.env.E2E_VET_ID?.trim() || '44444444',
    password: envOrSeed('E2E_VET_PASS'),
    role: 'Veterinario',
  },
};

export const hasResolvedSeedPassword = () => Boolean(defaultSeedPassword);

type TestFixtures = {
  authenticatedPage: Page;
  loginAs: (role: keyof typeof testUsers) => Promise<Page>;
};

export const test = base.extend<TestFixtures>({
  authenticatedPage: async ({ page }, use) => {
    const user = testUsers.propietario;

    await page.goto('/login');
    await page.fill('input[name="identifier"]', user.identifier);
    await page.fill('input[name="password"]', user.password);
    await page.click('button[type="submit"]');

    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20000 });
    await use(page);
  },

  loginAs: async ({ page }, use) => {
    const loginFn = async (role: keyof typeof testUsers) => {
      const user = testUsers[role];

      await page.goto('/login');
      await page.fill('input[name="identifier"]', user.identifier);
      await page.fill('input[name="password"]', user.password);
      await page.click('button[type="submit"]');
      await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20000 });

      return page;
    };

    await use(loginFn);
  },
});

export { expect };
