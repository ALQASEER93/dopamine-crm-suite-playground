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

**PR #8 ✅ MERGED** (completed 2025-12-19)

**PR #3 and #5 are BLOCKED** because:
- Ruleset `protect-main` requires check names with "CI/" prefix, but actual checks have NO prefix
- **Required by Ruleset**: `CI/CRM Backend (FastAPI)`, `CI/CRM Frontend (Vite/React)`, `CI/ALQASEER PWA`, `Vercel`
- **Actual check names**: `CRM Backend (FastAPI)`, `CRM Frontend (Vite/React)`, `ALQASEER PWA`, `Vercel` (context: "Vercel")
- **"Require branches to be up to date"** is ON - PRs may be out-of-date with main

### Option A: Using GitHub Rulesets (Current Setup)

1. Go to **Settings** → **Rules** → **Rulesets**
2. Find the `protect-main` ruleset
3. Click **Edit**
4. Under **"Status checks"** section:
   - **REMOVE** all existing required checks (especially `CI/CRM Backend (FastAPI)`, `CI/CRM Frontend (Vite/React)`, `CI/ALQASEER PWA`)
   - **ADD** these EXACT check names (as shown on PR #3/#5):
     - ✅ `CRM Backend (FastAPI)` (NO "CI/" prefix)
     - ✅ `CRM Frontend (Vite/React)` (NO "CI/" prefix)
     - ✅ `ALQASEER PWA` (NO "CI/" prefix)
   - **For Vercel**: 
     - If you want to require Vercel, use context: `Vercel` (not name)
     - **Recommendation**: Remove Vercel from required checks (it's a deployment check, not a CI check)
5. **"Require branches to be up to date"**: 
   - **Recommendation**: Keep it ON (ensures PRs are rebased/merged with latest main)
   - If PRs are blocked due to out-of-date, they need to be updated (see Step 3)
6. **If "Require code quality results" is enabled**: 
   - **DISABLE** it (CodeQL checks may not appear on all PRs)
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

## Step 3: Update Out-of-Date PRs

If PRs are blocked due to "Require branches to be up to date":

### For PR #3:
```bash
# Check if PR #3 branch is out-of-date
gh pr view 3 --json headRefName,baseRefName

# Update PR #3 branch (if needed)
git fetch origin
git checkout codex/implement-crm-mvp-to-100%
git merge origin/main
# OR: git rebase origin/main
git push origin codex/implement-crm-mvp-to-100%
```

### For PR #5:
```bash
# Check if PR #5 branch is out-of-date
gh pr view 5 --json headRefName,baseRefName

# Update PR #5 branch (if needed)
git fetch origin
git checkout <PR-5-branch-name>
git merge origin/main
# OR: git rebase origin/main
git push origin <PR-5-branch-name>
```

**After updating branches**, checks will re-run automatically.

## Step 4: Verify Check Names Match

After fixing ruleset, verify check names in PR #3 or #5:

1. Open the PR
2. Scroll to **"Checks"** section
3. Verify you see these exact names:
   - `CRM Backend (FastAPI)` (NO "CI/" prefix)
   - `CRM Frontend (Vite/React)` (NO "CI/" prefix)
   - `ALQASEER PWA` (NO "CI/" prefix)
   - `Vercel` (optional, context: "Vercel")

**If check names don't match**, update branch protection rules to use the exact names shown in the PR.

---

## Step 5: Test Merge Readiness

1. After fixing ruleset, refresh PR #3 or #5
2. Wait for all checks to complete (should show ✅ green)
3. Check merge status:
   ```bash
   gh pr view 3 --json mergeStateStatus,mergeable
   gh pr view 5 --json mergeStateStatus,mergeable
   ```
4. **Expected**: `mergeStateStatus` should be `CLEAN` or `UNSTABLE` (not `BLOCKED`)
5. **If still blocked**: Check the error message:
   - **"Expected — Waiting for status to be reported"** → A required check name doesn't match; update branch protection rules
   - **"Required status check is missing"** → The workflow didn't run; check Actions tab for errors
   - **"Branch is out of date"** → Update PR branch (see Step 3)

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

**⚠️ CRITICAL**: Use the EXACT check names as shown on PR #3/#5 (NOT with "CI/" prefix):

```
CRM Backend (FastAPI)
CRM Frontend (Vite/React)
ALQASEER PWA
```

**DO NOT use** (these are WRONG):
```
CI/CRM Backend (FastAPI)  ❌
CI/CRM Frontend (Vite/React)  ❌
CI/ALQASEER PWA  ❌
```

**Vercel** (optional):
- Context: `Vercel`
- **Recommendation**: Remove from required checks (deployment check, not CI)

**CodeQL** (optional, after PR #8 merged):
- `CodeQL / Analyze (python)`
- `CodeQL / Analyze (javascript)`
- These may not appear on all PRs, so don't require them

---

**End of Owner Actions Guide**

