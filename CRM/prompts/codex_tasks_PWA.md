# Dopamine PWA - D:/CRM ALQASEER/ALQASEER-PWA

## Summary
- Test status: failed (exit 1)
- Build status: failed (exit 1)
- Git: state: dirty | modified: M .gitignore, M app/globals.css, M components/Sidebar.js, M lib/server-fetch.ts, M package-lock.json, M package.json, M public/manifest.webmanifest, M tsconfig.json, M vitest.config.mts | untracked: add_field_nav.py, app/field/, components/FieldNav.tsx, index.html, lib/api-config.ts, lib/client-fetch.ts, node_local.exe, scripts/windows-spawn-patch.cjs, src/pwa/, structure-pwa.txt, tests/pwa/, tests/setup.ts, vite.config.ts
- Timestamp: 2025-12-02T21:33:30.405Z

## Problems
1. Severity: High
   - Tests failed
   - Exit code: 1
   - stderr: node:internal/modules/cjs/loader:1215
  throw err;
  ^

Error: Cannot find module 'C:\\Users\\M\ S\ I\\ALQASEER_CRM_SUITE_FINAL\ALQASEER-PWA\node_modules\vitest\vitest.mjs'
    at Module._resolveFilename (node:internal/modules/cjs/loader:1212:15)
    at Module._load (node:internal/modules/cjs/loader:1043:27)
    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:164:12)
    at node:internal/main/run_main_module:28:49 {
  code: 'MODULE_NOT_FOUND',
  requireStack: []
}

Node.js v20.19.1

   - Suggested areas: review test files and recent changes.
2. Severity: High
   - Build failed
   - Exit code: 1
   - stderr: node:internal/modules/cjs/loader:1215
  throw err;
  ^

Error: Cannot find module 'C:\\Users\\M\ S\ I\\ALQASEER_CRM_SUITE_FINAL\ALQASEER-PWA\node_modules\vite\bin\vite.js'
    at Module._resolveFilename (node:internal/modules/cjs/loader:1212:15)
    at Module._load (node:internal/modules/cjs/loader:1043:27)
    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:164:12)
    at node:internal/main/run_main_module:28:49 {
  code: 'MODULE_NOT_FOUND',
  requireStack: []
}

Node.js v20.19.1

   - Suggested areas: build config, dependencies, environment.

## Logs (truncated to latest run)
### Test stdout
```

> dopamine-pwa@0.2.0 test:vitest
> set "NODE_ENV=test" && .\\node_local.exe -r ./scripts/windows-spawn-patch.cjs ./node_modules/vitest/vitest.mjs run --watch=false


```
### Test stderr
```
node:internal/modules/cjs/loader:1215
  throw err;
  ^

Error: Cannot find module 'C:\\Users\\M\ S\ I\\ALQASEER_CRM_SUITE_FINAL\ALQASEER-PWA\node_modules\vitest\vitest.mjs'
    at Module._resolveFilename (node:internal/modules/cjs/loader:1212:15)
    at Module._load (node:internal/modules/cjs/loader:1043:27)
    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:164:12)
    at node:internal/main/run_main_module:28:49 {
  code: 'MODULE_NOT_FOUND',
  requireStack: []
}

Node.js v20.19.1

```
### Build stdout
```

> dopamine-pwa@0.2.0 build
> .\\node_local.exe -r ./scripts/windows-spawn-patch.cjs ./node_modules/vite/bin/vite.js build


```
### Build stderr
```
node:internal/modules/cjs/loader:1215
  throw err;
  ^

Error: Cannot find module 'C:\\Users\\M\ S\ I\\ALQASEER_CRM_SUITE_FINAL\ALQASEER-PWA\node_modules\vite\bin\vite.js'
    at Module._resolveFilename (node:internal/modules/cjs/loader:1212:15)
    at Module._load (node:internal/modules/cjs/loader:1043:27)
    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:164:12)
    at node:internal/main/run_main_module:28:49 {
  code: 'MODULE_NOT_FOUND',
  requireStack: []
}

Node.js v20.19.1

```

## Instructions for Codex/Aider
- Working directory: D:/CRM ALQASEER/ALQASEER-PWA
- You may edit project files, add/update tests, and run npm test/build as needed.
- Focus on the problems above; keep unrelated behavior unchanged.
