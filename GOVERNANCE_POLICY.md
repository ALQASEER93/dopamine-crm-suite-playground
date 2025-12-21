# ALQASEER CRM — Governance Policy (Lovable + GitHub)

## 0) الهدف
ضمان تطوير CRM بسرعة عبر Lovable بدون تخريب أو تلويث الريبو الأساسية، مع الحفاظ على جودة Enterprise (PRs, CI, حماية أسرار, وتتبع إصدارات Tags).

---

## 1) الريبوهات المعتمدة
### A) Sandbox / Lovable Repo (بيئة تجارب)
- Repo: `alqaseer-crm-2026-lovable`
- الهدف: استقبال تغييرات Lovable (UI/UX/Pages/Components) بسرعة.
- القاعدة الذهبية: هذا الريبو **ليس** “مصدر الحقيقة” النهائي، بل منصة بناء/تجربة.

### B) Stable / Source-of-Truth Repo (الإصدار الرسمي)
- Repo: `alqaseer-crm`
- الهدف: النسخة الرسمية المستقرة (Backend + Frontend + CI + Security).
- كل إصدار رسمي يتم عبر Tags/Releases (مثال: `v2026.1`, `v2026.2`).

---

## 2) استراتيجية الفروع (Branches)
### Sandbox Repo: `alqaseer-crm-2026-lovable`
- Default branch: `lovable/dev`
- Branch `main` موجود لكنه محمي ومخصص لاستقبال PRs بعد مراجعة.
- Lovable يُسمح له بالكتابة على `lovable/dev` فقط.

### Stable Repo: `alqaseer-crm`
- Default branch: `main` (محمي)
- التطوير عبر فروع feature/hotfix، والدمج فقط عبر PR.

---

## 3) قواعد Lovable (Non-Negotiable)
Lovable مسموح له:
- تعديل الواجهة (UI)، الصفحات، المكوّنات، RTL/EN toggle، ثيمات، جداول/فلاتر/بحث.
- تعديل طبقة ربط الواجهة مع API بشرط الالتزام بعقد الـAPI الحالي (response keys مثل token).

Lovable ممنوع عليه:
- تخزين مفاتيح/Secrets داخل الكود (API keys, Firebase, Maps…).
- تعديل ملفات CI الحساسة أو إعدادات الأمن إلا بتوجيه صريح.
- تعديل “قلب” نظام المصادقة في Backend بدون مراجعة بشرية.

---

## 4) PR & Review Gate
- لا يوجد دمج مباشر إلى `main` في أي ريبو.
- أي تغيير لازم يمر عبر PR.
- Required checks: lint + tests + build.
- أي PR تغيّر auth/token/roles لازم يكون معه Smoke Test مثبت.

---

## 5) جودة الكود (Quality Bar)
- منع الأخطاء المتكررة (مثل اختلاف `token` vs `access_token`).
- الالتزام بـ:
  - Validation + Error states + Loading/Empty states
  - Logging محدود بدون بيانات حساسة
  - Naming واضح + ملفات منظمة

---

## 6) أسرار وبيئة التشغيل (Secrets & ENV)
- جميع الأسرار تخزن فقط في GitHub Secrets أو مزود الاستضافة.
- ملفات `.env*` لا تُرفع.
- تفعيل secret scanning + dependabot.

---

## 7) آلية “ترقية” تغييرات Lovable إلى النسخة الرسمية
الترقية تتم كالتالي:
1) تجميع تغييرات Lovable داخل `alqaseer-crm-2026-lovable` على `lovable/dev`.
2) فتح PR من `lovable/dev` إلى `main` داخل نفس sandbox repo (مراجعة + CI).
3) بعد الاستقرار: إنشاء PR/patch لنقل تغييرات الواجهة إلى `alqaseer-crm` (Stable).
4) إجراء Regression Smoke Test (Login + Navigation + Accounts/Visits/Orders/Collections).
5) Tag إصدار جديد على `alqaseer-crm` مثل `v2026.1` ثم GitHub Release.

---

## 8) الإصدارات (Releases)
- Tags على `alqaseer-crm` فقط:
  - `v2026.1`, `v2026.2`, ...
- كل Tag يصدر معه Release notes مختصرة:
  - Features / Fixes / Migration notes (إن وجدت)

---

## 9) Rollback Policy
- إذا ظهر bug خطير بعد إصدار Tag:
  - إنشاء hotfix branch
  - PR سريع + CI
  - إصدار Tag جديد `v2026.x+1`
- ممنوع force-push على `main`.

---

## 10) تعريف النجاح
- Lovable ينتج UI بسرعة داخل sandbox بدون كسر main.
- Stable repo يبقى نظيف، محمي، قابل للنشر، وإصداراته محددة وواضحة.
