import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:3005',
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: [
    { 
      command: 'npm run dev:e2e --prefix frontend', 
      port: 3005, 
      env: { VITE_PROXY_TARGET: 'http://127.0.0.1:5000', VITE_DISABLE_HTTPS: 'true' },
      reuseExistingServer: true,
      timeout: 120 * 1000
    },
    { 
      command: 'flask run --port 5000', 
      cwd: './backend',
      port: 5000,
      env: { 
        FLASK_APP: 'run.py', 
        FLASK_ENV: 'testing', 
        FLASK_CONFIG: 'testing', 
        DATABASE_URL: 'sqlite:///test.db',
        TEST_SQLALCHEMY_DATABASE_URI: 'sqlite:///test.db'
      },
      reuseExistingServer: true,
      timeout: 120 * 1000
    }
  ]
});
