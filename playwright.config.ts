import { defineConfig, devices } from '@playwright/test';
import { randomBytes } from 'node:crypto';

const E2E_JWT_SECRET = process.env.E2E_JWT_SECRET || randomBytes(32).toString('hex');

/**
 * playwright.config.ts
 *
 * Documentación: https://playwright.dev/docs/test-configuration
 *
 * ESTRATEGIA DE TESTING E2E:
 * - globalSetup crea los usuarios de test y guarda el estado de auth en disco.
 * - Los tests usan storageState para evitar hacer login en cada test.
 * - El backend corre con SQLite :memory: (instancia fresca) para CI reproducible.
 * - reuseExistingServer=true permite usar el servidor de dev en desarrollo local.
 */
export default defineConfig({
  testDir: './e2e',

  // Playwright resuelve y compila el TS de globalSetup automáticamente
  globalSetup: './e2e/global-setup.ts',

  // Configuración global compartida por todos los tests
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3005',
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    // Timeout para cada acción (click, fill, etc.)
    actionTimeout: 10_000,
    // Timeout para navegación
    navigationTimeout: 30_000,
  },

  // Timeout global por test
  timeout: 60_000,

  // Número de reintentos en CI
  retries: process.env.CI ? 2 : 0,

  // Reporters
  reporter: [
    ['html', { outputFolder: 'test-results/playwright', open: 'never' }],
    ['list'],
    ['json', { outputFile: 'test-results/playwright/results.json' }],
  ],

  // Servidores a arrancar antes de correr los tests
  webServer: [
    {
      // Frontend Vite en modo E2E (sin HTTPS, con proxy al backend de test)
      command: 'npm run dev:e2e --prefix frontend',
      port: 3005,
      env: {
        VITE_PROXY_TARGET: process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:5000',
        VITE_DISABLE_HTTPS: 'true',
      },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      // Backend Flask con SQLite :memory: para tests reproducibles
      command: 'python -m flask run --port 5000',
      cwd: './backend',
      port: 5000,
      env: {
        FLASK_APP: 'run.py',
        FLASK_ENV: 'testing',
        FLASK_CONFIG: 'testing',
        // SQLite :memory: en CI; sqlite file local para desarrollo (persiste entre runs)
        TEST_SQLALCHEMY_DATABASE_URI: process.env.CI
          ? 'sqlite:///:memory:'
          : 'sqlite:///./instance/e2e_test.db',
        // Secret efímero para testing; se puede sobreescribir desde el entorno.
        JWT_SECRET_KEY: E2E_JWT_SECRET,
        // Deshabilitar Redis en tests (usar cache simple)
        REDIS_URL: '',
        CACHE_TYPE: 'simple',
        // Permitir registros públicos en testing
        PUBLIC_USER_CREATION_ENABLED: 'true',
      },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],

  // Proyectos — por defecto solo Chromium, añade más según necesites
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Estado de auth del admin guardado por globalSetup
        // Los tests que lo necesiten lo aplican con test.use()
      },
    },
    // Descomenta para correr en más browsers:
    // { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    // { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
