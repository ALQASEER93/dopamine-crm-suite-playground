# FULL_AUTO_PIPELINE_v3

## Overview
- One-button local flow: `scripts/run_full_auto.ps1`.
- Gates-only mode: `scripts/run_gates.ps1` (uses resolved Python).
- Retry policy: up to 3 attempts per gate.
- Evidence contract: all run artifacts and logs are written under `docs/_runs/run_<YYYYMMDD_HHMMSS>/` and a zip at `docs/_runs/run_<YYYYMMDD_HHMMSS>.zip`.
- Output fencing: no other paths may receive generated output.

## One-Button Local Flow
1. Create run folder under `docs/_runs/run_<ts>/{artifacts,logs,json}` and update `docs/_runs/LATEST.txt`.
2. Capture git state and stash dirty working tree as `pre_full_auto_<ts>`.
3. Extract CI truths from `.github/workflows/ci.yml` via `scripts/ci_extract.ps1`.
4. Generate delta vs `origin/main`, patch diff, and size breakdown.
5. Run gates using `scripts/run_gates.ps1` with a max of 3 retries per gate.
6. Produce evidence bundle (STATE + CI_TRUTHS + DELTA + GATES + gate log tail).
7. Write handoff prompts and report.
8. Zip the run folder.

## Gates-Only Mode
- `scripts/run_gates.ps1` reads CI truths JSON and executes run steps using the resolved Python command.
- Gate logs are written to `docs/_runs/run_<ts>/logs/gate_<job>.log`.

## Security Note: workflow_run
- The auto-fix workflow must not run on PR contexts.
- Guard `workflow_run` by requiring `event == push` and `head_branch == main`.
- This avoids escalation and artifact-poisoning risks.
