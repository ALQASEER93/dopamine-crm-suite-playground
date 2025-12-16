# AGENTS.md — DOPAMINE CRM SUITE (DPM)

> This file is authoritative for agents (Codex CLI/Cloud/Review).
> Closest AGENTS.md to the changed file wins.

---

## العربية — قواعد عمل الوكيل (غير قابلة للنقاش)

### 0) أمان وسلوك
- ممنوع حذف ملفات/مجلدات أو “تنظيف شامل” (لا rm -rf / Remove-Item -Recurse على مسارات واسعة).
- أي تغيير لازم يكون عبر Branch + PR. ممنوع push مباشر إلى main.
- كل Claim “تم” لازم معه:
  - الملفات المتغيرة
  - أوامر الاختبار التي تم تشغيلها
  - خطوات تحقق قصيرة

### 1) تعريف المشروع (Monorepo)
هذا الريبو يحتوي عادة على:
- `CRM/backend` (FastAPI)
- `CRM/frontend` (Vite/React)
- `ALQASEER-PWA` (PWA مستقلة أو جزء من المنظومة)
- أدوات/سكريبتات إضافية

### 2) المتطلبات الأساسية (DPM Pharma CRM)
- UI عربي + Dark Mode افتراضي
- واجهة مندوب (Medical Rep + Sales/Collections) + واجهة Admin
- Visits هي أهم موديل:
  - Start Visit / End Visit مع GPS + timestamp + accuracy
  - تقارير + Exports (CSV/Excel ثم PDF)
- PWA + Offline queue (للزيارات على الأقل)
- خرائط Google Maps + (Geofence + Alerts) عند توفر بيانات المواقع
- RBAC: Admin / Rep-Med / Rep-Sales / Supervisor (اختياري)

### 3) قواعد Git/PR
- Branch naming:
  - `codex/feature-<short>`
  - `codex/fix-<short>`
- Commit checkpoints صغيرة وواضحة.
- PR لازم يذكر:
  - ماذا تغير؟
  - كيف نختبر؟
  - ماذا بقي؟

### 4) أوامر التشغيل/الاختبار (المعيار)
> نفّذ ما ينطبق حسب الجزء الذي عدّلته فقط.

#### CRM Backend (FastAPI)
- `cd CRM/backend`
- `python -m pytest -q`

#### CRM Frontend (Vite/React)
- `cd CRM/frontend`
- `npm ci` (أو npm i إذا ما فيه lock)
- `npm test` (يجب أن يكون headless/CI-friendly)
- `npm run build`

#### ALQASEER-PWA
- `cd ALQASEER-PWA`
- `npm ci`
- `npm test` (إذا موجود)
- `npm run build`

### 5) Review guidelines (Codex Review)
- صنّف المشاكل:
  - P0: أمن/صلاحيات/تسريب بيانات/كسر وظيفي
  - P1: Bugs محتملة/أداء سيء/تجربة مستخدم سيئة
  - P2: تحسينات/تنسيق/اقتراحات
- ركّز على:
  - RBAC + حماية endpoints
  - منطق الزيارة Start/End + GPS
  - Offline sync وعدم تكرار البيانات
  - التقارير والتصدير
  - عدم وجود أسرار في الكود أو logs

---

## English — Agent Operating Rules

### Safety
- No destructive commands. No mass deletion/cleanup.
- Always work via branch + PR (no direct push to main).
- Any “done” claim must include: files changed + tests run + quick verification.

### Project goals (DPM Pharma CRM)
- Arabic UI + default Dark Mode
- Rep app + Admin app
- Critical: Visit lifecycle (Start/End with GPS + timestamp + accuracy)
- Reports + exports (CSV/Excel then PDF)
- PWA + offline queue (at least for visits)
- Maps + optional geofencing/alerts
- RBAC: Admin / Rep(Med) / Rep(Sales) / Supervisor(optional)

### Standard commands
Backend: `cd CRM/backend && python -m pytest -q`
Frontend: `cd CRM/frontend && npm ci && npm test && npm run build`
PWA: `cd ALQASEER-PWA && npm ci && npm run build`

### Review guidelines
Prioritize P0/P1 only in PR reviews, especially security/RBAC, visits+GPS, offline sync, reporting/exports.
