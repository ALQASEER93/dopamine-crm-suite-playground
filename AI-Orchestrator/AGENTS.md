# Repository Guidelines

## Project Structure & Module Organization
- Root orchestrator (Python): `main.py`, `agents.py`, `tools.py`, `task.md`, `.env` (never commit secrets). Generated CRM assets are written under `D:/CRM ALQASEER` via `SafeFileWriteTool`.
- Node/TypeScript utilities: `src/` (e.g., `dailyMonitor.ts`) with supporting configs in `tsconfig.json` and manifests `package.json`/`package-lock.json`.
- Operational scripts: `scripts/`; outputs: `logs/` and `REPORTS/` (treat as generated, do not commit). Workspace settings in `.vscode/`.

## Build, Test, and Development Commands
- Install Node deps: `npm install` (run at repo root).
- Run monitors: `npm run monitor` or `npm run daily:monitor` (executes `src/dailyMonitor.ts` via ts-node).
- Python setup: `python -m venv venv && .\venv\Scripts\activate`; install deps (e.g., `pip install crewai crewai-tools langchain-openai python-dotenv langchain`).
- Launch crew orchestrator: `python main.py` (reads `task.md` as the work order and uses `.env`).

## Coding Style & Naming Conventions
- TypeScript/JS: 2-space indent; camelCase for variables/functions; PascalCase for classes; keep modules single-purpose and typed where practical.
- Python: follow PEP 8; use type hints on public functions; keep tools/agents explicit and small. Paths passed to `SafeFileWriteTool` must be relative to `D:/CRM ALQASEER` (e.g., `CRM/backend/main.py`).
- Configuration: do not hardcode secrets; load via `.env`/environment variables.

## Testing Guidelines
- No default test script yet. Add unit tests under `src/tests` or `src/__tests__` using `vitest`/`jest`; name files `*.test.ts`.
- For Python flows, add smoke tests that load `.env`, parse `task.md`, and validate path guards without touching external services.
- Prioritize deterministic coverage for alert logic and file-writing safety before adding integrations.

## Commit & Pull Request Guidelines
- Commits: imperative, scoped subjects (e.g., `Add alert throttling`, `Harden file write guard`). Avoid mixing refactors with fixes.
- PRs: include summary, risk/impact, and manual test notes (commands and outcomes). Link issues/tasks; attach relevant logs or screenshots for monitor/crew output. Keep diffs focused and reviewable.

## Security & Configuration Tips
- Never commit `.env` or credentials; rotate keys if exposed. Verify all file writes stay within `D:/CRM ALQASEER`.
- Prefer stable dependency versions; when changing dependencies, test in a clean `venv`/`node_modules` to surface conflicts early.
