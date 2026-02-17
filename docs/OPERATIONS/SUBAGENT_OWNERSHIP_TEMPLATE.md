# قالب ملكية Sub-agent (Sub-agent Ownership Template)

استخدم قسمًا مستقلاً لكل sub-agent. هذا القالب إلزامي عندما يمتد الـ thread عبر أكثر من مساحة.

## رأس المهمة (Task Header)
- `thread_id`:
- `branch`:
- `coordinator_agent`:
- `coordination_date`:

## العقود المشتركة (Shared Contracts)
- API contracts locked:
- Shared DTO/schema references:
- Merge order:

## عقد Sub-agent
- `agent_name`:
- `mission`:
- `owned_paths`:
- `non_owned_paths`:
- `deliverables`:
- `verification_commands`:
- `handoff_to`:
- `blockers_escalation_rule`:

## تقسيم أساس مقترح (Recommended Baseline Split)
1. Backend agent
- owned: `CRM/backend/**`
- deliverables: endpoints/schemas/tests/RBAC checks

2. Frontend agent
- owned: `CRM/frontend/**`
- deliverables: UI integration/tests/build-safe changes

3. PWA agent
- owned: `ALQASEER-PWA/**`
- deliverables: offline queue/sync/service-worker-safe updates

4. QA/Verification agent
- owned: أدلة التحقق وسجلات الاختبار
- deliverables: regression matrix + release confidence note

## حوكمة إضافية (Governance Addendum)
- أي عنصر خارج الملكية يُرفع كبند `OWNER_ACTIONS`.
- `OWNER_ACTIONS` تنفذ UI-only بواسطة المالك المعتمد.
- لا أوامر shell يدوية مطلوبة من المستخدم.

## سجل التسليم (Handoff Record)
- `from_agent`:
- `to_agent`:
- `what_changed`:
- `contracts_verified`:
- `open_issues`:
