---
name: dpm-field-quality
description: Implement or verify DOPAMINE FastAPI/Python RBAC and visit GPS/offline behavior using Pytest and existing Playwright tests.
---
# DPM field quality
Read applicable AGENTS.md, models, security dependencies, GPS policy and existing tests before modifying behavior.
Backend uses FastAPI 0.115.x, Pydantic 2 and SQLAlchemy 2 ranges; resolve installed versions before copying current examples. Enforce authorization and rep ownership on the server for read/write/export routes; UI hiding is insufficient. Derive authenticated identity server-side and reject attempts to change another rep's visit.
Preserve visit Start/End order, timestamps, coordinates and accuracy. Use existing GPS policy; test missing/invalid/low-accuracy, permission denial, timeout, repeat Start/End and unauthorized overrides. Use synthetic test locations only.
Trace the actual active queue implementation and its callers: ALQASEER-PWA has lib/offline-queue.ts and src/pwa/offline/queue.ts. Do not unify them without evidence. Verify retries across reload, reconnect and concurrent tabs; an acknowledged write whose response was lost must not create a second visit. A client idempotency header alone does not prove server deduplication.
Test logout/account switch with queued writes and cached API responses; prevent cross-user replay or cached data exposure without deleting pending user data. Do not put secrets in localStorage, queues, logs or screenshots. Verify service worker updates preserve pending visits and authenticated API isolation.
Pytest: use isolated test data/database and dependency overrides; restore overrides after tests. Run CRM/backend python -m pytest -q for backend changes.
PWA: npm run test:vitest, npm run lint, npm run build. E2E: start the app for the configured E2E_BASE_URL (default http://127.0.0.1:4174), then npm run e2e. Existing config does not start a web server. Mock geolocation and permissions; assert visible results with Playwright locators. Cover offline/reconnect/reload, denied GPS, RBAC, visit Start/End and exports as relevant.
Sources: https://fastapi.tiangolo.com/tutorial/testing/ ; https://fastapi.tiangolo.com/tutorial/security/ ; https://docs.pytest.org/en/stable/how-to/fixtures.html ; https://playwright.dev/docs/best-practices ; https://vite-pwa-org.netlify.app/guide/ ; https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API .
