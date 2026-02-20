# Codex + PowerShell Troubleshooting

This guide covers common Codex CLI and PowerShell issues on Windows.

## 1) unexpected argument --ask-for-approval

Root cause: The `--ask-for-approval` flag must be placed before `exec`. Passing it after `exec` makes it a positional argument.

Fix: Put global flags before `exec`.

```powershell
codex --ask-for-approval never --enable multi_agent --enable apps exec `
  --cd "D:\ALQASEER_DEV\dopamine-crm-suite_PLAYGROUND" `
  --sandbox workspace-write `
  --config sandbox_workspace_write.network_access=true `
@"
Your instructions here.
"@
```

## 2) Sandbox falling back to read-only

Root cause: Sandbox defaults or missing flags can force read-only mode.

Fix: Explicitly set workspace write and (if needed) network access.

```powershell
codex --ask-for-approval never --enable multi_agent --enable apps exec `
  --cd "D:\ALQASEER_DEV\dopamine-crm-suite_PLAYGROUND" `
  --sandbox workspace-write `
  --config sandbox_workspace_write.network_access=true `
@"
Your instructions here.
"@
```

## 3) PowerShell quoting for git refs like @{u} and stash@{0}

Root cause: PowerShell treats `@{}` as a hashtable literal.

Fix: Use single quotes or the stop-parsing operator.

```powershell
git rev-parse '@{u}'
git stash show 'stash@{0}'

# Alternative: stop-parsing operator
git rev-parse --% @{u}
git stash show --% stash@{0}
```

## 4) Wrong script path calls (root vs scripts/)

Root cause: Calling scripts with the wrong working directory.

Fix: Use explicit relative paths from repo root, or confirm your location.

```powershell
Get-Location

# From repo root
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\RUN_SMOKE_LOCAL.ps1

# From a subfolder (example: CRM\frontend)
powershell -NoProfile -ExecutionPolicy Bypass -File ..\..\scripts\RUN_SMOKE_LOCAL.ps1
```

## 5) `collab` is deprecated

Root cause: The old `collab` feature flag is deprecated in recent Codex builds.

Fix: Use `multi_agent` instead, either per command or in `config.toml`.

```powershell
# Per command
codex --enable multi_agent exec @"
Your instructions here.
"@
```

```toml
# config.toml
[features]
multi_agent = true
```

## Canonical Command Templates (PowerShell)

```powershell
# Run a Codex task with workspace write + network enabled
codex --ask-for-approval never --enable multi_agent --enable apps exec `
  --cd "D:\ALQASEER_DEV\dopamine-crm-suite_PLAYGROUND" `
  --sandbox workspace-write `
  --config sandbox_workspace_write.network_access=true `
@"
Your instructions here.
"@

# List PRs
gh pr list --state open

# Enable auto-merge (squash + delete branch)
gh pr merge <PR_NUMBER> --auto --squash --delete-branch

# Close PR with comment
gh pr close <PR_NUMBER> --comment "Superseded by newer integrated work on main."
```
