import { Page } from '@playwright/test';

export async function loginAs(page: Page, role: 'admin' | 'operario' = 'admin') {
  await page.goto('/login');
  const creds = { 
    admin: ['admin', 'test123'], 
    operario: ['op1', 'test123'] 
  };
  await page.fill('[name=username]', creds[role][0]);
  await page.fill('[name=password]', creds[role][1]);
  await page.click('button[type=submit]');
  await page.waitForURL('**/dashboard');
}
