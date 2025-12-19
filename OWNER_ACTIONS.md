# Owner Actions: GitHub Settings Configuration

This document provides **exact step-by-step instructions** for configuring GitHub branch protection and required checks to unblock PR merges.

---

## Prerequisites

- You must have **admin access** to the repository
- Repository: `https://github.com/ALQASEER93/dopamine-crm-suite-playground.git`

---

## Step 1: Verify Workflows Are Enabled

1. Go to your repository on GitHub
2. Click **Actions** tab
3. Verify these workflows are **enabled** (green toggle):
   - ✅ `CI`
   - ✅ `CodeQL`
   - ✅ `Codex Review Bot` (optional, but recommended)

If any are disabled, click the workflow name → click **"..." menu** → **"Enable workflow"**

---

## Step 2: Configure Branch Protection Rules

### Option A: Using Classic Branch Protection (Recommended)

1. Go to **Settings** → **Branches**
2. Under **Branch protection rules**, find or create a rule for `main`
3. Enable **"Require status checks to pass before merging"**
4. Under **"Status checks that are required"**, check these boxes:

   ✅ **CI / CRM Backend (FastAPI)**  
   ✅ **CI / CRM Frontend (Vite/React)**  
   ✅ **CI / ALQASEER PWA**  
   ✅ **CodeQL / Analyze (python)**  
   ✅ **CodeQL / Analyze (javascript)**

5. **Important**: Uncheck any old/stale checks that no longer appear in recent PRs (they will show in gray)
6. Click **"Save changes"**

### Option B: Using GitHub Rulesets (If Enabled)

1. Go to **Settings** → **Rules** → **Rulesets**
2. Find or create a ruleset for `main` branch
3. Under **"Status checks"** or **"Code scanning"** section:
   - Add rule for: `CI / CRM Backend (FastAPI)`
   - Add rule for: `CI / CRM Frontend (Vite/React)`
   - Add rule for: `CI / ALQASEER PWA`
   - Add rule for: `CodeQL / Analyze (python)`
   - Add rule for: `CodeQL / Analyze (javascript)`
4. Remove any old/stale check names that don't match current workflow outputs
5. Save the ruleset

---

## Step 3: Verify Check Names Match

After pushing a PR from `cursor/audit-stabilize` → `main`, verify the check names in the PR:

1. Open the PR
2. Scroll to **"Checks"** section
3. Verify you see these exact names:
   - `CI / CRM Backend (FastAPI)`
   - `CI / CRM Frontend (Vite/React)`
   - `CI / ALQASEER PWA`
   - `CodeQL / Analyze (python)`
   - `CodeQL / Analyze (javascript)`

**If check names don't match**, update branch protection rules to use the exact names shown in the PR.

---

## Step 4: Test Merge Readiness

1. Create a test PR (or use `cursor/audit-stabilize` PR)
2. Wait for all checks to complete (should show ✅ green)
3. Try to merge the PR
4. **Expected**: PR should merge successfully if all checks pass
5. **If blocked**: Check the error message:
   - **"Expected — Waiting for status to be reported"** → A required check name doesn't match; update branch protection rules
   - **"Required status check is missing"** → The workflow didn't run; check Actions tab for errors

---

## Step 5: Merge Queue (Optional)

If you use GitHub Merge Queue:

1. Go to **Settings** → **Branches** → **Branch protection rules** → `main`
2. Enable **"Require merge queue"**
3. The `merge_group` triggers added to workflows will ensure checks run in merge queue

**Note**: Merge queue is optional; PRs will merge normally without it if all checks pass.

---

## Troubleshooting

### Problem: "Expected — Waiting for status to be reported"

**Cause**: Branch protection requires a check name that doesn't match workflow output.

**Solution**:
1. Open a recent PR and note the **exact check names** shown
2. Go to branch protection rules
3. Remove the mismatched check name
4. Add the correct check name from the PR

### Problem: Checks don't run on PR

**Cause**: Workflow may be disabled or has syntax errors.

**Solution**:
1. Go to **Actions** tab
2. Check if workflow ran (look for failed/errored runs)
3. If workflow didn't run, check workflow file syntax
4. Enable workflow if disabled

### Problem: CodeQL checks don't appear

**Cause**: CodeQL may need initial setup or permissions.

**Solution**:
1. Go to **Security** → **Code scanning**
2. Verify CodeQL is set up (may require initial run)
3. Check workflow permissions in `.github/workflows/codeql.yml` (should have `security-events: write`)

---

## Checklist

Before marking this complete, verify:

- [ ] All workflows are enabled in Actions tab
- [ ] Branch protection rules require the 5 checks listed above
- [ ] Test PR shows all checks passing
- [ ] PR can be merged when checks pass
- [ ] No "Expected — Waiting for status" errors

---

## Quick Reference: Required Check Names

Copy-paste these exact names into branch protection:

```
CI / CRM Backend (FastAPI)
CI / CRM Frontend (Vite/React)
CI / ALQASEER PWA
CodeQL / Analyze (python)
CodeQL / Analyze (javascript)
```

---

**End of Owner Actions Guide**

