import { test, expect } from '@playwright/test';

const adminEmail = process.env.CRM_ADMIN_EMAIL || 'admin@example.com';
const adminPassword = process.env.CRM_ADMIN_PASSWORD || 'Admin12345!';

const waitForDownload = async (page, action) => {
  const [download] = await Promise.all([page.waitForEvent('download'), action()]);
  await download.path();
};

const selectFirstOption = async selectLocator => {
  await selectLocator.selectOption({ index: 1 });
};

const navigateTo = async (page, linkName, headingName) => {
  await page.getByRole('link', { name: linkName }).click();
  await expect(page.getByRole('heading', { name: headingName })).toBeVisible();
};

const login = async page => {
  await page.goto('/login');
  await page.getByLabel('البريد الإلكتروني').fill(adminEmail);
  await page.getByLabel('كلمة المرور').fill(adminPassword);
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
  await expect(page.getByRole('heading', { name: 'لوحة التحكم' })).toBeVisible();
};

test('admin can navigate and perform CRUD + exports across admin pages', async ({ page }) => {
  const suffix = Date.now();
  const doctorName = `د. اختبار ${suffix}`;
  const pharmacyName = `صيدلية اختبار ${suffix}`;
  const productName = `منتج اختبار ${suffix}`;
  const productCode = `PX-${suffix}`;
  const routeName = `مسار ${suffix}`;
  const collectionRef = `COL-${suffix}`;
  const newUserEmail = `admin-user-${suffix}@example.com`;

  await login(page);

  await navigateTo(page, 'الأطباء', 'الأطباء');
  await page.getByRole('button', { name: 'إضافة طبيب' }).click();
  await page.getByLabel('الاسم').fill(doctorName);
  await page.getByRole('button', { name: 'حفظ' }).click();
  await expect(page.getByText(doctorName)).toBeVisible();

  await navigateTo(page, 'الصيدليات', 'الصيدليات');
  await page.getByRole('button', { name: 'إضافة صيدلية' }).click();
  await page.getByLabel('الاسم').fill(pharmacyName);
  await page.getByRole('button', { name: 'حفظ' }).click();
  await expect(page.getByText(pharmacyName)).toBeVisible();

  await navigateTo(page, 'المنتجات', 'المنتجات');
  await page.getByRole('button', { name: 'منتج جديد' }).click();
  await page.getByLabel('الكود').fill(productCode);
  await page.getByLabel('اسم المنتج').fill(productName);
  await page.getByRole('button', { name: 'حفظ' }).click();
  await expect(page.getByText(productName)).toBeVisible();
  await waitForDownload(page, () => page.getByRole('button', { name: 'تصدير CSV' }).click());

  await navigateTo(page, 'الطلبات', 'الطلبات');
  await page.getByRole('button', { name: 'طلب جديد' }).click();
  await page.getByLabel('نوع العميل').selectOption({ label: 'صيدلية' });
  await page.getByLabel('العميل').selectOption({ label: pharmacyName });
  await page.getByRole('button', { name: 'إضافة بند' }).click();
  const linesSection = page.getByRole('heading', { name: 'بنود الطلب' }).locator('..');
  await linesSection.locator('select').first().selectOption({ label: productName });
  await linesSection.getByPlaceholder('الكمية').fill('2');
  await linesSection.getByPlaceholder('السعر').fill('10');
  await page.getByRole('button', { name: 'حفظ' }).click();
  await expect(page.getByText(pharmacyName)).toBeVisible();
  await waitForDownload(page, () => page.getByRole('button', { name: 'تصدير CSV' }).click());

  await navigateTo(page, 'الزيارات', 'الزيارات');
  await page.getByRole('button', { name: 'إضافة زيارة' }).click();
  await selectFirstOption(page.getByLabel('المندوب'));
  await page.getByLabel('الطبيب').selectOption({ label: doctorName });
  await page.getByRole('button', { name: 'حفظ' }).click();
  await expect(page.getByText(doctorName)).toBeVisible();

  await navigateTo(page, 'المسارات', 'المسارات');
  await page.getByRole('button', { name: 'مسار جديد' }).click();
  await page.getByLabel('اسم المسار').fill(routeName);
  await selectFirstOption(page.getByLabel('المندوب'));
  await page.getByLabel('التكرار').fill('أسبوعي');
  await page.getByRole('button', { name: 'إضافة حساب' }).click();
  const accountsSection = page.getByRole('heading', { name: 'الحسابات ضمن المسار' }).locator('..');
  await accountsSection.locator('select').first().selectOption({ value: 'pharmacy' });
  await accountsSection.locator('select').nth(1).selectOption({ label: pharmacyName });
  await accountsSection.getByPlaceholder('تكرار الزيارة (أسبوعي/شهري)').fill('أسبوعي');
  await page.getByRole('button', { name: 'حفظ' }).click();
  await expect(page.getByText(routeName)).toBeVisible();
  await waitForDownload(page, () => page.getByRole('button', { name: 'تصدير CSV' }).click());

  await navigateTo(page, 'المخزون', 'المخزون');
  await page.getByRole('button', { name: 'موقع جديد' }).click();
  await page.getByLabel('اسم الموقع').fill(`مخزن ${suffix}`);
  await page.getByRole('button', { name: 'حفظ' }).click();
  await page.getByText(`مخزن ${suffix}`).first().waitFor();
  await page.getByRole('button', { name: 'حركة جديدة' }).click();
  await page.getByLabel('المنتج').selectOption({ label: productName });
  await page.getByLabel('الكمية').fill('1');
  await page.getByLabel('من موقع').selectOption({ label: `مخزن ${suffix}` });
  await page.getByRole('button', { name: 'حفظ' }).click();
  await waitForDownload(page, () => page.getByRole('button', { name: 'تصدير الحركات' }).click());
  await waitForDownload(page, () => page.getByRole('button', { name: 'تصدير المواقع' }).click());

  await navigateTo(page, 'الأهداف', 'الأهداف');
  await page.getByRole('button', { name: 'هدف مبيعات' }).click();
  await selectFirstOption(page.getByLabel('المندوب'));
  await page.getByLabel('الفترة').fill('2025-01');
  await page.getByLabel('المنتج').selectOption({ label: productName });
  await page.getByLabel('قيمة الهدف').fill('100');
  await page.getByRole('button', { name: 'حفظ' }).click();
  await page.getByRole('button', { name: 'هدف زيارات' }).click();
  await selectFirstOption(page.getByLabel('المندوب'));
  await page.getByLabel('الفترة').fill('2025-01');
  await page.getByLabel('الهدف اليومي').fill('2');
  await page.getByLabel('الهدف الشهري').fill('40');
  await page.getByRole('button', { name: 'حفظ' }).click();
  await waitForDownload(page, () => page.getByRole('button', { name: 'تصدير CSV' }).first().click());

  await navigateTo(page, 'التحصيلات', 'التحصيلات');
  await page.getByRole('button', { name: 'تحصيل جديد' }).click();
  await page.getByLabel('المبلغ').fill('50');
  await page.getByLabel('طريقة التحصيل').fill('نقدي');
  await page.getByLabel('نوع العميل').selectOption({ label: 'صيدلية' });
  await page.getByLabel('العميل').selectOption({ label: pharmacyName });
  await page.getByLabel('مرجع التحصيل').fill(collectionRef);
  await page.getByRole('button', { name: 'حفظ' }).click();
  await expect(page.getByText(collectionRef)).toBeVisible();
  await waitForDownload(page, () => page.getByRole('button', { name: 'تصدير CSV' }).click());

  await navigateTo(page, 'التقارير', 'التقارير');
  const exportButtons = page.getByRole('button', { name: 'تصدير CSV' });
  const exportCount = await exportButtons.count();
  if (exportCount > 0) {
    await waitForDownload(page, () => exportButtons.first().click());
  }

  await navigateTo(page, 'الإعدادات', 'الإعدادات');

  await navigateTo(page, 'الإدارة', 'إدارة المستخدمين');
  await page.getByLabel('الاسم').fill(`مستخدم اختبار ${suffix}`);
  await page.getByLabel('البريد الإلكتروني').fill(newUserEmail);
  await page.getByLabel('كلمة المرور').fill('Test12345!');
  await page.getByLabel('نوع المستخدم').selectOption({ label: 'مندوب مبيعات' });
  await page.getByRole('button', { name: 'حفظ' }).click();
  await expect(page.getByText(newUserEmail)).toBeVisible();
});
