import { expect, type Page, test } from '@playwright/test';

const apiBase = process.env.CRM_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';
const frontendUrl = process.env.CRM_FRONTEND_URL || 'http://127.0.0.1:5174';
const screenshotDir = process.env.DPM_SCREENSHOT_DIR || '../../docs/_runs/playwright-screenshots';

type RoleLogin = {
  role: 'admin' | 'sales_manager' | 'medical_rep';
  email?: string;
  password?: string;
  expectReports: boolean;
};

const roles: RoleLogin[] = [
  {
    role: 'admin',
    email: process.env.DPM_QA_ADMIN_EMAIL,
    password: process.env.DPM_QA_ADMIN_PASSWORD,
    expectReports: true,
  },
  {
    role: 'sales_manager',
    email: process.env.DPM_QA_MANAGER_EMAIL,
    password: process.env.DPM_QA_MANAGER_PASSWORD,
    expectReports: true,
  },
  {
    role: 'medical_rep',
    email: process.env.DPM_QA_REP_EMAIL,
    password: process.env.DPM_QA_REP_PASSWORD,
    expectReports: false,
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

async function activateAccessibleControl(page: Page, locator: ReturnType<Page['getByTestId']>) {
  try {
    await locator.click({ timeout: 3_000 });
  } catch (_error) {
    await locator.focus();
    await page.keyboard.press('Enter');
  }
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
        if (!roleLogin.expectReports && route === '/reports') {
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

      const languageToggle = page.getByTestId('language-toggle');
      await expect(languageToggle).toBeVisible();
      await expect(languageToggle).toHaveAccessibleName(/English|Switch language|تبديل اللغة/i);
      const initialDir = await page.locator('html').getAttribute('dir');
      await activateAccessibleControl(page, languageToggle);
      await expect(page.locator('html')).toHaveAttribute('dir', initialDir === 'rtl' ? 'ltr' : 'rtl');
      await page.screenshot({
        path: `${screenshotDir}/${roleLogin.role}-language-switched-${testInfo.project.name}.png`,
        fullPage: false,
      });
      await activateAccessibleControl(page, page.getByTestId('language-toggle'));
      await expect(page.locator('html')).toHaveAttribute('dir', initialDir || 'rtl');

      await page.goto('/customers');
      await expect(page.getByTestId('customer-search')).toBeVisible();
      await expect(page.getByTestId('customer-type-filter')).toBeVisible();
      await expect(page.getByTestId('customer-frequency-status-summary')).toBeVisible();
      await expect(page.getByTestId('customer-doctor-count')).toBeVisible();
      await expect(page.getByTestId('customer-pharmacy-count')).toBeVisible();
      const profileLink = page.getByTestId('open-profile-action').first();
      if (await profileLink.count()) {
        await expect(profileLink).toHaveAccessibleName(/Open Profile|فتح الملف/i);
        await profileLink.click();
        await expect(page.getByTestId('customer-detail-panel')).toBeVisible();
        await expect(page.getByTestId('customer-visit-timeline')).toBeVisible();
        await expect(page.getByTestId('detail-start-visit-action')).toBeVisible();
        await expect(page.getByTestId('detail-map-action').or(page.getByTestId('detail-map-unavailable'))).toBeVisible();
        await page.screenshot({
          path: `${screenshotDir}/${roleLogin.role}-customer-detail-${testInfo.project.name}.png`,
          fullPage: false,
        });
      }

      await page.goto('/visits');
      await expect(page.getByTestId('visit-lifecycle-panel')).toBeVisible();
      for (const step of ['planned', 'started', 'checked_in', 'in_visit', 'call_recorded', 'ended', 'submitted', 'synced']) {
        await expect(page.getByTestId(`visit-lifecycle-step-${step}`)).toBeVisible();
      }

      if (roleLogin.expectReports) {
        await page.goto('/reports');
        await expect(page.getByTestId('reports-overview')).toBeVisible();
        await expect(page.getByTestId('reports-planned-vs-completed')).toBeVisible();
        await expect(page.getByTestId('reports-due-overdue')).toBeVisible();
        await expect(page.getByTestId('reports-frequency-attainment')).toBeVisible();
        await expect(page.getByTestId('reports-rep-activity')).toBeVisible();
        await expect(page.getByTestId('reports-territory-coverage')).toBeVisible();
        await expect(page.getByTestId('reports-export-csv').or(page.getByTestId('reports-export-unavailable'))).toBeVisible();
      }

      const relevantIssues = consoleIssues.filter(issue => !/favicon|401|403/.test(issue));
      expect(relevantIssues).toEqual([]);
    });
  }
});
