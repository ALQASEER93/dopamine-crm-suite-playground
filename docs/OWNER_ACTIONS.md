# OWNER_ACTIONS (UI-only)

> الخطوات البشرية هنا عبر واجهات المستخدم فقط. لا أوامر shell.
> المرجع التفصيلي: `docs/OPERATIONS/OWNER_ACTIONS.md`.

## 1) GitHub PR
1. افتح PR.
2. تأكد أن Required checks كلها PASS.
3. نفّذ الدمج من GitHub UI وفق سياسة الفريق.

## 2) Deployment Policy
1. لا Auto-Deploy على push إلى `main`.
2. أي نشر PWA يتم يدويًا عبر GitHub Actions workflow:
   - `Field-Ready Deploy (Cloudflare)`
3. لا تستخدم Cloudflare Dashboard build.
4. لا تستخدم `wrangler deploy` من جهاز محلي.

## 3) Secrets (Names only)
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_PROJECT_NAME` (اختياري)
- `JWT_SECRET`

## 4) Frontend Build-time Env
- `VITE_API_BASE_URL` يجب ضبطه وقت build إلى API production HTTPS.
