# Production Env Checklist (UI-only)

## Backend
- [ ] `DPM_ENV=production`
- [ ] `JWT_SECRET` قوي من Secret Manager
- [ ] `ALLOWED_ORIGINS` يحتوي HTTPS origins فقط
- [ ] `ALLOWED_ORIGIN_REGEX` مضبوط لدومينات الـPreview/Production الموثوقة
- [ ] `SEED_DEFAULT_USERS=false`
- [ ] `DPM_BOOTSTRAP_ADMIN_ONCE=false` افتراضيًا
- [ ] `DATABASE_URL` مضبوط على قاعدة بيانات دائمة (Neon/Supabase Postgres)
- [ ] (اختياري) `PROD_DATABASE_URL` إذا أردت override منفصل للإنتاج

## Frontend (Build-time)
- [ ] `VITE_API_BASE_URL` مضبوط وقت build على API production HTTPS
- [ ] `VITE_API_URL` نفس قيمة `VITE_API_BASE_URL`
- [ ] لا `localhost` أو `127.0.0.1` في build production

## Cloudflare Pages (GitHub Actions)
- [ ] استخدام workflow `Field-Ready Deploy (Cloudflare)` عبر Actions UI
- [ ] عدم استخدام Dashboard build
- [ ] عدم استخدام `wrangler deploy` من local
- [ ] تعريف أسرار UI بالأسماء:
  - [ ] `CLOUDFLARE_API_TOKEN`
  - [ ] `CLOUDFLARE_ACCOUNT_ID`
  - [ ] `CLOUDFLARE_PROJECT_NAME` (اختياري)

## Vercel (CRM Frontend + API)
- [ ] Frontend project root = `CRM/frontend`
- [ ] API base backend يعمل على `https://<backend-domain>/api/v1`
- [ ] تم اختبار CORS preflight من frontend production URL إلى `/api/v1/auth/login`
