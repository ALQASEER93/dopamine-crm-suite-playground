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
  it('routes Preview API traffic through the audited backend branch alias', async () => {
    const fs = await import('node:fs');
    const config = JSON.parse(fs.readFileSync(`${process.cwd()}/vercel.json`, 'utf8'));
    const apiRewrite = config.rewrites.find(item => item.source === '/api/v1/:path*');

    expect(apiRewrite.destination).toContain('dopamine-crm-api-git-codex-field-re-10fdc2');
    expect(apiRewrite.destination).not.toBe('https://dopamine-crm-api.vercel.app/api/v1/:path*');
    expect(apiRewrite.destination).not.toMatch(/localhost|127\.0\.0\.1/);
  });

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
