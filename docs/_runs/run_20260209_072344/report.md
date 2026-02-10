# Report — Ruleset Guard P0 Fix

## Scope
Fix PR #52 false negatives by making Ruleset Guard evaluate required checks on `TARGET_SHA` and always publish diagnostics.

## What Changed
1. Updated workflow to pass explicit env vars and always publish diagnostics.
- `.github/workflows/ruleset-guard.yml`
- Added env in guard step:
  - `GITHUB_TOKEN: ${{ github.token }}`
  - `TARGET_SHA: ${{ github.sha }}`
- Added always-on summary step (`if: always()`) reading `artifacts/ruleset-guard/summary.md`.
- Added always-on artifact upload (`if: always()`) for `artifacts/ruleset-guard/**`.
- Added required minimal permissions: `contents/actions/checks/pull-requests/administration: read`.

2. Replaced guard script with TARGET_SHA-based evaluator.
- `scripts/ruleset-guard.mjs`
- Reads required checks from GitHub Rulesets API (`includes_parents=true`).
- On Rulesets API `403`, falls back to in-repo JSON without failing solely due to 403.
- Reads check-runs + commit statuses from `commits/{TARGET_SHA}`.
- Always writes:
  - `artifacts/ruleset-guard/report.json`
  - `artifacts/ruleset-guard/summary.md`
- Exit policy:
  - `0` pass
  - `2` required missing/not-success
  - `1` unexpected errors

3. Added fallback required checks list.
- `scripts/ruleset-required-checks.json`

4. Added CodeQL gate with exact required context name.
- `.github/workflows/codeql.yml`
- Added job `codeql-gate` named exactly `CodeQL`, `needs: analyze`, fails if analyze fails.

## Why This Fixes False Negatives
Previous behavior compared against default branch head; this can mismatch PR/merge SHA checks. Now matching is done against `TARGET_SHA` (workflow SHA), which aligns with ruleset-required contexts for the evaluated commit.

## Local Validation
- `node -v` => `v24.12.0`
- Ran `node scripts/ruleset-guard.mjs` with mocked env (`GITHUB_REPOSITORY`, `TARGET_SHA`, dummy token).
- Observed Windows Node runtime assertion in local shell (`uv_handle closing`) with exit code captured in `json/ruleset-guard-local.json`.
- Script still produced artifacts under `artifacts/ruleset-guard/` and were copied into this run at `artifacts/ruleset-guard-local/`.

## How To Verify In GitHub UI
1. Re-run PR workflows on branch `codex/fix-ci-gates`.
2. Open **Ruleset Guard** job:
- Confirm `Run ruleset guard` step uses `TARGET_SHA`.
- Confirm **Publish ruleset-guard summary** runs even on failure.
- Confirm artifact `ruleset-guard-report` exists.
3. Open checks for the PR commit:
- Confirm required checks no longer stuck as `Expected — Waiting...` due to default-branch mismatch.
4. Open CodeQL workflow checks:
- Confirm a check named exactly `CodeQL` is present and follows `analyze` result.

## 403/Fallback Note
Fallback path is implemented and active-by-design for `403` from Rulesets API. Local mocked run did not provide a valid GitHub token to assert real API 403 behavior against GitHub service.
