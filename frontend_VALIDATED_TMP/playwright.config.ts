import { defineConfig, devices } from '@playwright/test';

// Usar el servidor existente en puerto 3000
const port = 3000;
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: 'playwright-tests',
  timeout: 120 * 1000, // Aumentar timeout global a 120s
  expect: {
    timeout: 30 * 1000, // Aumentar timeout de expect a 30s
  },
  use: {
    baseURL,
    trace: 'on-first-retry',
    ignoreHTTPSErrors: true, // Ignorar errores de HTTPS para localhost
    // Limpiar cookies y localStorage antes de cada test
    contextOptions: {
      storageState: undefined, // No usar estado persistente
    },
  },
  // No iniciar webServer, usar el existente
  webServer: undefined,
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
