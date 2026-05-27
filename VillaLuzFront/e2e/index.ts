/**
 * E2E Testing Suite
 * =================
 * Suite completa de tests E2E con Playwright.
 *
 * Estructura:
 *   fixtures/     - Fixtures de Playwright
 *   pages/        - Page Objects
 *   tests/        - Tests E2E
 *
 * Uso:
 *   npm run test:e2e
 *   npm run test:e2e:ui    # UI Mode
 *   npm run test:e2e:debug # Debug Mode
 */

// Fixtures
export { test, expect, testUsers } from './fixtures/auth.fixture';

// Page Objects
export { LoginPage } from './pages/LoginPage';
export { DashboardPage } from './pages/DashboardPage';
export { AnimalsPage } from './pages/AnimalsPage';
