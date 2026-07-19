import { describe, expect, it, vi } from 'vitest';

const FIELD_UI_FILES = [
  'src/App.jsx',
  'src/layout/MainLayout.jsx',
  'src/reports/ReportsOverview.jsx',
  'src/reports/RepPerformanceTable.jsx',
  'src/reports/ProductPerformanceTable.jsx',
  'src/reports/TerritoryPerformanceTable.jsx',
  'src/pages/MedicalEventsPage.jsx',
  'src/pages/MedicalAffairsReportsPage.jsx',
  'src/pages/VisitsPage.jsx',
];

const FORBIDDEN_FIELD_UI_PATTERNS = [
  /path=["']\/orders["']/i,
  /path=["']\/stock["']/i,
  /path=["']\/collections["']/i,
  /path=["']\/samples\/inventory["']/i,
  /from ['"].*OrdersPage/i,
  /from ['"].*StockPage/i,
  /from ['"].*CollectionsPage/i,
  /from ['"].*SamplesInventoryPage/i,
  /\borders\b/i,
  /\bstock selling\b/i,
  /\bcollections\b/i,
  /\bpayment\b/i,
  /\bledger\b/i,
  /\baccounting\b/i,
  /\bbilling\b/i,
  /\binvoice\b/i,
  /\brevenue\b/i,
  /\bprofit\b/i,
  /\bcost\b/i,
  /\bROI\b/,
  /\binventory-selling\b/i,
  /تحصيل/,
  /فاتور/,
  /دفع/,
  /محاسب/,
  /تكلفة/,
  /إيراد/,
  /الإيراد/,
  /الإيرادي/,
  /عائد/,
  /\bJOD\b/i,
  /\border requests?\b/i,
  /طلبات مالية/,
];

describe('field CRM scope guard', () => {
  it('does not expose ERP-like routes or labels in field-facing CRM shell files', async () => {
    const fs = await vi.importActual('node:fs');
    const offenders = [];

    for (const relativePath of FIELD_UI_FILES) {
      const source = fs.readFileSync(`${process.cwd()}/${relativePath}`, 'utf8');
      for (const pattern of FORBIDDEN_FIELD_UI_PATTERNS) {
        if (pattern.test(source)) {
          offenders.push(`${relativePath}: ${pattern}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
