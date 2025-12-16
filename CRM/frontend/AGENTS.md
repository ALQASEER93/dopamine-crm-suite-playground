# AGENTS — CRM/frontend (Vite/React)

## Commands
- Install: `npm ci`
- Test: `npm run test:ci`
- Build: `npm run build`

## UI rules
- Arabic-first UI strings
- Default Dark Mode
- Mobile-first for reps; desktop dashboard for admin
- Visits Start/End + GPS/offline awareness; avoid regressing visit flows or exports
- No destructive refactors that break routes/layouts

## Critical flows
- Visits: Start/End, offline queue, sync, error states
