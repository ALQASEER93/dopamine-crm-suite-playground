# OWNER_ACTIONS (UI-only)

> كل الخطوات البشرية هنا عبر الواجهات فقط (UI-only). لا CLI.

## 1) GitHub Merge (UI)
- افتح Pull Request المطلوب في GitHub.
- تأكد أن Required checks كلها خضراء.
- راجع التغييرات ثم نفّذ الدمج حسب سياسة الفريق.

## 2) PWA Deploy Policy (Cloudflare Pages)
- مسار النشر المعتمد: GitHub Actions workflow `Field-Ready Deploy (Cloudflare)` فقط.
- لا تستخدم Cloudflare Dashboard build كبديل للنشر.
- لا تستخدم `wrangler deploy` محليًا.
- أسرار UI المطلوبة (أسماء فقط):
  - `CLOUDFLARE_API_TOKEN`
  - `CLOUDFLARE_ACCOUNT_ID`
  - `CLOUDFLARE_PROJECT_NAME` (اختياري)

## 3) Legacy Deploy Workflow
- workflow `Field-Ready Deploy` (Vercel) مخصص Manual-only.
- لا يعمل تلقائيًا على push إلى `main` بما يتوافق مع `APPROVE_RELEASE=NO`.

## 4) Production Config (UI-only)
- Backend:
  - `DPM_ENV=production`
  - `JWT_SECRET` قوي من Secret Manager
  - `ALLOWED_ORIGINS` نطاقات HTTPS موثوقة
  - `SEED_DEFAULT_USERS=false`
- Frontend (Build-time):
  - `VITE_API_BASE_URL` إلى API production عبر HTTPS
  - ممنوع localhost في build الإنتاج

## 5) Security Hygiene
- لا تضع passwords/tokens/secrets داخل docs أو logs.
