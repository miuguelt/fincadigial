/**
 * Dashboard Page Object
 * =====================
 * Encapsula las interacciones con el dashboard.
 */

import type { Page, Locator } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly userMenu: Locator;
  readonly fincaSelector: Locator;
  readonly statsCards: Locator;
  readonly animalsLink: Locator;
  readonly analyticsLink: Locator;
  readonly notificationsBell: Locator;

  constructor(page: Page) {
    this.page = page;
    this.userMenu = page.locator('[data-testid="user-menu"]');
    this.fincaSelector = page.locator('[data-testid="finca-selector"]');
    this.statsCards = page.locator('[data-testid="stat-card"]');
    this.animalsLink = page.locator('a[href="/animals"]');
    this.analyticsLink = page.locator('a[href="/analytics"]');
    this.notificationsBell = page.locator('[data-testid="notifications-bell"]');
  }

  async expectLoaded() {
    await this.userMenu.waitFor({ state: 'visible', timeout: 10000 });
  }

  async expectStatsVisible() {
    await this.statsCards.first().waitFor({ state: 'visible', timeout: 5000 });
  }

  async clickFincaSelector() {
    await this.fincaSelector.click();
  }

  async selectFinca(fincaName: string) {
    await this.clickFincaSelector();
    await this.page.locator(`text=${fincaName}`).click();
  }

  async navigateToAnimals() {
    await this.animalsLink.click();
    await this.page.waitForURL('**/animals');
  }

  async navigateToAnalytics() {
    await this.analyticsLink.click();
    await this.page.waitForURL('**/analytics');
  }

  async logout() {
    await this.userMenu.click();
    await this.page.locator('text=Cerrar sesión').click();
    await this.page.waitForURL('**/login');
  }
}
