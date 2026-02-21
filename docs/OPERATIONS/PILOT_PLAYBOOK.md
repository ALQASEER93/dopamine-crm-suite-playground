# Pilot Playbook (Arabic-first)

## الهدف
- تشغيل Pilot بشكل آمن بدون Auto-Deploy على `main`.
- الحفاظ على المسارات الحرجة: Visits/GPS/Offline/PWA/Exports/RBAC.

## مراحل التشغيل
1. دمج PR عبر GitHub UI بعد نجاح Required checks.
2. تفعيل/تأكيد إعدادات الإنتاج عبر UI فقط.
3. تنفيذ نشر PWA عبر `Field-Ready Deploy (Cloudflare)` من Actions UI عند الحاجة.
4. تنفيذ Verification checklist بعد النشر.

## سياسة النشر
- ممنوع النشر التلقائي من push إلى `main` (`APPROVE_RELEASE=NO`).
- أي نشر يتم يدويًا عبر workflow dispatch فقط.

## مخرجات مطلوبة
- Run Pack مكتمل تحت `docs/_runs/run_<timestamp>/`.
- تقرير واضح بالنتيجة (`overall_pass`) و`blockers`.
