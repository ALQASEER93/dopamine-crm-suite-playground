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
  - `ALLOWED_ORIGIN_REGEX` لدومينات Vercel preview الموثوقة
  - `SEED_DEFAULT_USERS=false`
  - `DATABASE_URL` إلى Postgres دائم (Neon/Supabase)
- Frontend (Build-time):
  - `VITE_API_BASE_URL` إلى API production عبر HTTPS
  - `VITE_API_URL` نفس قيمة `VITE_API_BASE_URL`
  - ممنوع localhost في build الإنتاج

## 5) Security Hygiene
- لا تضع passwords/tokens/secrets داخل docs أو logs.

## 6) Durable DB Setup (UI-only: Neon أو Supabase)
1. Neon (الخيار الأبسط):
   - افتح `https://console.neon.tech`.
   - `Create Project` ثم اختر region قريب.
   - من صفحة المشروع: `Connection Details` ثم انسخ قيمة `Connection string` (pooled).
2. Supabase (بديل):
   - افتح `https://supabase.com/dashboard`.
   - `New project` ثم انتظر الجاهزية.
   - `Project Settings` -> `Database` -> انسخ `Connection string` (URI).
3. Vercel Backend Project:
   - افتح مشروع backend على Vercel.
   - `Settings` -> `Environment Variables` -> `Add New`.
   - أضف:
     - `DATABASE_URL` = `<postgres-connection-string>`
     - `DPM_ENV` = `production`
     - `JWT_SECRET` = `<strong-secret>`
   - حدّد البيئات: `Production` و`Preview` حسب السياسة.
4. Apply + Redeploy:
   - من `Deployments` اختر أحدث deployment.
   - `...` -> `Redeploy` مع نفس commit.
5. التحقق بعد redeploy:
   - افتح `/api/v1/health`.
   - تأكد أن `db` لم يعد يشير إلى `/tmp/crm_fastapi_fallback.sqlite`.
