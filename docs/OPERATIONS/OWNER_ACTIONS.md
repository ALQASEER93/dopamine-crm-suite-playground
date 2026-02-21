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

## 6) Vercel Staging Setup (UI-only)
- الهدف: جعل `staging` هو Production Branch على Vercel مع Auto Deploy آمن خارج `main`.

### الخطوات (UI-only)
1. افتح مشروع Vercel (Project) واربطه مع GitHub repository إذا لم يكن مربوطًا.
2. من إعدادات المشروع (Settings -> Git)، عيّن `Production Branch` = `staging`.
3. تأكد من متغيرات البيئة المطلوبة (Environment Variables) بالأسماء فقط:
   - `VITE_API_BASE_URL`
   - `VITE_GOOGLE_MAPS_API_KEY`
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
4. للحصول على روابط الاستخدام للمندوبين:
   - رابط Preview من تبويب Deployments لكل PR.
   - رابط Production من آخر نشر ناجح على `staging`.

### Fallback اختياري: GitHub Actions على staging فقط
- يستخدم فقط عند تعذر/تعطّل Git Integration.
- أسماء الأسرار المطلوبة (Names only):
  - `VERCEL_TOKEN`
  - `VERCEL_ORG_ID`
  - `VERCEL_PROJECT_ID`
- مكان الإضافة: GitHub -> Repository -> Settings -> Secrets and variables -> Actions.
- ممنوع تفعيل Auto Deploy على `main`.
