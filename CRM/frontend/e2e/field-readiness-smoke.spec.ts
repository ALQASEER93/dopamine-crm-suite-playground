import { expect, type Page, test } from '@playwright/test';

const apiBase = process.env.CRM_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';
const frontendUrl = process.env.CRM_FRONTEND_URL || 'http://127.0.0.1:5174';
const screenshotDir = process.env.DPM_SCREENSHOT_DIR || '../../docs/_runs/playwright-screenshots';

type RoleLogin = {
  role: 'admin' | 'medical_rep';
  email?: string;
  password?: string;
};

const roles: RoleLogin[] = [
  {
    role: 'admin',
    email: process.env.DPM_QA_ADMIN_EMAIL,
    password: process.env.DPM_QA_ADMIN_PASSWORD,
  },
  {
    role: 'medical_rep',
    email: process.env.DPM_QA_REP_EMAIL,
    password: process.env.DPM_QA_REP_PASSWORD,
  },
];

const routes = ['/account', '/customers', '/visits', '/today-route', '/live-map', '/reports'];

async function login(page: Page, roleLogin: RoleLogin) {
  test.skip(!roleLogin.email || !roleLogin.password, `${roleLogin.role} credentials are not configured`);
  await page.goto(`${frontendUrl}/login`, { waitUntil: 'domcontentloaded' });
  if (!(await page.locator('input[name="email"]').isVisible({ timeout: 5_000 }).catch(() => false))) {
    await page.screenshot({ path: `${screenshotDir}/${roleLogin.role}-login-form-missing.png`, fullPage: false });
  }
  await expect(page.locator('input[name="email"]')).toBeVisible();
  await page.locator('input[name="email"]').fill(roleLogin.email!);
  await page.locator('input[name="password"]').fill(roleLogin.password!);
  await page.getByRole('button', { name: /دخول|تسجيل الدخول/ }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}

test.describe('CRM field readiness authenticated smoke', () => {
  for (const roleLogin of roles) {
    test(`${roleLogin.role} can render required field routes`, async ({ page }, testInfo) => {
      const consoleIssues: string[] = [];
      page.on('console', message => {
        if (['error', 'warning'].includes(message.type())) {
          consoleIssues.push(`${message.type()}: ${message.text()}`);
        }
      });
      page.on('pageerror', error => consoleIssues.push(`pageerror: ${error.message}`));

      await login(page, roleLogin);

      for (const route of routes) {
        await page.goto(route);
        if (roleLogin.role === 'medical_rep' && route === '/reports') {
          await expect(page.locator('body')).toContainText(/غير مصرح|Insufficient|dashboard|لوحة التحكم/);
        } else {
          await expect(page.locator('#root')).not.toBeEmpty();
          await expect(page.locator('body')).not.toContainText(/Internal Server Error|Failed to fetch|Vite Error/i);
        }
        await page.screenshot({
          path: `${screenshotDir}/${roleLogin.role}-${route.replace(/\W+/g, '-') || 'root'}-${testInfo.project.name}.png`,
          fullPage: false,
        });
      }

      await page.goto('/customers');
      const profileLink = page.getByRole('link', { name: /Open Profile|فتح|ملف/i }).first();
      if (await profileLink.count()) {
        await profileLink.click();
        await expect(page.locator('.drawer--open, aside')).toBeVisible();
        await page.screenshot({
          path: `${screenshotDir}/${roleLogin.role}-customer-detail-${testInfo.project.name}.png`,
          fullPage: false,
        });
      }

      const relevantIssues = consoleIssues.filter(issue => !/favicon|401|403/.test(issue));
      expect(relevantIssues).toEqual([]);
    });
  }
});
