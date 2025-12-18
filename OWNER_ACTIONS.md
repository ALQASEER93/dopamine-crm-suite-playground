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

### ⚠️ CRITICAL: Current Situation

**PR #8, #3, #5 are BLOCKED** because:
- Ruleset `protect-main` exists but requires checks that don't match actual workflow outputs
- Check names in workflows are: `CRM Backend (FastAPI)`, `CRM Frontend (Vite/React)`, `ALQASEER PWA` (NO "CI /" prefix)
- CodeQL checks don't exist yet (workflow only in PR branch, not merged to main)

### Option A: Using GitHub Rulesets (Current Setup)

1. Go to **Settings** → **Rules** → **Rulesets**
2. Find the `protect-main` ruleset
3. Click **Edit**
4. Under **"Status checks"** section:
   - **REMOVE** any existing required checks (especially ones showing in gray/stale)
   - **ADD** these EXACT check names (as shown on PR #8):
     - ✅ `CRM Backend (FastAPI)`
     - ✅ `CRM Frontend (Vite/React)`
     - ✅ `ALQASEER PWA`
5. **DO NOT** require CodeQL checks yet (they don't exist until PR #8 merges)
6. **If "Require code quality results" is enabled**: 
   - Either **DISABLE** it temporarily, OR
   - Wait for PR #8 to merge (CodeQL workflow will then exist on main)
7. Click **"Save changes"**

### Option B: Using Classic Branch Protection (Alternative)

1. Go to **Settings** → **Branches**
2. Under **Branch protection rules**, find or create a rule for `main`
3. Enable **"Require status checks to pass before merging"**
4. Under **"Status checks that are required"**, check these boxes (EXACT names from PR #8):

   ✅ **CRM Backend (FastAPI)**  
   ✅ **CRM Frontend (Vite/React)**  
   ✅ **ALQASEER PWA**

5. **Important**: Uncheck any old/stale checks (they will show in gray)
6. **DO NOT** check CodeQL checks yet (they don't exist until PR #8 merges)
7. Click **"Save changes"**

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

**⚠️ IMPORTANT**: Use the EXACT check names as shown on PR #8:

```
CRM Backend (FastAPI)
CRM Frontend (Vite/React)
ALQASEER PWA
```

**Note**: CodeQL checks will appear AFTER PR #8 is merged (CodeQL workflow is only in the PR branch currently).

After PR #8 merges, you may optionally add:
```
CodeQL / Analyze (python)
CodeQL / Analyze (javascript)
```

But these are NOT required to unblock PR #8.

---

**End of Owner Actions Guide**

