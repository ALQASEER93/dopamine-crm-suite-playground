## خطة تدقيق وإغلاق فجوات الجاهزية (Backend + Frontend + PWA)

### الملخص
الهدف هو تحويل نتائج الفحص الحالية إلى تنفيذ إصلاحي Decision-complete يرفع الجاهزية العملية والأمنية بدون كسر متطلبات المشروع (`Arabic-first`, `Dark default`, `Visits lifecycle`, `Offline queue`, `RBAC`, `API base URL`).  
الأولوية القصوى: معالجة فشل إقلاع الـ Backend بسبب عدم توافق الـ schema، ثم منع فقدان أحداث `visit start/end` في وضع Offline، ثم إغلاق فجوات lint/type-check/CI والاعتماديات.

---

## أهم التغييرات المطلوبة على الواجهات العامة (APIs / Interfaces / Types)

1. **Backend API (PWA visit creation/queue correlation)**
   - إضافة حقل اختياري `client_mutation_id` في payload الخاص بـ `POST /api/v1/pwa/visits`.
   - إرجاع `client_mutation_id` في response عند توفره.
   - الهدف: ربط الزيارة المحلية المولدة Offline بالـ ID الحقيقي من السيرفر.

2. **PWA Offline Queue Contract**
   - توسيع `QueuedMutation` لدعم:
     - `dependsOnMutationId?: string`
     - `localVisitId?: string`
     - `serverVisitId?: string`
   - تعديل replay logic بحيث:
     - `visit-start` و `visit-end` لا تُرسل قبل نجاح `visit` المرتبطة.
     - تحديث endpoint تلقائيًا من local ID إلى server ID بعد نجاح `create visit`.

3. **Frontend Theme Behavior**
   - جعل default theme = `dark` صريحًا عند أول تشغيل (بدون انتظار `prefers-color-scheme`).

---

## خطة التنفيذ التفصيلية حسب الأولوية

### P0
1. **إصلاح blocker إقلاع Backend (schema drift)**
   - السبب الحالي: startup يفشل في `seed_reference_data` بسبب `doctors.latitude` غير موجودة.
   - التنفيذ:
     - اعتماد Alembic كمسار رسمي قبل seed (تشغيل migration في startup عند الحاجة أو fail-fast برسالة واضحة مع أمر الإصلاح).
     - منع `seed_reference_data` من العمل قبل تحقق `alembic head`.
   - الملفات المستهدفة:
     - `CRM/backend/main.py`
     - `CRM/backend/alembic/*`
     - `CRM/backend/services/seed_data.py`
   - قبول التنفيذ:
     - `py -m uvicorn main:app --host 127.0.0.1 --port 8000` يعمل بدون crash.
     - `/status` و `/api/v1/health` ترجع 200.

2. **منع فقدان Start/End في Offline queue (زيارات)**
   - السبب الحالي: إنشاء زيارة Offline يستخدم `crypto.randomUUID` محلي، ثم start/end تُرسل على `visits/{local-id}`؛ replay يعتبر `404/409/422` conflict ويسقط العملية.
   - التنفيذ:
     - ربط lifecycle mutations (`visit`, `visit-start`, `visit-end`) عبر dependency chain.
     - عدم إسقاط `404` تلقائيًا لـ `visit-start/end` إذا كانت parent visit لم تُحل server-side.
     - إضافة mapping local->server ID بعد نجاح `POST pwa/visits`.
   - الملفات:
     - `ALQASEER-PWA/src/pwa/routes/visits/VisitsPage.tsx`
     - `ALQASEER-PWA/src/pwa/offline/queue.ts`
     - `ALQASEER-PWA/src/pwa/api/client.ts`
     - `CRM/backend/api/v1/pwa.py`
   - قبول التنفيذ:
     - سيناريو Offline: create ثم start ثم end -> بعد reconnect كلها تُطبّق على نفس visit بالسيرفر.

---

### P1
3. **فرض Dark Mode كـ default في CRM frontend**
   - التنفيذ:
     - تهيئة الحالة الابتدائية إلى `dark` إذا لا يوجد user override.
     - إبقاء toggle الحالي كما هو.
   - الملف:
     - `CRM/frontend/src/layout/MainLayout.jsx`
   - قبول التنفيذ:
     - أول تحميل بدون localStorage يبدأ على dark.

4. **إصلاح PWA lint/type-check**
   - lint:
     - استبعاد `dev-dist/` (generated assets) من ESLint scope.
   - type-check:
     - حل أخطاء `virtual:pwa-register` typings.
     - إضافة vitest globals/types للاختبارات.
     - حل mismatch في `SyncStatus onSyncNow` وإشارات TypeScript الأخرى.
   - الملفات:
     - `ALQASEER-PWA/.eslintignore`
     - `ALQASEER-PWA/tsconfig.json`
     - `ALQASEER-PWA/src/pwa/offline/serviceWorkerRegistration.ts`
     - `ALQASEER-PWA/src/pwa/App.tsx`
     - ملفات tests المتأثرة
   - قبول التنفيذ:
     - `npm run lint` pass
     - `npx tsc --noEmit` pass
     - `npm run test:vitest` pass

5. **تغطية التقارير المطلوبة PDF**
   - التنفيذ:
     - إضافة endpoint PDF export للزيارات أو rep-performance (على الأقل واحد مبدئيًا) باستخدام مكتبة PDF مستقرة.
   - الملفات:
     - `CRM/backend/api/v1/visits.py` أو `CRM/backend/api/v1/reports.py`
   - قبول التنفيذ:
     - endpoint PDF يرجع ملف صالح + test.

---

### P2
6. **تقوية Security/DX/CI**
   - dependency hardening:
     - معالجة `react-router-dom` high advisory.
     - تقييم ترقية Vite/Esbuild بتدرج آمن.
   - CI:
     - إضافة frontend tests (`npm test --if-present`) في `ci.yml`.
     - إضافة PWA tests (`npm run test:vitest`) + optional type-check.
   - Backend hardening:
     - تقليل broad CORS methods/headers إذا غير مطلوبة.
     - مراجعة `payload: dict` في `pwa.py` واستبدالها بـ Pydantic schemas.
   - الملفات:
     - `.github/workflows/ci.yml`
     - `CRM/backend/api/v1/pwa.py`
     - `CRM/frontend/package.json`, `ALQASEER-PWA/package.json` (+ lockfiles)

---

## خطة الاختبارات والسيناريوهات (Acceptance Matrix)

1. **Runtime**
   - Backend startup + health endpoints.
   - Frontend preview (`/`) returns 200.
   - PWA preview (`/pwa/`) returns 200.

2. **Functional Critical**
   - Visit start/end with GPS (`lat/lng/accuracy/timestamps`) online.
   - نفس السيناريو offline ثم replay بدون فقدان أو duplication.
   - RBAC checks: rep لا يصل endpoints مالية/حساسة غير مصرحة.
   - Exports: CSV + Excel + PDF integrity.

3. **Quality Gates**
   - Backend: `py -m pytest -q`
   - Frontend: `npm test --if-present`, `npm run build`, `npm run lint`
   - PWA: `npm run test:vitest`, `npm run build`, `npm run lint`, `npx tsc --noEmit`

4. **Security Gates**
   - `npm audit --omit=dev` قبل/بعد مع مقارنة.
   - توثيق أي high-risk متبقٍ بخطة mitigation وتاريخ مستهدف.

---

## الافتراضات والـ Defaults المعتمدة
1. يبقى `API base URL` الافتراضي المطلوب: `http://127.0.0.1:8000/api/v1` (لا تغيير).
2. لا تعديل destructive على git history أو حذف شامل.
3. السماح بتعديلات runtime artifacts غير المتتبعة (dist/node_modules) ضمن الفحص.
4. سياسة conflict تبقى `server-wins` عمومًا، **باستثناء** lifecycle المرتبط (`visit-start/end`) حيث يلزم dependency-aware replay.
5. الهدف من هذه الخطة: الإغلاق الكامل للفجوات التشغيلية أولًا، ثم hardening أمني تدريجي بدون breaking changes كبيرة.

