# AUDIT_WORKFLOW

Target workflow: `.github/workflows/field-ready-deploy-cloudflare.yml`

## Acceptance audit

1. Required secrets only (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`): PASS
- Evidence: lines 19-20, 25, 33.

2. `CLOUDFLARE_PROJECT_NAME` optional fallback to repo name: PASS
- Evidence: line 21 (optional env source), lines 37-43 (fallback to `${GITHUB_REPOSITORY##*/}` and export).

3. Ensure/create Pages project with `--production-branch main`: PASS
- Evidence: lines 83-88 (`pages project list` then create with `--production-branch main`).

4. Deploy uses `wrangler pages deploy` to branch `main`: PASS
- Evidence: line 103 (`wrangler@4 pages deploy ... --branch "main"`).

5. Smoke `/` + `/login` and write HTTP codes + Deploy URL to `GITHUB_STEP_SUMMARY`: PASS
- Evidence: lines 118-121 (URLs and HTTP codes), lines 143-149 (summary includes URL + HTTP codes).

6. Upload deploy/smoke logs as GitHub Actions artifacts: PASS
- Evidence: lines 151-160 (`actions/upload-artifact@v4` with `project-ensure.log`, `deploy.log`, `smoke.log`).

## GitHub Actions deployment evidence status
- Deploy URL from an actual workflow run: غير مذكور
  - Required proof file/log: GitHub Actions job log for `Deploy to Cloudflare Pages` step showing resulting URL.
- Smoke HTTP results from an actual workflow run: غير مذكور
  - Required proof file/log: GitHub Actions job log + uploaded `smoke.log` artifact from same run.

## Previous run audit context
- Source audited: `docs/_runs/LATEST.txt` => `run_20260212_155847`
- Last run already stated no live deploy execution (`APPROVE_RELEASE=NO`), therefore deploy/smoke runtime evidence remained unavailable.
