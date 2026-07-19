# DPM Current State Dynamic Pointer — 2026-06-30

Status: Active source. This file prevents stale hardcoded run references.

## Dynamic state rule

Always resolve current truth dynamically:

1. Read:

```text
docs/_runs/LATEST.txt
```

2. Open the referenced latest run folder.
3. Read, if present:
   - report.md
   - master_audit.md
   - CHATGPT_HANDOFF.md
   - commands.md
   - environment_redaction.md
   - json/*.json
   - logs summary
   - artifacts summary
   - screenshots count
4. Read:

```text
docs/_runs/CURRENT_STATE.json
```

if present.

5. Read active project context sources:
   - docs/project_context/DPM_PROJECT_CANON_CURRENT_20260630.md
   - docs/project_context/DPM_CODEX_OPERATING_RULES_20260630.md
   - docs/project_context/PROJECT_SOURCES_ACTIVE_INDEX.md
   - docs/project_context/CODEX_DYNAMIC_STATE_PREFIX.md

## Conflict rule

If the prompt or an old source conflicts with latest run evidence, stop and report:

```text
STATE_MISMATCH
```

Do not blindly follow stale hardcoded run names, old next-gate instructions, or old absolute prohibitions that have been superseded by the 2026-06-30 source refresh.

## Serious run update rule

After each serious run, update:
- docs/_runs/LATEST.txt
- docs/_runs/CURRENT_STATE.md
- docs/_runs/CURRENT_STATE.json
- docs/_runs/RUN_INDEX.md

Do not rewrite historical run evidence.

## Truth hierarchy

1. Latest run evidence from `docs/_runs/LATEST.txt`.
2. Current repo state.
3. Active 2026-06-30 project context sources.
4. Older sources only as historical references.

Old sources are not automatic truth.
