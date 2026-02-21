# Production Env Checklist (UI-only)

## Backend
- [ ] `DPM_ENV=production`
- [ ] `JWT_SECRET` قوي من Secret Manager
- [ ] `ALLOWED_ORIGINS` يحتوي HTTPS origins فقط
- [ ] `SEED_DEFAULT_USERS=false`
- [ ] `DPM_BOOTSTRAP_ADMIN_ONCE=false` افتراضيًا

## Frontend (Build-time)
- [ ] `VITE_API_BASE_URL` مضبوط وقت build على API production HTTPS
- [ ] لا `localhost` أو `127.0.0.1` في build production

## Cloudflare Pages (GitHub Actions)
- [ ] استخدام workflow `Field-Ready Deploy (Cloudflare)` عبر Actions UI
- [ ] عدم استخدام Dashboard build
- [ ] عدم استخدام `wrangler deploy` من local
- [ ] تعريف أسرار UI بالأسماء:
  - [ ] `CLOUDFLARE_API_TOKEN`
  - [ ] `CLOUDFLARE_ACCOUNT_ID`
  - [ ] `CLOUDFLARE_PROJECT_NAME` (اختياري)
