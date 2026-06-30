# DPM Codex Operating Rules — 2026-06-30

Project: DOPAMINE CRM Suite / dopamine-crm-suite-playground
Status: Active operating rules for Codex/ChatGPT project work.

## 1. Highest operating rule

Omar's highest rule:

```text
هل هذا المنع يمنع كارثة؟ نعم، يبقى.
هل هذا المنع فقط يبطّئنا؟ ينحذف.
```

Do not over-restrict useful tools. Block only catastrophic actions.

## 2. Use the strongest suitable tools

Allowed by default when useful:
- Codex CLI.
- Codex App.
- Codex Remote.
- Developer Mode.
- Computer Use on Windows.
- Browser / Chrome.
- Playwright.
- Plugins.
- MCPs.
- Skills/workflows.
- GitHub/Vercel/Cloudflare/Neon/Supabase tools when they improve evidence or execution.
- Web search for current official-source verification.

Do not write prompts that broadly prohibit Developer Mode, Computer Use, plugins, MCPs, or browser tools. Scope them, but do not disable them by default.

## 3. Developer Mode

Developer Mode is allowed when it helps inspect:
- console errors
- network errors
- CORS
- DOM
- styles
- RTL/dark-mode layout
- page state
- performance
- route/browser evidence

Prefer local/project URLs first. Do not capture or persist cookies/tokens/secrets into reports/logs/screenshots/artifacts.

## 4. Computer Use on Windows

Computer Use is allowed when useful for:
- visible browser/UI workflows
- local app testing
- Windows-local tools
- opening the private local vault when needed
- verifying behavior that CLI/Playwright cannot prove cleanly

It must not leak secrets into repo/docs/_runs/logs/screenshots/ZIP/GitHub/PR/issues/external platforms.

## 5. Plugins/MCP/Skills

Plugins/MCP/Skills are allowed when they shorten work or improve evidence.

Use them for reading/checking/analyzing when useful. Mutating remote services requires an authorization envelope in the prompt.

## 6. Secrets, vault, passwords, tokens

Passwords, tokens, cookies, env values, and vault contents are not forbidden from Omar, ChatGPT, or Codex for local/internal use.

Codex may:
- open/read the private local vault when needed
- use credentials for local authenticated QA
- organize local vault files outside the repo
- show credentials to Omar in the Codex/ChatGPT chat window if Omar explicitly asks

Forbidden:
- copying secrets into repo files
- copying secrets into `docs/_runs`
- copying secrets into reports/logs/JSON/ZIPs/artifacts/screenshots
- putting secrets in GitHub commits, PR comments, issues, Actions logs, or external/public platforms
- publishing vault contents

Preferred vault root:

```text
D:\ALQASEER_DEV\_DPM_PRIVATE_VAULT\
```

Example local private files outside GitHub:
- dpm_crm_local_test_users.md
- dpm_crm_tokens_inventory.md
- dpm_crm_service_accounts.md
- dpm_crm_env_reference.md

## 7. Runtime security boundaries

Forbidden in runtime/product code:
- backdoors
- auth bypasses
- hidden admin routes
- bootstrap/provisioning endpoints
- disabling Auth/RBAC to make tests pass

Allowed when isolated to tests only:
- mocks
- fixtures
- local test helpers
- Playwright login helpers
- local seed/test users

Test-only helpers must not affect runtime or production builds.

## 8. Real product, no fake readiness

Forbidden:
- fake PASS / fake DONE / fake READY
- fake doctors/pharmacies/reps/routes/phones/addresses
- fake or guessed GPS coordinates
- fake production-looking data
- geocoding without trusted source and confidence/status

Allowed:
- clearly labeled demo/test data when needed
- import templates
- aggregate workbook counts
- empty/review states that honestly show missing data

## 9. External mutation authorization envelope

External mutations are not globally forbidden forever. They require explicit scope and success conditions in the prompt.

Examples of external mutation:
- push
- merge
- deploy
- DNS changes
- PR state changes
- production/staging DB mutations
- destructive remote operations

If a prompt includes a clear authorization envelope and success conditions pass, Codex should execute within that scope without repeatedly asking Omar.

If no authorization envelope exists, do not perform external mutation.

Local edits, tests, builds, source updates, run artifacts, and read-only evidence collection are allowed unless the prompt says otherwise.

## 10. Output path discipline

Run outputs must go under:

```text
docs/_runs/run_<YYYYMMDD_HHMMSS>/
```

Also create:

```text
docs/_runs/run_<YYYYMMDD_HHMMSS>.zip
```

Update:

```text
docs/_runs/LATEST.txt
```

Do not write final outputs to repo root, `docs_runs`, `docs/runs`, `reports`, random temp folders, or outside the repo.

## 11. Practical execution principle

Use the direct path:
1. Resolve latest state.
2. Use the strongest suitable tool.
3. Fix or prove the current blocker.
4. Update evidence.
5. Move to the next gate.

Do not create unnecessary gates or extra prompts when the path is clear.
