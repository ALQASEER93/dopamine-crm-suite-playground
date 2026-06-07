# Phase 0 Guard Scripts

These guard scripts are staged inside the run folder only because the current continuation forbids new or modified files outside `docs/_runs/run_20260602_053602/` except `.gitignore`.

Install destination proposed for a later owner-approved step: `scripts/dpm/`.

Safe checks used in this run:
- `node --check <script>`
- `node evidence-pack-structure-check.cjs <run-folder>`
- `node no-secrets-artifact-scan.cjs <run-folder>`
- `node command-center-diff-guard.cjs <repo> <run-folder>`
