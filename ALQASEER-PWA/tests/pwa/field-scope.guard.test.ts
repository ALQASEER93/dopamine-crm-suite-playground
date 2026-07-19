import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const FIELD_UI_FILES = ["src/pwa/App.tsx", "src/pwa/components/navigation/BottomNav.tsx"];

const FORBIDDEN_FIELD_UI_PATTERNS = [
  /path=["']\/orders["']/i,
  /path=["']\/stock["']/i,
  /path=["']\/collections["']/i,
  /\borders\b/i,
  /\bstock selling\b/i,
  /\bcollections\b/i,
  /\bpayment\b/i,
  /\bledger\b/i,
  /\baccounting\b/i,
  /\bbilling\b/i,
  /\binvoice\b/i,
  /\binventory-selling\b/i,
  /تحصيل/,
  /فاتور/,
  /دفع/,
  /محاسب/,
];

describe("PWA field CRM scope guard", () => {
  it("does not expose ERP-like routes or labels in the field PWA shell", () => {
    const offenders: string[] = [];

    for (const relativePath of FIELD_UI_FILES) {
      const source = readFileSync(resolve(process.cwd(), relativePath), "utf8");
      for (const pattern of FORBIDDEN_FIELD_UI_PATTERNS) {
        if (pattern.test(source)) {
          offenders.push(`${relativePath}: ${pattern}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});

describe("PWA route contract guard", () => {
  it("keeps the required field route contract registered", () => {
    const source = readFileSync(resolve(process.cwd(), "src/pwa/App.tsx"), "utf8");
    const requiredRoutes = [
      "/account",
      "/customers",
      "/customers/:id",
      "/visits",
      "/today-route",
      "/live-map",
      "/reports",
    ];

    for (const route of requiredRoutes) {
      expect(source).toContain(`path="${route}"`);
    }
  });
});
