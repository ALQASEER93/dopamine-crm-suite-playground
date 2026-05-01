# Frontend

This package contains the CRM React application powered by [Vite](https://vitejs.dev/). The toolkit provides a fast dev server,
modern build pipeline, and Vitest-based testing setup.

## Prerequisites

Install Node.js 18 or newer and npm.

## Install Dependencies

```bash
cd frontend
npm install
```

This installs React, the Vite build tooling, ESLint/Prettier, and testing utilities.

## Environment

Create a `.env` (or copy `.env.example`) and set the API base URL for local development:

```
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
VITE_MAP_MODE=links
```

For field/staging/production, set the deployed HTTPS API host using:
- `VITE_API_BASE_URL` (primary)
- `VITE_API_URL` (fallback alias used by `src/api/client.ts`)

Production build guard:
- `npm run build` now fails in `production` mode if the effective API base URL is empty or local/default (`localhost`, `127.0.0.1`, `0.0.0.0`, `::1`, `.local`, or the built-in default `http://127.0.0.1:8000/api/v1`).
- The runtime API client also refuses local/default API bases when `import.meta.env.PROD` is true, so a production bundle cannot silently call localhost.
- This check does not block `npm run dev` local development flow.

Optional (only when `VITE_MAP_MODE=google`):
```
VITE_GOOGLE_MAPS_API_KEY=
```

## Available Scripts

Run these commands from the `frontend/` directory:

- `npm run dev` – start the Vite development server with hot module replacement.
- `npm run build` – create an optimized production build in `dist/`.
- `npm run preview` – serve the production build locally for verification.
- `npm test` – execute the Vitest suite once (`--watch=false` in package script).
- `npm run lint` – (optional) run ESLint using the provided configuration.

## Project Structure

```
frontend/
├── index.html          # Vite entry HTML
├── src/
│   ├── App.jsx         # Root application shell
│   ├── main.jsx        # Vite React entry point
│   ├── auth/           # Authentication context and utilities
│   └── visits/         # Visits dashboard views and providers
└── vite.config.js      # Shared Vite/Vitest configuration
```

Vitest loads `src/test/setup.js` to provide the DOM testing environment and custom matchers from
`@testing-library/jest-dom`.

## New CRM modules (Phase 3/4)

- Samples:
  - `/samples/inventory`
  - `/samples/distribute`
  - `/samples/history`
- Medical Affairs:
  - `/medical/events`
  - `/medical/kols`
  - `/medical/materials`
  - `/medical/reports`

These pages use `http://127.0.0.1:8000/api/v1` as the local-dev default and are Arabic-first with dark mode support inherited from the main layout.
