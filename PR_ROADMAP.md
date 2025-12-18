# PR Roadmap: Complete CRM End-to-End

**Goal**: Complete Dopamine CRM Suite with all critical features while maintaining stability.

**Strategy**: Small, focused PRs with tests + rollback notes. Each PR should:
- Pass CI checks
- Include tests
- Have clear rollback instructions
- Preserve Arabic UI + Dark Mode defaults
- Maintain RBAC + security

---

## Phase 1: Security & RBAC Hardening (P0)

### PR #9: RBAC Endpoint Protection
**Priority**: P0 (Security)  
**Branch**: `cursor/rbac-endpoint-protection`

**Changes**:
- Add `require_roles()` decorators to all admin-only endpoints
- Add rep-scoped filtering for visits/accounts endpoints
- Add tests for unauthorized access attempts
- Document RBAC rules in `docs/RBAC.md`

**Tests**:
- Test admin can access admin endpoints
- Test rep cannot access admin endpoints
- Test rep can only see own visits/accounts
- Test unauthorized requests return 403

**Rollback**: Revert commit, no data changes

**Estimated Time**: 2-3 hours

---

### PR #10: JWT Secret Rotation & Environment Config
**Priority**: P0 (Security)  
**Branch**: `cursor/jwt-secret-config`

**Changes**:
- Move JWT secret to environment variable (remove hardcoded default)
- Add `.env.example` with `JWT_SECRET` placeholder
- Add validation: fail fast if JWT_SECRET is missing in production
- Update `RUN_ON_WINDOWS.md` with JWT_SECRET setup

**Tests**:
- Test app fails to start without JWT_SECRET in production
- Test app works with JWT_SECRET in development
- Test token generation/validation still works

**Rollback**: Revert commit, update `.env` if needed

**Estimated Time**: 1-2 hours

---

## Phase 2: Visits + Dashboard Readiness (P0)

### PR #11: Visits GPS Tracking & Accuracy
**Priority**: P0 (Core Feature)  
**Branch**: `cursor/visits-gps-tracking`

**Changes**:
- Add `latitude`, `longitude`, `accuracy` fields to Visit model
- Update visit start/end endpoints to accept GPS coordinates
- Add validation: require GPS for field visits (optional for admin-created)
- Add GPS accuracy threshold check (reject if accuracy > 100m)
- Update frontend visit forms to capture GPS

**Tests**:
- Test visit creation with valid GPS
- Test visit creation rejects low-accuracy GPS
- Test visit creation without GPS (admin override)
- Test visit queries filter by GPS bounds

**Rollback**: Revert commit, GPS fields become nullable

**Estimated Time**: 4-5 hours

---

### PR #12: Visits Dashboard Performance & Filtering
**Priority**: P0 (Core Feature)  
**Branch**: `cursor/visits-dashboard-performance`

**Changes**:
- Add database indexes on `visit_date`, `rep_id`, `doctor_id`
- Add pagination to visits list endpoint (default 50 per page)
- Add date range filtering (start_date, end_date)
- Add rep filtering (for admin view)
- Optimize dashboard queries (use select_related/joinedload)

**Tests**:
- Test pagination works correctly
- Test date range filtering
- Test rep filtering (admin vs rep view)
- Test performance: < 200ms for 1000 visits

**Rollback**: Revert commit, remove indexes if needed

**Estimated Time**: 3-4 hours

---

## Phase 3: Offline/PWA Stability (P1)

### PR #13: Offline Queue Persistence
**Priority**: P1 (PWA Critical)  
**Branch**: `cursor/offline-queue-persistence`

**Changes**:
- Implement IndexedDB storage for offline visit queue
- Add sync status indicator in PWA UI
- Add retry logic for failed syncs (exponential backoff)
- Add conflict resolution (server wins, log conflicts)
- Add sync progress indicator

**Tests**:
- Test visits saved offline when network unavailable
- Test visits sync when network restored
- Test conflict resolution
- Test retry logic on network errors

**Rollback**: Revert commit, clear IndexedDB if needed

**Estimated Time**: 5-6 hours

---

### PR #14: PWA Service Worker Updates
**Priority**: P1 (PWA Stability)  
**Branch**: `cursor/pwa-service-worker-updates`

**Changes**:
- Add service worker versioning
- Add cache invalidation strategy (cache-first for assets, network-first for API)
- Add offline fallback page
- Add update notification (prompt user to refresh)
- Test on mobile devices (iOS Safari, Android Chrome)

**Tests**:
- Test service worker installs correctly
- Test cache invalidation on new version
- Test offline fallback page shows
- Test update notification appears

**Rollback**: Revert commit, unregister service worker

**Estimated Time**: 4-5 hours

---

## Phase 4: Exports (Excel/PDF) (P1)

### PR #15: Visits Export to Excel
**Priority**: P1 (Reporting)  
**Branch**: `cursor/visits-excel-export`

**Changes**:
- Add `openpyxl` dependency
- Create `/api/v1/visits/export/excel` endpoint
- Export visits with filters (date range, rep, doctor)
- Include GPS coordinates, timestamps, rep name, doctor name
- Add Arabic column headers support
- Add download button in frontend visits page

**Tests**:
- Test Excel export generates valid file
- Test Excel export includes all filtered visits
- Test Excel export handles Arabic text correctly
- Test Excel export works with large datasets (1000+ visits)

**Rollback**: Revert commit, remove `openpyxl` dependency

**Estimated Time**: 3-4 hours

---

### PR #16: Reports Export to PDF
**Priority**: P1 (Reporting)  
**Branch**: `cursor/reports-pdf-export`

**Changes**:
- Add `reportlab` or `weasyprint` dependency
- Create `/api/v1/reports/export/pdf` endpoint
- Export rep performance, territory performance, product performance
- Include charts/graphs (use matplotlib or chart.js server-side)
- Add Arabic text support (RTL layout)
- Add download button in frontend reports page

**Tests**:
- Test PDF export generates valid file
- Test PDF export includes all report data
- Test PDF export handles Arabic text correctly
- Test PDF export works with large datasets

**Rollback**: Revert commit, remove PDF dependency

**Estimated Time**: 5-6 hours

---

## Phase 5: Polish & Documentation (P2)

### PR #17: API Documentation (OpenAPI/Swagger)
**Priority**: P2 (Developer Experience)  
**Branch**: `cursor/api-documentation`

**Changes**:
- Enhance FastAPI OpenAPI schema with examples
- Add request/response examples for all endpoints
- Add authentication examples
- Deploy Swagger UI at `/docs`
- Add API usage guide in `docs/API_USAGE.md`

**Tests**:
- Test Swagger UI loads correctly
- Test all endpoints appear in docs
- Test examples are valid

**Rollback**: Revert commit, no functional changes

**Estimated Time**: 2-3 hours

---

### PR #18: Frontend Error Handling & Loading States
**Priority**: P2 (UX)  
**Branch**: `cursor/frontend-error-handling`

**Changes**:
- Add error boundaries for all major pages
- Add loading skeletons for async data
- Add retry buttons for failed requests
- Add toast notifications for success/error
- Improve error messages (Arabic + English)

**Tests**:
- Test error boundaries catch errors
- Test loading states show correctly
- Test retry buttons work
- Test toast notifications appear

**Rollback**: Revert commit, no data changes

**Estimated Time**: 4-5 hours

---

## Summary

| Phase | PRs | Priority | Estimated Time |
|-------|-----|----------|----------------|
| Phase 1: Security | #9, #10 | P0 | 3-5 hours |
| Phase 2: Visits | #11, #12 | P0 | 7-9 hours |
| Phase 3: PWA | #13, #14 | P1 | 9-11 hours |
| Phase 4: Exports | #15, #16 | P1 | 8-10 hours |
| Phase 5: Polish | #17, #18 | P2 | 6-8 hours |
| **Total** | **8 PRs** | **P0-P2** | **33-43 hours** |

---

## Execution Order

1. ✅ **PR #8** (Current): CI Stabilization → Merge first
2. **PR #9**: RBAC Protection → Security first
3. **PR #10**: JWT Config → Security hardening
4. **PR #11**: GPS Tracking → Core feature
5. **PR #12**: Dashboard Performance → Core feature
6. **PR #13**: Offline Queue → PWA stability
7. **PR #14**: Service Worker → PWA stability
8. **PR #15**: Excel Export → Reporting
9. **PR #16**: PDF Export → Reporting
10. **PR #17**: API Docs → Developer experience
11. **PR #18**: Error Handling → UX polish

---

## Success Criteria

Each PR should:
- ✅ Pass all CI checks
- ✅ Include tests (backend pytest, frontend vitest)
- ✅ Have clear rollback instructions
- ✅ Preserve Arabic UI + Dark Mode
- ✅ Maintain RBAC + security
- ✅ Update documentation if needed

---

**End of Roadmap**

