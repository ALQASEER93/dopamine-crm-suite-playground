---
name: dpm-react-vite
description: Improve DOPAMINE React 18 and Vite 5 frontend performance and correctness while preserving Arabic RTL, dark mode, visits and exports.
---
# DPM React/Vite
Read closest AGENTS.md and package.json plus lockfile before selecting APIs.
CRM/frontend and ALQASEER-PWA are separate applications. Verify resolved versions; manifests currently target React 18 and Vite 5.
Use Vercel React guidance selectively: independent fetches may run concurrently, avoid avoidable request waterfalls, use direct imports and lazy loading for heavy routes, keep effect dependencies accurate, derive simple state in render and measure costly rerenders before memoizing.
Do not introduce Next.js, next/dynamic, RSC, server actions, React.cache, React 19 Activity or useEffectEvent into these React 18 client applications. Preserve the existing React Query and Zustand choices rather than replacing them just to match a generic rule.
Keep Arabic RTL and default dark mode, mobile rep interactions and admin views. Preserve API base assumptions and CSV/Excel/PDF workflows.
Verify the changed surface using the closest AGENTS.md: CRM/frontend npm run test:ci and npm run build; PWA npm run test:vitest, npm run lint and npm run build. Run npm ci when dependencies are absent or changed. For user flows use existing Playwright tests, role-based locators and retrying assertions; do not use fixed sleeps or networkidle as a universal readiness test.
Sources reviewed: Vercel agent-skills at 1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62 (MIT), skills/react-best-practices/SKILL.md; https://react.dev/reference/react ; https://vite.dev/guide/ ; https://playwright.dev/docs/best-practices .
