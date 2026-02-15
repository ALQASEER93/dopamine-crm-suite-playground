import { test, expect } from '@playwright/test';

test('PWA smoke: loads root', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/.+/);
});
