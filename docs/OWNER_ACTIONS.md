# OWNER_ACTIONS (Field-Ready Deploy + PR Fallback)

## Required UI-only actions
1. In Vercel, create/import the project for `ALQASEER-PWA`.
2. In GitHub repo settings -> Secrets and variables -> Actions, add:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
3. Re-run workflow `Field-Ready Deploy` manually (`workflow_dispatch`) for first production publish.

## Automated path (recommended)
Use this script to minimize manual work:
1. Copy `scripts/owner_actions.env.example` to `scripts/owner_actions.env` and fill values.
2. Run:
   - `pwsh -File scripts/owner_actions_automate.ps1 -ApplyGithubSecrets -TriggerCloudflareDeploy -TriggerFieldReadyDeploy`
3. The script will:
   - set GitHub Actions secrets automatically
   - list current secrets
   - trigger deploy workflows

## If auto PR creation is not possible (UI-only)
1. Open GitHub -> Pull requests -> New pull request.
2. Select `base: main` and `compare: <your branch>`.
3. Paste content from `artifacts/PR_DESCRIPTION.md` as the PR body.
4. Confirm all template checklist items are completed.
5. Submit PR and request required reviewers.

## Optional actions
- Configure custom domain for Jordan-wide access.
- Add environment variables in Vercel project settings (`VITE_API_BASE_URL` etc.).
