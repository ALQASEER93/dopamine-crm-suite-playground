# Codex Dynamic State Prefix — DOPAMINE CRM

Before executing any DOPAMINE CRM task:

1. Read:
   - docs/project_context/DPM_CURRENT_STATE_DYNAMIC_POINTER.md
   - docs/project_context/DPM_PROJECT_CANON_CURRENT_20260630.md
   - docs/project_context/DPM_CODEX_OPERATING_RULES_20260630.md
   - docs/project_context/PROJECT_SOURCES_ACTIVE_INDEX.md

2. Resolve latest evidence dynamically from:

```text
docs/_runs/LATEST.txt
```

Then open the referenced latest run folder and read report/master_audit/CHATGPT_HANDOFF/json/*.json where present.

3. Do not trust hardcoded latest-run names in old prompts or old sources.

4. Use the strongest suitable tools for the task, including Codex CLI, Developer Mode, Computer Use, Browser/Chrome, Playwright, plugins, MCPs, Skills, and relevant service tools when useful.

5. Block only catastrophic actions:
   - secret leakage into repo/docs/_runs/logs/screenshots/ZIP/GitHub/PR/issues/external platforms
   - runtime backdoors/auth bypasses
   - fake data/fake GPS/fake PASS
   - destructive external mutation outside an authorization envelope

6. If the prompt conflicts with latest run evidence or active 2026-06-30 sources, stop with:

```text
STATE_MISMATCH
```

7. After every serious run, update LATEST.txt, CURRENT_STATE.md/json, and RUN_INDEX.md.
