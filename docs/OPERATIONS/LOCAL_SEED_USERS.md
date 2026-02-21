# Local Seed Users (Dev-Only)

## الهدف (Goal)
- توفير آلية آمنة وقابلة للتكرار (repeatable + idempotent) لإنشاء مستخدمي الدخول المحليين:
  - `admin@dpm.local` (Admin)
  - `manager@dpm.local` (Sales Manager)
  - `rep1@dpm.local` (Medical Rep)
  - `rep2@dpm.local` (Medical Rep)
  - `rep3@dpm.local` (Medical Rep)

## خصائص الأمان (Safety Controls)
- تعمل فقط في بيئة التطوير `DPM_ENV=development`.
- معطلة افتراضيًا ولا تعمل إلا عند تفعيل:
  - `ALLOW_DEV_LOCAL_SEED_ENDPOINT=true`
- لا تؤثر على production، وفي production ترجع `404`.
- لا تنشئ تكرارات: إعادة التشغيل تحدّث نفس المستخدمين بنفس emails.

## الآلية الرسمية (Official Mechanism)
- Endpoint:
  - `POST /api/dev/seed-local-users`
- النتيجة:
  - إنشاء/تحديث 5 مستخدمين محليين.
  - توليد كلمات مرور قوية عشوائية لكل تشغيل.
  - إرجاع `email + role + password` في response (للاستخدام المحلي فقط).

## التحقق (Verification)
- Login:
  - `POST /api/v1/auth/login` ينجح مع الحسابات المولدة.
- RBAC:
  - مستخدم rep يجب أن يُمنع من route إداري:
    - `GET /api/v1/admin/users` => `403`.

## تشغيل UI-only (Swagger)
- افتح Swagger UI: `http://127.0.0.1:8000/docs`
- نفّذ:
  - `POST /api/dev/seed-local-users`
- انسخ النتيجة إلى ملف تشغيل محلي داخل run artifacts فقط (لا تضع كلمات المرور في git/PR/comments/logs).

## ملاحظات
- هذه الآلية للاستخدام المحلي فقط (Local Development).
- لأي بيئة غير محلية، استخدم سياسات إدارة الأسرار والـIAM المعتمدة.
