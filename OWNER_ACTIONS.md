# Owner Actions: GitHub Settings Configuration

This document provides exact UI-only instructions for configuration and PR fallback actions.
For deployment runbook actions and required production secrets, also follow `docs/OWNER_ACTIONS.md`.

## Prerequisites
- You must have admin or maintainer access to the repository.
- Repository: `https://github.com/ALQASEER93/dopamine-crm-suite-playground.git`

## If GitHub Auto PR Is Not Available (UI-only fallback)
1. Open GitHub repository -> **Pull requests** -> **New pull request**.
2. Set `base` to `main` and `compare` to your working branch (for example `codex/feature-...` or `codex/fix-...`).
3. Use title format: `type(scope): short summary`.
4. Copy the full content from `artifacts/PR_DESCRIPTION.md` into the PR body.
5. Ensure all required checkboxes in `.github/PULL_REQUEST_TEMPLATE.md` are completed before requesting review.
6. Link issue/ticket and add deployment references if applicable.

## Step 1: Verify Workflows Are Enabled
1. Go to repository -> **Actions**.
2. Verify these workflows are enabled:
- `CI`
- `CodeQL`
- `Codex Review Bot` (optional)

## Step 2: Configure Branch Protection Rules
### Option A: Classic Branch Protection
1. Go to **Settings** -> **Branches**.
2. Create/update rule for `main`.
3. Enable **Require status checks to pass before merging**.
4. Require these checks:
- `CI / CRM Backend (FastAPI)`
- `CI / CRM Frontend (Vite/React)`
- `CI / ALQASEER PWA`
- `CodeQL / Analyze (python)`
- `CodeQL / Analyze (javascript)`
5. Remove stale check names and save.

### Option B: GitHub Rulesets
1. Go to **Settings** -> **Rules** -> **Rulesets**.
2. Create/update ruleset for `main`.
3. Add same required status checks listed above.
4. Save ruleset.

## Step 3: Verify Check Name Matching
1. Open PR checks panel.
2. Confirm required checks match exact names shown in PR output.
3. If mismatch exists, update branch protection names exactly.

## Step 4: Test Merge Readiness
1. Wait for all required checks to pass.
2. Attempt merge.
3. If blocked by "Expected" or missing status, fix required-check naming/workflow execution.

## Optional: Merge Queue
1. Enable **Require merge queue** in branch protection if your org uses it.
2. Ensure workflows include merge-group trigger paths.

## Quick checklist
- [ ] Workflows enabled
- [ ] Branch protection/ruleset requires all checks
- [ ] Manual UI PR fallback steps verified
- [ ] PR template and `artifacts/PR_DESCRIPTION.md` used for body content
