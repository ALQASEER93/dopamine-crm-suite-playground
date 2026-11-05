# Skills and plugins review — 2026-11-05

## Evidence and fit
Repository baseline: 3585c240e39467a8d2b1cf915c41ad42b1031e7e. All six AGENTS.md files reviewed. Manifests/lockfiles, ci.yml, Playwright config, visit authorization/GPS paths, both offline queue paths, and existing test names inspected. This is a scoped setup review, not a complete security audit.

| Candidate | Reviewed immutable revision / file | Decision |
|---|---|---|
| Vercel React Best Practices (official Vercel, MIT, metadata 1.0.0) | vercel-labs/agent-skills@1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62 skills/react-best-practices/SKILL.md | Use compatible ideas in dpm-react-vite; do not import React 19/Next.js rules blindly into React 18/Vite 5. Full upstream scripts/resources were not audited or installed. |
| OpenAI gh-fix-ci | openai/skills@49f948faa9258a0c61caceaf225e179651397431 skills/.curated/gh-fix-ci/SKILL.md | Suitable CI method, but depends on gh CLI, absent here; use connected GitHub log/check tools through dpm-workflow. No installation claim. |
| Anthropic webapp-testing | anthropics/skills@ca45fc496a3436251f191354091d557da31c15b5 skills/webapp-testing/SKILL.md | Defer upstream package: Python helper differs from existing TS runner and blanket networkidle advice conflicts with current Playwright guidance. Referenced helper was not executed/audited. |
| Community FastAPI | full-stack-skills/python-skills@9f82ef5b3340a85fd93c3c5d90d798b5a0985f98 skills/fastapi/SKILL.md | Not an official FastAPI-maintainer skill; brief generic content adds little. Prefer official version-aware docs plus repository-specific dpm-field-quality. |
| Community token-discipline | kitfunso/token-discipline@9722d8279e3b92aca48aadbffd09ea7d89676aed SKILL.md | Already visible and enabled in Cue; no duplicate. Installed package revision not exposed, so exact match to reviewed upstream remains unverified. Do not let early-stop/tool-count rules suppress required checks. |
| dpm-workflow, dpm-react-vite, dpm-field-quality | .agents/skills/*/SKILL.md in this PR | Authored text-only project skills; no executables, network hooks or dependencies. Installation/discovery in each client is a separate verification. |

GitHub, Notion and Context7 were returned by Plugin Management as installed=true, status=ENABLED. GitHub repository and Notion guide reads succeeded. Context7 library retrieval is to be verified separately. No additional broad integrations are necessary for this task; no permission scopes were expanded. This evidence applies to the connected ChatGPT account/session, not all devices.

## Current versions and sources
Manifests target CRM React ^18.2/Vite ^5.4.10; PWA React 18.3.1/Vite ^5.4.21/vite-plugin-pwa ^0.20.5 and Playwright ^1.57.0; backend FastAPI >=0.115.5,<0.116, Pydantic >=2.7,<3, pytest >=8.3,<9.
The current public React reference describes React 19.3 and Vite PWA guide 1.2.0, so current docs are not evidence an API exists in installed versions. Resolve lockfile and installed runtime before changing code.

- https://github.com/vercel-labs/agent-skills/blob/1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62/skills/react-best-practices/SKILL.md
- https://github.com/openai/skills/blob/49f948faa9258a0c61caceaf225e179651397431/skills/.curated/gh-fix-ci/SKILL.md
- https://github.com/anthropics/skills/blob/ca45fc496a3436251f191354091d557da31c15b5/skills/webapp-testing/SKILL.md
- https://fastapi.tiangolo.com/tutorial/testing/
- https://fastapi.tiangolo.com/tutorial/security/
- https://react.dev/reference/react
- https://playwright.dev/docs/best-practices
- https://playwright.dev/docs/api/class-page#page-wait-for-load-state
- https://docs.pytest.org/en/stable/how-to/fixtures.html
- https://vite-pwa-org.netlify.app/guide/
- https://help.manus.im/en/articles/14753565-how-to-share-and-use-skills-in-manus

## Tool provenance and limitations
external_system=GitHub; discovery=repository/files/tree/branch/PR tools; action=read actual repo and publish reviewed skills/docs on branch+PR.
fallback_used=local git clone for local validation/packaging; why_no_mcp=connector does not materialize a local working checkout or ZIP.
external_system=Plugin Management; discovery=search_plugins; action=inspect installation status, avoid duplicates.
external_system=Cue; available connector has no Cue skill management; fallback=desktop UI. Browser inventory exposed Chrome and the current chat browser, no named Work browser. Do not claim Work-browser completion.
external_system=Notion; guide verified separately, private destinations excluded from public repository.
No application behavior, dependency, release gate or CI workflow changes are included in this setup PR. Run evidence and LATEST.txt remain unchanged for this documentation-only task. docs/_runs/REPORT_ROTATION_POLICY.txt referenced by existing docs was absent at baseline.
