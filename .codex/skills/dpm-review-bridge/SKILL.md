# DPM Review Bridge Skill

Use this skill for every meaningful DOPAMINE CRM Suite run that needs Omar-to-ChatGPT handoff evidence.

## Purpose

Create a reliable evidence bridge so Codex can generate changes, GitHub Actions can package review evidence, and Omar can send one block to ChatGPT from iPhone without manually uploading local files.

## Non-negotiable project rules

- Keep all generated reports/logs/json/artifacts under `docs/_runs/run_<YYYYMMDD_HHMMSS>/`.
- Keep generated ZIP files under `docs/_runs/run_<YYYYMMDD_HHMMSS>.zip`.
- Do not commit generated `docs/_runs` run folders or ZIPs.
- Do not write generated outputs to root, `docs_runs/`, `reports/`, Desktop, Google Drive, OneDrive, or external paths.
- Do not expose secrets, tokens, env values, cookies, passwords, API keys, private credentials, storage state, or auth material.
- Do not deploy, change DNS, touch `www.dopaminepharma.com`, merge, or mark a PR ready unless the active task explicitly asks for it.
- Do not create provisioning endpoints, backdoors, hidden admin paths, or auth bypasses.

## Required handoff files

Every review run should create:

- `report.md`
- `master_audit.md` when applicable
- `size_breakdown.md` when applicable
- `CHATGPT_HANDOFF.md`
- `json/chatgpt_handoff.json`
- `logs/`
- `artifacts/`
- `artifacts/screenshots/` when screenshots are available
- `docs/_runs/run_<timestamp>.zip`

## Preferred automated path

1. Make code/config/doc changes on the active branch.
2. Use `scripts/dpm/create-review-bridge-bundle.mjs` to create local evidence.
3. Ensure generated `docs/_runs` outputs are ignored and not staged.
4. Push source/config/doc changes only.
5. Let CI or `DPM Review Bridge` create the cloud artifact.
6. Ensure one PR comment is posted or updated using marker:

```html
<!-- DPM_REVIEW_BRIDGE -->
```

7. End with the exact copy block Omar can send to ChatGPT:

```text
=== SEND THIS TO CHATGPT ===
راجع DPM Review Bridge:
Repo: ALQASEER93/dopamine-crm-suite-playground
PR: <PR_NUMBER>
Run ID: <RUN_ID>
Verdict: <PASS/WARNING/BLOCKED>
Commit: <COMMIT_SHA>
Workflow Run: <WORKFLOW_RUN_URL_OR_PENDING>
Artifact: <ARTIFACT_NAME_OR_PENDING>
Artifact ID: <ARTIFACT_ID_OR_UNAVAILABLE>
```

## Verdict rules

- `PASS`: real GitHub Actions run exists, artifact is uploaded, and a PR marker comment exists.
- `WARNING`: local bundle exists or workflow code is ready, but cloud run/artifact/comment is pending or blocked by GitHub UI settings.
- `BLOCKED`: evidence cannot be generated safely, secrets are detected, or permissions prevent all viable paths.

## Evidence quality bar

- Include exact commands and whether they passed, failed, or were skipped.
- Include changed files grouped by backend/frontend/PWA/docs/scripts/workflows/tests.
- Include artifact and log paths.
- Include clear risks and owner actions.
- Never claim a route, deploy, or artifact works without proof.
