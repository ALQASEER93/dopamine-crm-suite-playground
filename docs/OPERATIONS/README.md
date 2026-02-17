# دليل التشغيل (Operations Docs Index)

هذا المجلد هو مرجع التشغيل الرسمي للعمل عبر Codex داخل هذا الـ monorepo وفق حوكمة إنتاج صارمة (strict production governance).

## المستندات الإلزامية (Required Workflow Docs)
- `AGENT_OS_PLAYBOOK.md`: نموذج التشغيل الكامل (Operating Model).
- `THREAD_CHARTER_TEMPLATE.md`: ميثاق التنفيذ قبل أي عمل متوسط/كبير.
- `SUBAGENT_OWNERSHIP_TEMPLATE.md`: عقود الملكية بين الوكلاء المتوازيين.
- `MCP_APPS_POLICY.md`: سياسات الوصول للأنظمة الخارجية عبر MCP/Apps.
- `SKILLS_USAGE_MATRIX.md`: متى وكيف يتم تفعيل الـ Skills.
- `PR_EXECUTION_CHECKLIST.md`: قائمة بوابة PR الإلزامية.
- `INCIDENT_RUNBOOK.md`: آلية التعامل مع الحوادث (CI/Runtime/Deploy).

## متطلبات تغليف طلب الدمج (PR Packaging Requirements)
- الالتزام بقالب `.github/PULL_REQUEST_TEMPLATE.md` في كل تحديث PR.
- كتابة أوامر التحقق الفعلية ونتائجها كما نُفذت.
- توثيق المخاطر المتبقية (Residual Risk) وما تبقى على المالك.
- إبقاء مراجع التشغيل متوافقة مع `docs/_runs/LATEST.txt`.

## حوكمة الإصدار والتشغيل (Release + Run Governance)
- الحالة الافتراضية دائمًا: `APPROVE_RELEASE=NO` حتى موافقة المالك.
- أي بند `OWNER_ACTIONS` يُنفّذ عبر واجهة UI المعتمدة فقط (GitHub/Vercel/Linear...) وليس عبر shell يدوي.
- لا نطلب من المستخدم تنفيذ أوامر shell يدويًا؛ التنفيذ يكون عبر سكربتات/أتمتة موثقة داخل الريبو.

## مستندات مساعدة تقارير التشغيل (Reporting Helpers)
- `docs/_runs/README.md`: هيكل run artifacts وقواعد التحديث.
- `docs/_runs/REPORT_ROTATION_POLICY.txt`: سياسة الاحتفاظ/التدوير (retention/rotation).
