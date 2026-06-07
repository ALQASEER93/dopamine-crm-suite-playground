---
name: dpm-route-screenshot-proof
description: Plan route screenshot evidence for account, customers, visits, route, live-map, reports, and visit session paths.
---

# dpm-route-screenshot-proof

## Purpose
Plan route screenshot evidence for account, customers, visits, route, live-map, reports, and visit session paths.

## When To Use
- Use during DPM governance, audit, planning, or evidence-pack work.
- Use before changing product code when the task touches Visits, GPS, Offline/PWA, Arabic RTL UI, Figma, security, deploy safety, reports/exports, or real customer data.

## Inputs Required
- Current repo path.
- Current branch and git status.
- Relevant prompt or owner request.
- Existing run folder under `docs/_runs/run_<timestamp>/`.
- Any owner-provided screenshots, Figma links, or aggregate data profiles.

## Files To Inspect
- `ALQASEER-PWA/src/pwa/App.tsx`
- `CRM/frontend/src/App.jsx`

## Safe Commands / Checks
- `git status --branch --short --untracked-files=all`
- Read-only file inspection with `rg`, `Get-Content`, or equivalent.
- Write evidence only to the active `docs/_runs/run_<timestamp>/` folder.

## Output Format
- Markdown summary with PASS / WARNING / BLOCKED.
- JSON evidence when structured facts are needed.
- Include exact files inspected and checks run.

## PASS Criteria
- Required evidence exists.
- No deploy, push, merge, DNS mutation, secret exposure, real-data import, or product-code modification occurred.
- Findings are repo-grounded and cite local paths.

## WARNING Criteria
- Useful evidence exists but owner approval, Figma access, real device proof, or browser/build validation remains missing.

## BLOCKED Criteria
- Required files cannot be read.
- The task requires forbidden mutation or real external access.
- The result would require changing product code without explicit approval.

## Safety Boundaries
- Do not modify `CRM/backend/**`, `CRM/frontend/**`, `ALQASEER-PWA/**`, package files, workflows, deploy config, DNS, or secrets.
- Do not import real HCP/HCO data.
- Do not claim PASS without verification.

## Required Evidence
- Git status before/after.
- Files inspected.
- Run folder path.
- Skipped checks with reasons.
- Owner actions when external approval is needed.

## Owner Approval Boundaries
- Deploy, DNS, Cloudflare/Vercel mutation, tokens, real HCP import, medical/legal wording, PR/commit/push/merge, and real-device pilot scheduling are HUMAN-ONLY.

