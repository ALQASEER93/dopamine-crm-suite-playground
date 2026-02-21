# Deployment Strategy: Vercel Staging

## القرار الموصى به (Recommended Decision)
- استخدام تكامل Git مع Vercel (Vercel Git Integration) لنشر تلقائي (Auto Deploy) لكل push/PR.
- تعيين `staging` كـ Production Branch داخل Vercel.

## لماذا Production Branch = staging
- يوفّر قناة مستقرة لاختبارات المندوبين (Light Field Validation) بدون التأثير على نظافة `main`.
- يسمح بدورة مراجعة واضحة:
  - `main`: مرجع الكود الثابت (Stable Source of Truth)
  - `staging`: قناة التشغيل الميداني الخفيف (Operational Validation)

## لماذا main يجب أن يبقى نظيفًا (No Auto Deploy on main)
- منع إطلاق غير مقصود (Unintended Release) يتعارض مع سياسة `APPROVE_RELEASE=NO`.
- إبقاء نتائج CI وعمليات الإقفال (Closeout) قابلة للتدقيق بدون ضوضاء نشر تلقائي.
- تقليل المخاطر على المسارات الحرجة: Visits/GPS/Offline/Exports/RBAC.

## نموذج التشغيل المقترح (Operating Model)
- PR -> merge إلى `main` بعد اجتياز checks.
- Fast-forward/Sync من `main` إلى `staging` عند جاهزية التشغيل الميداني.
- Vercel ينشر تلقائيًا من `staging` فقط.

## ملاحظات الحوكمة (Governance)
- أي خطوة بشرية في GitHub/Vercel تتم UI-only.
- إدارة الأسرار (Secrets) بالاسم فقط في الوثائق، بدون أي قيم.
- أي fallback عبر GitHub Actions يكون على `staging` فقط وليس `main`.
