# docs/_runs Hygiene Policy

This directory is for local/ephemeral run evidence.

Tracked files only:
- `docs/_runs/README.md`
- `docs/_runs/LATEST.txt`

Ignored and kept untracked:
- `docs/_runs/run_*/`
- `docs/_runs/*.zip`
- `docs/_runs/report.md`
- `docs/_runs/master_audit.md`
- `docs/_runs/size_breakdown.md`

Evidence for PRs should be attached via GitHub Actions artifacts. Local run packs stay on disk and must not be committed.
