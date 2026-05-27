/**
 * Animals Page Object
 * ===================
 * Encapsula las interacciones con la página de animales.
 */

import type { Page, Locator } from '@playwright/test';

export class AnimalsPage {
  readonly page: Page;
  readonly addButton: Locator;
  readonly searchInput: Locator;
  readonly table: Locator;
  readonly tableRows: Locator;
  readonly filterButton: Locator;
  readonly exportButton: Locator;
  readonly pagination: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addButton = page.locator('[data-testid="add-animal-button"]');
    this.searchInput = page.locator('input[placeholder*="buscar" i]');
    this.table = page.locator('[data-testid="animals-table"]');
    this.tableRows = page.locator('[data-testid="animal-row"]');
    this.filterButton = page.locator('[data-testid="filter-button"]');
    this.exportButton = page.locator('[data-testid="export-button"]');
    this.pagination = page.locator('[data-testid="pagination"]');
  }

  async goto() {
    await this.page.goto('/animals');
  }

  async clickAddAnimal() {
    await this.addButton.click();
  }

  async fillAnimalForm(data: {
    record?: string;
    sex?: string;
    birthDate?: string;
    weight?: string;
    species?: string;
    breed?: string;
  }) {
    if (data.record) {
      await this.page.fill('input[name="record"]', data.record);
    }
    if (data.sex) {
      await this.page.selectOption('select[name="sex"]', data.sex);
    }
    if (data.birthDate) {
      await this.page.fill('input[name="birth_date"]', data.birthDate);
    }
    if (data.weight) {
      await this.page.fill('input[name="weight"]', data.weight);
    }
    if (data.species) {
      await this.page.selectOption('select[name="species_id"]', data.species);
    }
    if (data.breed) {
      await this.page.selectOption('select[name="breed_id"]', data.breed);
    }
  }

  async submitForm() {
    await this.page.click('button[type="submit"]');
  }

  async searchAnimal(searchTerm: string) {
    await this.searchInput.fill(searchTerm);
    await this.searchInput.press('Enter');
    // Esperar que los resultados se actualicen
    await this.page.waitForTimeout(500);
  }

  async expectAnimalInTable(record: string) {
    await this.page.locator(`text=${record}`).first().waitFor({ state: 'visible' });
  }

  async clickAnimalRow(record: string) {
    await this.page.locator(`text=${record}`).first().click();
  }

  async deleteAnimal(record: string) {
    await this.clickAnimalRow(record);
    await this.page.click('[data-testid="delete-animal-button"]');
    await this.page.click('[data-testid="confirm-delete"]');
  }

  async expectTableVisible() {
    await this.table.waitFor({ state: 'visible', timeout: 10000 });
  }

  async getRowCount(): Promise<number> {
    return await this.tableRows.count();
  }
}
