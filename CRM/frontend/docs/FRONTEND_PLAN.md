# CRM Frontend Plan (DOPAMINE PHARMA)

## Current Snapshot (Dec 2025)
- Stack: Vite + React 18, React Router 6. BrowserRouter used; no SSR. JavaScript only (no TypeScript yet). ESLint + Prettier + Vitest present; minimal tests.
- Auth: Custom `AuthContext` storing `{user, token}` in `localStorage`; login hits `/api/auth/login`, token taken from `X-Auth-Token`.
- API: Thin `apiFetch` wrapper around `fetch`, configurable base URL via `VITE_API_URL`.
- UI Shell: `MainLayout` with sidebar + header; routes for dashboard, visits, HCPs, pharmacies, reports, settings, admin users. Missing domain routes for products, orders, stock, targets, collections. Undefined variable (`roleSlug`) in `MainLayout` currently crashes rendering.
- Features implemented: Visits dashboard (filters, summary, table, export, new visit modal), basic dashboard showing visit summary/latest visits, rudimentary HCPs/pharmacies/admin users/report/settings pages. No products/orders/stock/targets/collections flows.
- Styling: Global CSS with light theme; not dark-theme optimized; inline styles sprinkled across visits components.
- Tests/build: `npm test` runs Vitest, `npm run build` uses Vite. No CI config in this repo.

## Target Architecture
- UI framework: React 18 + React Router 6 (keep). Move to TypeScript gradually (prefer `.tsx` for new/rewritten files).
- State & data: React Query for server state (lists, detail, mutations), React Context only for auth/theme. Keep simple local state for view controls.
- API layer: Centralized axios/fetch client in `src/api/client.ts` with interceptors for auth header + basic error normalization. Domain service modules per bounded context (`auth.ts`, `users.ts`, `doctors.ts`, `pharmacies.ts`, `products.ts`, `orders.ts`, `visits.ts`, `stock.ts`, `targets.ts`, `collections.ts`). Shared DTO types in `src/types/crm.ts`.
- Routing: `/login`, `/dashboard`, `/doctors`, `/doctors/:id`, `/pharmacies`, `/pharmacies/:id`, `/products`, `/orders`, `/orders/:id`, `/visits`, `/visits/routes`, `/stock`, `/targets`, `/collections`, `/settings/users`. Redirect `/` → `/dashboard`. Protected routes wrapper; role-based gating for admin-only screens.
- Layout system: Main shell with top bar (brand, user, logout) + collapsible left nav (sections: Dashboard, Doctors, Pharmacies, Products, Orders, Visits & Routes, Stock, Targets, Collections, Settings / Users & Roles). Mobile drawer behavior. Dark-friendly palette with tokenized theme variables.
- Folder structure:
  - `src/api/` client + domain services
  - `src/auth/` auth context + hooks + protected route
  - `src/components/` shared UI (buttons, cards, table, form controls, nav)
  - `src/features/<domain>/` (doctors, pharmacies, products, orders, visits, stock, targets, collections) with list/detail/hooks
  - `src/layout/` shell + nav + theme
  - `src/pages/` route-level entry components composed from features
  - `src/types/` shared types (`crm.ts`, `auth.ts`)
  - `src/hooks/` (usePagination, useDebounce, etc.)
  - `src/styles/` tokens + global + dark theme
  - `src/test/` setup and feature tests
- Authentication strategy: JWT from backend stored in memory + `localStorage` fallback; Authorization header `Bearer <token>`. Optional refresh if backend exposes endpoint (hook-ready). On 401 → logout + redirect to `/login`. Role-based capability map (sales_manager/admin vs sales_rep).

## Domain Coverage (CRUD scope)
- Dashboard: Summary cards (today’s visits, this month orders count/total JOD, active doctors/pharmacies, top 5 products by orders). Use available backend endpoints; fall back to simplified metrics when aggregation missing.
- Doctors: Paginated/filterable list (search, city/area, specialty). Detail/edit page with visits + recent orders. Create/edit/delete doctor forms.
- Pharmacies: Similar list + detail with visits/orders; filters by area/class/tag.
- Products: List with price/margin/category; create/edit; optional tag badges (Maxigene, Irongene, etc.).
- Orders: List with id/date/account/total/status; detail with lines; create order flow (select doctor/pharmacy, add lines, compute totals).
- Visits & Routes: List with status, rep, account, notes; export CSV; create visit modal; basic daily route plan view.
- Stock: Per-product inventory (available/reserved/location if provided).
- Targets: Sales/visit targets per rep/product; editable.
- Collections: Invoices/collections with paid/remaining amounts; create/update status.

## UI/UX Guidelines
- Default dark-friendly theme; tokenized colors; consistent spacing/typography; avoid random inline styles.
- Reusable patterns: Filter bar + table card; form layouts with validation + loading/disabled states; toast/inline alerts for errors.
- Responsiveness: Collapsible sidebar, stacked cards/tables on small screens.
- Accessibility: Proper labels, focus styles, semantic buttons/links.

## Testing & Quality
- Keep Vitest; add React Testing Library integration tests for auth, doctors list/search, orders list rendering, visits table basics.
- Smoke tests for routing protection and layout rendering.
- Commands: `npm run dev`, `npm test`, `npm run build`, `npm run lint`.

## Delivery Plan / Checkpoints
1) Stabilize foundation: fix crashing bugs (e.g., undefined `roleSlug`), wire protected routing, introduce theme tokens and layout shell updates (brand/nav items, responsiveness). Add TypeScript config and migrate shared primitives (api client, auth) first.
2) API layer + types: add `src/types/crm.ts`, refactor `api/client.ts` to TS, add domain service modules + React Query setup/provider.
3) Auth & access: harden login flow, role-based nav/route guards, user dropdown/logout, handle token expiry.
4) Feature passes:
   - Visits: keep current capabilities, clean UI, React Query data, error/loading states.
   - Doctors/Pharmacies: build list/detail CRUD with filters.
   - Products/Orders: list/detail/create flows with line items.
   - Stock/Targets/Collections: basic lists + edit forms aligned to backend fields.
5) Dashboard: surface key metrics and quick links using available endpoints.
6) Polish & tests: unify styles, add shared components, write tests (login, doctors list, orders list, visits rendering), ensure `npm run build` and `npm test` pass.
7) Docs: keep this plan updated; note backend base URL/env (`VITE_API_URL`), test commands, and any required seed steps.

## Backend Expectations for Frontend
- Base URL via `VITE_API_URL` (e.g., `http://localhost:5000`).
- Auth endpoint: `POST /api/auth/login` returns user payload; JWT in `X-Auth-Token` or response body.
- CRUD endpoints for doctors, pharmacies, products, orders (with lines), visits (with summary/export), stock, targets, collections; list endpoints support pagination/filtering where available.
- Roles: at least `admin`/`sales_manager` (full) and `sales_rep` (limited).

## Dev How-To
- Install: `npm install`
- Run dev: `npm run dev` (Vite on 5173)
- Test: `npm test`
- Build: `npm run build`
- Env: create `.env.local` with `VITE_API_URL=http://localhost:5000`
