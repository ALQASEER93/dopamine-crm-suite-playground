# قائمة تنفيذ طلب الدمج (PR Execution Checklist) — إنتاج صارم (Strict Production)

استخدم هذه القائمة قبل فتح أو تحديث أي PR.

## A) النطاق والملكية (Scope + Ownership)
- [ ] Thread charter موجود ومحدّث.
- [ ] النطاق ما زال ضمن المعتمد (no unapproved expansion).
- [ ] حدود الملكية (ownership boundaries) تم احترامها.

## B) حواجز العمل الأساسية (Guardrails)
- [ ] عمليات غير تدميرية فقط.
- [ ] الالتزام بـ Branch + PR workflow.
- [ ] لا يوجد تراجع مقصود في visits/GPS/offline/exports/RBAC.

## C) الاختبارات حسب المسار المعدّل (Tests by Touched Area)
Backend (`CRM/backend` touched):
- [ ] `python -m pytest -q`

Frontend (`CRM/frontend` touched):
- [ ] `npm ci`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] `npm audit --omit=dev --audit-level=high`

PWA (`ALQASEER-PWA` touched):
- [ ] على Windows استخدم `scripts/windows_safe_npm_ci.ps1` بدل `npm ci` داخل المصدر.
- [ ] على macOS/Linux: `npm ci && npm run test:vitest && npm run build`.
- [ ] ضمن نفس المسار الآمن شغّل `npm audit --omit=dev --audit-level=high`.

## D) تحقق يدوي للمسارات الحرجة (Manual Critical Checks)
- [ ] Visit Start/End سليمة.
- [ ] GPS timestamp/accuracy سليمة (إذا كان ذا صلة).
- [ ] Offline queue/sync سليمة (إذا كان ذا صلة).
- [ ] مسارات التصدير CSV/Excel/PDF سليمة (إذا كان ذا صلة).
- [ ] Arabic-first + default dark mode محفوظة في تغييرات UI.

## E) الأنظمة الخارجية (MCP/Apps)
- [ ] تم MCP discovery للأعمال الخارجية المطلوبة.
- [ ] الأدوات/Apps المختارة والنتائج موثقة.
- [ ] أي connector gap موثق كبند `OWNER_ACTIONS`.

## F) متطلبات جسم PR (PR Body Requirements)
- [ ] ماذا تغيّر.
- [ ] كيف تم الاختبار (exact commands).
- [ ] خطوات تحقق قصيرة.
- [ ] المخاطر المتبقية وما المتبقي.
- [ ] أرقام التذاكر/القضايا وروابط النشر (عند الحاجة).

## G) نظافة مخرجات التشغيل (Run Artifact Hygiene)
- [ ] لا تنشئ `docs/_runs/run_<YYYYMMDD_HHMMSS>/` إلا عند تنفيذ run فعلي.
- [ ] حدّث `docs/_runs/LATEST.txt` فقط عند إنشاء run folder جديد فعلاً.
- [ ] تأكد من تطابق بنية `docs/_runs/` مع `docs/_runs/README.md`.
- [ ] حافظ على `docs/_runs/REPORT_ROTATION_POLICY.txt` محدثًا.

## H) حوكمة الإصدار والمالك (Release + Owner Governance)
- [ ] القيمة الافتراضية `APPROVE_RELEASE=NO` لم تتغير بدون موافقة مالك.
- [ ] كل عناصر `OWNER_ACTIONS` منفذة عبر UI فقط (GitHub/Vercel/Linear...).
- [ ] لا توجد تعليمات تطلب من المستخدم تنفيذ أوامر shell يدويًا.

## I) فحص نهائي (Final Sanity)
- [ ] لا أسرار في الكود/الـ logs/المستندات.
- [ ] API base ثابت: `http://127.0.0.1:8000/api/v1`.
- [ ] تم الالتزام بأقرب `AGENTS.md` للمسارات المعدلة.
