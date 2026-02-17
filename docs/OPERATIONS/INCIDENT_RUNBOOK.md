# دليل الحوادث (Incident Runbook) — Agents + MCP + Apps

## 1) أنواع الحوادث (Incident Types)
1. CI/PR incident (فشل checks).
2. Runtime regression (backend/frontend/PWA).
3. Production/deployment incident.

## 2) فرز أولي سريع (Immediate Triage)
- افتح `Hotfix Thread` مستقل.
- حدّد `risk_class` (`P0` أو `P1`).
- ثبّت النطاق على أصغر إصلاح آمن.
- عيّن ownership split عند العمل متعدد المسارات.

## 3) توزيع الملكية القياسي (Standard Ownership Split)
- Backend lane: API/errors/RBAC/database.
- Frontend lane: web UI regressions.
- PWA lane: offline queue/SW/mobile flow.
- Verification lane: reproduction + validation.

## 4) سير عمل CI incident
1. افحص checks عبر GitHub app/MCP.
2. فعّل `gh-fix-ci` عند الملاءمة.
3. ابنِ minimal fix plan.
4. طبّق أصغر change set آمن.
5. أعد تشغيل checks المتأثرة.
6. انشر الأدلة داخل PR.

## 5) سير عمل Production/Deploy incident
1. حدّد البيئة (`preview` أو `production`).
2. افحص logs/status عبر منصة النشر.
3. أرسل تحديثًا مختصرًا عبر Slack app.
4. حدّث ticket الحالة (Linear/GitHub) عند الحاجة.
5. جهّز rollback/mitigation path.

## 6) التعامل مع المسارات المحمية (Visits/GPS/Offline)
عند لمس protected flows، يلزم توثيق regression checks لـ:
- Visit Start/End
- GPS timestamp/accuracy
- Offline queue/sync + dedupe

## 7) حوكمة الحادث (Governance Controls)
- أي release-related gate يبقى `APPROVE_RELEASE=NO` حتى موافقة المالك.
- أي `OWNER_ACTIONS` تُنفذ عبر UI فقط.
- لا تعليمات shell يدوية للمستخدم ضمن إجراءات الحادث.

## 8) قالب الأدلة (Evidence Template)
- `incident_id`:
- `thread_id`:
- `risk_class`:
- `impact_summary`:
- `affected_paths`:
- `root_cause`:
- `fix_summary`:
- `tests_run`:
- `manual_checks`:
- `residual_risk`:
- `followup_actions`:

## 9) معايير الإغلاق (Exit Criteria)
يُغلق الحادث فقط عند:
- توقف إعادة الإنتاج عن الفشل.
- مرور الاختبارات المطلوبة.
- توثيق manual checks للمسارات المحمية عند الصلة.
- إرسال تحديث stakeholders عبر القناة المناسبة.

## 10) ما بعد الحادث (Post-Incident)
- إضافة preventive task في backlog.
- تحديث playbook/checklist إذا ظهر gap تشغيلي.
