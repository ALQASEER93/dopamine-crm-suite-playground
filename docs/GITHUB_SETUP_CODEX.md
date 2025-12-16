# GitHub setup for Codex CI and reviews

Use these steps to enable the automated Codex CI/review tools on this repository.

## Allow GitHub Actions to create PRs
1. Open **Settings → Actions → General**.
2. Under **Workflow permissions**, select **Allow GitHub Actions to create and approve pull requests** (write permissions), then click **Save**.
3. Ensure branch protection rules permit the bot branch pattern `codex/auto-fix-*` to open PRs back to the source branch.

## Configure secrets
- Add **OPENAI_API_KEY** under **Settings → Secrets and variables → Actions → New repository secret**.
- The key is required for both the Codex Review Bot and the Codex AutoFix workflow.

## Enable Codex Review Bot
- The review workflow runs automatically when a PR is opened.
- To request a manual review, comment **`@codex review`** on the PR.
- The bot posts feedback as a PR comment titled **"🤖 Codex Review Bot"**.

## How Codex uses AGENTS.md
- Codex reads the nearest **AGENTS.md** file relative to each changed file; nested instructions override parent scopes.
- Keep AGENTS files updated to guide automated reviews and fixes across CRM backend, CRM frontend, and ALQASEER-PWA.
