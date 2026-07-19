# DPM Project Sources Active Index — 2026-06-30

Status: Active source index.

## Active sources

### 1. DPM_PROJECT_CANON_CURRENT_20260630.md
Role: Current product canon and route contracts.
Status: Active.

### 2. DPM_CODEX_OPERATING_RULES_20260630.md
Role: Current Codex/ChatGPT operating rules, tool policy, vault policy, authorization-envelope policy.
Status: Active.

### 3. DPM_CURRENT_STATE_DYNAMIC_POINTER.md
Role: Dynamic latest-run/current-state rule.
Status: Active.

### 4. CODEX_DYNAMIC_STATE_PREFIX.md
Role: Short reusable prefix for future Codex prompts.
Status: Active.

### 5. deep-research-report.md
Role: Product blueprint/reference only. Not a latest-state source.
Status: Keep active as product reference if present.

### 6. DPM_HCPs_CRM_Import_Location_Preparation.xlsx
Role: Customer workbook baseline. Use aggregate counts in reports unless Omar explicitly asks for raw local values.
Status: Keep active if present.

## Superseded/archive-only sources

The following source types are historical only after this refresh unless explicitly revalidated:
- PROJECT_CANON_CURRENT_DOPAMINE_CRM_20260626.md
- DOPAMINE_CRM_QA_BASE_v2_20260625_CORRECTED.md
- PROJECT_CANON_CURRENT.md
- PROJECT_INSTRUCTIONS_CLEAN_CURRENT.md if conflicting with 2026-06-30 rules
- PROJECT_CANON_OPERATING_RULES_DOPAMINE_CRM.md if old policy remains
- duplicated files under docs/project_context/sources/ that contain stale next-gate instructions
- any source with hardcoded latest run names that are no longer latest
- any source with old absolute no-push/no-deploy/no-PR policy not expressed as authorization-envelope policy
- any source with old absolute no-vault-printing policy that conflicts with Omar's explicit local/internal-use rule

Archive old active docs under:

```text
docs/project_context/archive_sources_20260630/
```

Do not delete historical `docs/_runs/run_*` folders or run ZIPs.

## Required active-source behavior

Future prompts should read this index and the dynamic pointer first, then latest run evidence.
