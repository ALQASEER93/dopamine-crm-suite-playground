# قالب ميثاق المسار (Thread Charter Template)

استخدم هذا الميثاق لأي مهمة متوسطة/كبيرة قبل التنفيذ.

## بيانات المسار (Thread Metadata)
- `thread_id`:
- `thread_type`: (`feature` | `bugfix` | `hotfix` | `investigation`)
- `branch`:
- `owner`:
- `created_at`:

## الهدف (Objective)
- هدف قابل للقياس بجملة واحدة.

## النطاق (Scope)
- `in_scope`:
- `out_of_scope`:

## القيود (Constraints)
- مسارات `AGENTS.md` ذات الصلة:
- Must-not-regress flows:
- قيود تقنية (API contracts, ports, env expectations):

## المخاطر والأولوية (Risk + Priority)
- `risk_class`: (`P0` | `P1` | `P2`)
- سبب التصنيف:

## خريطة التأثير (Impact Map)
- `affected_paths`:
- `public_interfaces_changed` (if any):
- `data_model_or_migration` (if any):

## خطة الملكية (Ownership Plan)
- Use sub-agents? (`yes/no`)
- إذا نعم: روابط ownership contracts

## خطة MCP/التطبيقات (Apps Plan)
- External systems required:
- MCP search queries to run:
- Selected tools/apps:
- Fallback if unavailable:

## خطة المهارات (Skills Plan)
- Skills to trigger and why:

## خطة التحقق (Validation Plan)
- Required test commands:
- Manual validation scenarios:
- Acceptance criteria:

## خطة أدلة PR (PR Evidence Plan)
- Summary format:
- Evidence format (tests/screenshots/logs):
- Residual risk section:

## حوكمة الإطلاق (Release Governance)
- `APPROVE_RELEASE` default state: `NO`
- `OWNER_ACTIONS` required? (yes/no + UI system)
- Manual shell commands requested from user: `NO`

## تعريف الإنهاء (Done Definition)
- الشروط التي يجب تحققها قبل الإغلاق.
