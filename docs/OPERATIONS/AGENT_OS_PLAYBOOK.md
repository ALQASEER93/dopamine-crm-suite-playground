# دليل التشغيل (Agent OS Playbook) — مستودع DPM (DPM Monorepo)

## 1) الهدف (Purpose)
هذا الدليل يوضح كيفية تنسيق `agent threads` و `sub-agents` و `MCP` و `skills` و `apps` لضمان تسليم متوقع وآمن.

الأهداف:
- منع خلط السياق بين الواجهة الخلفية (backend) / الواجهة الأمامية (frontend) / تطبيق الويب التقدمي (PWA).
- رفع سرعة التنفيذ مع ملكية واضحة.
- فرض بوابات جودة لمسارات الزيارات (visits) / نظام التموضع (GPS) / العمل دون اتصال (offline) / الصلاحيات (RBAC) / التقارير (reports).

قيود إلزامية (Authoritative Constraints):
- الالتزام بأقرب `AGENTS.md` (closest file wins).
- العمل عبر Branch + PR فقط.
- ممنوع العمليات التدميرية.
- واجهات عربية أولاً (Arabic-first) مع الوضع الداكن الافتراضي (Dark Mode) في frontend/PWA.
- ممنوع أي تراجع (no regression) في الزيارات (Visits) / GPS / Offline / PWA / التصدير (Exports).

## 1.1) قواعد ثابتة غير قابلة للتغيير (Fixed Non-Negotiable Rules)
- واجهة عربية أولاً (Arabic-first UI) مع وضع داكن افتراضي (default dark mode).
- ممنوع التراجع (no regression) في: Visits / GPS / Offline / PWA / Exports.
- العمل عبر Branch + PR فقط (Branch+PR only).
- قيمة بوابة الإصدار الافتراضية دائمًا: `APPROVE_RELEASE=NO`.
- عناصر `OWNER_ACTIONS` تكون واجهة مستخدم فقط (UI-only).
- كل مخرجات التشغيل (outputs) يجب أن تكون داخل `docs/_runs/run_<YYYYMMDD_HHMMSS>/`.
- يجب ضغط المخرجات كأرشيف `zip` داخل نفس مجلد التشغيل.

## 2) المفاهيم الأساسية (Core Concepts)
- `Agent Thread`: مسار عمل بهدف واحد وفرع واحد.
- `Sub-agent`: وكيل مفوض بملكية مسارات محددة.
- `MCP`: واجهة موحدة للوصول للأنظمة الخارجية.
- `App`: تكامل خارجي عبر MCP (GitHub, Slack, Linear, ...).
- `Skill`: حزمة سير عمل محلية يجب استخدامها عند تطابق السياق.

## 3) أنواع الـ Thread (Thread Types)
1. `Feature Thread`: سلوك جديد.
2. `Bugfix Thread`: إصلاح خلل.
3. `Hotfix Thread`: إصلاح عاجل للإنتاج/CI.
4. `Investigation Thread`: تحليل سبب جذري بلا تعديل كود.

## 4) التسمية والتفرع (Naming + Branching)
- صيغة الفرع:
  - `codex/feature-<short>`
  - `codex/fix-<short>`
- عنوان الـ thread يجب أن يعكس هدف الفرع.
- لا تعيد استخدام thread لأهداف غير مرتبطة.

## 5) دورة الحياة الإلزامية (Mandatory Lifecycle)
1. Intake: تعريف الهدف والقيود وتصنيف الخطر.
2. Charter: تعبئة `docs/OPERATIONS/THREAD_CHARTER_TEMPLATE.md`.
3. Plan: تفكيك العمل إلى وحدات ملكية واضحة.
4. Execute: كل مالك يعدل فقط ضمن `owned_paths`.
5. Verify: تشغيل الاختبارات المطلوبة وتوثيق الأدلة.
6. PR: تطبيق `docs/OPERATIONS/PR_EXECUTION_CHECKLIST.md`.
7. Handoff/Close: تلخيص التغييرات وما تبقى.

## 6) نموذج تشغيل الوكلاء الفرعيين (Sub-agents)
استخدم sub-agents عند وجود مسارين مستقلين أو أكثر.

تقسيم أساسي مقترح (Recommended Baseline Split):
- Backend owner: `CRM/backend/**`
- Frontend owner: `CRM/frontend/**`
- PWA owner: `ALQASEER-PWA/**`
- QA owner: أدلة التحقق ومنع التراجع

قواعد:
- كل sub-agent يحدد `owned_paths` و `non_owned_paths` صراحة.
- لا تعديل لمسارات مشتركة بدون handoff موثق.
- الوكيل المنسق (parent) يدمج ويحل عقود التكامل.

## 7) سياسة MCP + Apps
مستويات عملية:
- Tier-1: GitHub, Vercel, Slack, Linear
- Tier-2: Notion, Figma, OpenAI Docs, Deep Research, Monday.com, Hugging Face

قواعد التنفيذ:
1. عند أي عمل خارجي، ابدأ بـ MCP discovery.
2. اختر أقل مجموعة أدوات تكفي للمهمة.
3. وثّق الأدوات والنتيجة والفشل البديل (fallback).
4. إذا connector مفقود: سجّل `OWNER_ACTIONS` كعنصر follow-up.

## 8) سياسة Skills
عند تطابق المهمة مع skill معيّنة، يجب استخدامها.

أمثلة عالية القيمة:
- `gh-fix-ci`, `gh-address-comments`, `playwright`, `openai-docs`, `vercel-deploy`, `security-*`, `sentry`.

## 9) بوابات الجودة (Definition of Done by Touched Area)
Backend touched:
- `cd CRM/backend && python -m pytest -q`

Frontend touched:
- `cd CRM/frontend && npm ci && npm test --if-present && npm run build`
- `cd CRM/frontend && npm audit --omit=dev --audit-level=high`

PWA touched:
- على Windows: `pwsh -File scripts/windows_safe_npm_ci.ps1 -AppPath ALQASEER-PWA -AppName ALQASEER-PWA -RunDir <run_dir> -LogsDir <run_logs> -AdditionalNpmCommands @('npm audit --omit=dev --audit-level=high')`
- بديل مباشر عند الحاجة: `cd ALQASEER-PWA && npm run build && npm audit --omit=dev --audit-level=high`

يجب أن يتضمن PR دائمًا:
- الملفات المتغيرة.
- أوامر الاختبار المنفذة.
- خطوات تحقق قصيرة.

## 10) قواعد الحوكمة الحرجة (Governance Controls)
- الافتراضي لأي release gate هو `APPROVE_RELEASE=NO`.
- أي إجراء ضمن `OWNER_ACTIONS` يتم عبر UI فقط (لا shell يدوي).
- لا نطلب من المستخدم تشغيل أوامر shell يدويًا؛ نعتمد سكربتات الريبو والأتمتة.
- مرجع run النشط يجب أن يبقى `docs/_runs/LATEST.txt` ومتوافقًا مع بنية `docs/_runs/run_<YYYYMMDD_HHMMSS>/`.
- كل run يجب أن يحتوي حزمة مضغوطة (`.zip`) لنتائج التنفيذ ضمن نفس المجلد.

## 10.1) توصية حوكمة الملكية (CODEOWNERS Recommendation)
- توصية فقط: إضافة/تحديث ملف `CODEOWNERS` لضبط مراجعة المسارات الحرجة.
- هذه التوصية لا تعني أي تغيير تلقائي في إعدادات GitHub.
- يفضل ربط المالكين على الأقل بالمسارات:
  - `CRM/backend/**`
  - `CRM/frontend/**`
  - `ALQASEER-PWA/**`
  - `docs/OPERATIONS/**`

## 11) تصنيف المخاطر (Risk Classification)
- `P0`: أمن/RBAC/تسريب بيانات/كسر visit lifecycle/GPS/offline/export.
- `P1`: Bugs وظيفية، UX سيئ في المسارات الأساسية، أداء ضعيف مؤثر.
- `P2`: تحسينات منخفضة المخاطر أو توثيق/تنسيق.

## 12) المسارات المحمية (Protected DPM Flows)
أي تعديل يمس:
- Start/End visit contracts
- GPS timestamp/accuracy
- Offline queue + dedupe + sync
- Reports + CSV/Excel/PDF
- RBAC endpoint scoping

يجب أن يذكر صراحة:
- السلوك المقصود تغييره.
- اختبارات عدم التراجع.
- خطة rollback/mitigation.
