# OWNER_ACTIONS (UI-only)

## Problem observed
- Mobile flow showed: `Error creating pull request ... (400, 9c9c60db3fffe422-AMM)`.
- PR composer may also show: `الملفات الثنائية غير مدعومة` when `.zip` artifacts are included.

## UI-only recovery steps
1. Open GitHub repository in browser and confirm branch exists and has commits ahead of `main`.
2. Go to **Pull requests → New pull request**.
3. Set **base = main** and **compare = work** (or the exact feature branch).
4. If GitHub says there is already an open PR for this head/base pair, open that PR instead of creating a new one.
5. If 400 persists in mobile app, create PR from web UI (desktop mode) and then return to mobile for review/merge.
6. Ensure PR title/body are plain text without very long pasted prompt blocks.
7. If `الملفات الثنائية غير مدعومة` appears, remove `.zip` files from the branch and keep only text artifacts under `docs/_runs/run_<timestamp>/{artifacts,logs,json}/`.

## Merge (UI-only)
1. Wait for required checks to finish.
2. Verify files changed are only under `docs/_runs/`.
3. Merge with **Create a merge commit** (or the repo-default strategy).
