/**
 * Login Page Object
 * =================
 * Encapsula las interacciones con la página de login.
 */

import type { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly identifierInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly loadingIndicator: Locator;

  constructor(page: Page) {
    this.page = page;
    this.identifierInput = page.locator('input[name="identifier"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.errorMessage = page.locator('[data-testid="login-error"]');
    this.loadingIndicator = page.locator('[data-testid="login-loading"]');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(identifier: string, password: string) {
    await this.identifierInput.fill(identifier);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectLoginSuccess() {
    await this.page.waitForURL('**/dashboard', { timeout: 10000 });
  }

  async expectLoginError() {
    await this.errorMessage.waitFor({ state: 'visible', timeout: 5000 });
  }

  async expectLoadingState() {
    await this.loadingIndicator.waitFor({ state: 'visible', timeout: 5000 });
  }
}
