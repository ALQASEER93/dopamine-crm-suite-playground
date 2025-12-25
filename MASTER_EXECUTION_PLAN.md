# خطة العمل الشاملة - Dopamine CRM Suite
## Master Execution Plan

**التاريخ**: 2025-12-25  
**الهدف**: إكمال Dopamine CRM Suite لشركة أدوية ناشئة  
**الفريق**: كبير المهندسين + AI Agents (Codex CLI, Codex Cloud, Cursor, Gemini)

---

## 📋 نظرة عامة

هذه الخطة توزع المهام على الأدوات المتاحة لتسريع العمل وتحقيق الكفاءة القصوى.

### الأدوات المتاحة:
1. **Cursor** (أنت - كبير المهندسين): مراجعة، تخطيط، تنفيذ مباشر
2. **Codex CLI**: Automation, scripts, batch operations
3. **Codex Cloud**: Code generation, API development
4. **Gemini**: Documentation, analysis, testing

---

## 🎯 Phase 0: Security & Core Features (P0) - أسبوعان

### Sprint 1: RBAC Protection & JWT Security

#### Task 1.1: RBAC Endpoint Protection ⚡ CURSOR
**الأداة**: Cursor (أنت - مباشر)  
**الوقت**: 4-6 ساعات  
**الوصف**:
- Add `require_roles()` decorators لجميع admin endpoints
- Add rep-scoped filtering للـ visits, orders, collections
- Add tests للـ RBAC scenarios

**الملفات**:
- `CRM/backend/api/v1/*.py` - Add decorators
- `CRM/backend/core/security.py` - Enhance helpers
- `CRM/backend/tests/test_rbac.py` - New test file

**الأوامر للاختبار**:
```powershell
cd CRM/backend
python -m pytest tests/test_rbac.py -v
```

**GitHub Branch**: `cursor/rbac-endpoint-protection`

---

#### Task 1.2: JWT Secret Environment Variable ⚡ CURSOR
**الأداة**: Cursor  
**الوقت**: 1-2 ساعة  
**الوصف**:
- Move JWT secret إلى environment variable
- Add `.env.example` مع `JWT_SECRET` placeholder
- Add validation: fail fast if missing in production

**الملفات**:
- `CRM/backend/core/config.py` - Add JWT_SECRET
- `CRM/backend/.env.example` - Add placeholder
- `RUN_ON_WINDOWS.md` - Update docs

**GitHub Branch**: `cursor/jwt-secret-config`

---

### Sprint 2: GPS Tracking Implementation

#### Task 2.1: GPS Validation & Accuracy Checks ⚡ CURSOR
**الأداة**: Cursor  
**الوقت**: 3-4 ساعات  
**الوصف**:
- Add GPS accuracy threshold validation (reject if > 100m)
- Add validation helpers للـ GPS coordinates
- Update Visit schema to require GPS for field visits

**الملفات**:
- `CRM/backend/schemas/crm.py` - Add GPS validation
- `CRM/backend/api/v1/visits.py` - Add validation logic
- `CRM/backend/tests/test_visits_gps.py` - New tests

**GitHub Branch**: `cursor/gps-validation`

---

#### Task 2.2: Start/End Visit Endpoints ⚡ CURSOR + CODEX CLOUD
**الأداة**: Cursor (design) + Codex Cloud (implementation)  
**الوقت**: 4-5 ساعات  
**الوصف**:
- Create `POST /api/v1/visits/{id}/start` endpoint
- Create `POST /api/v1/visits/{id}/end` endpoint
- Prevent duplicate open visits (one visit at a time per rep)
- Auto-calculate duration

**الملفات**:
- `CRM/backend/api/v1/visits.py` - Add start/end endpoints
- `CRM/backend/services/visits.py` - Add business logic
- `CRM/backend/tests/test_visits_start_end.py` - New tests

**Codex Cloud Prompt** (انسخ والصق):
```
Create FastAPI endpoints for visit start/end with GPS tracking:

1. POST /api/v1/visits/{visit_id}/start
   - Accept GPS coordinates (lat, lng, accuracy)
   - Set started_at timestamp
   - Store GPS in start_lat, start_lng, start_accuracy
   - Validate: no other open visit for same rep
   - Return visit object

2. POST /api/v1/visits/{visit_id}/end
   - Accept GPS coordinates (lat, lng, accuracy)
   - Set ended_at timestamp
   - Store GPS in end_lat, end_lng, end_accuracy
   - Calculate duration_seconds
   - Update status to "completed"
   - Return visit object

Requirements:
- Use existing Visit model from models/crm.py
- Add proper error handling
- Add RBAC checks (rep can only start/end own visits)
- Add validation (visit must exist, must be in "scheduled" status)
```

**GitHub Branch**: `cursor/visits-start-end-gps`

---

#### Task 2.3: Frontend Start/End Visit UI ⚡ CURSOR
**الأداة**: Cursor  
**الوقت**: 5-6 ساعات  
**الوصف**:
- Add Start Visit button في VisitsTable
- Add End Visit button (appears when visit is in_progress)
- Add GPS capture logic (navigator.geolocation)
- Add loading states و error handling
- Update visit status في real-time

**الملفات**:
- `CRM/frontend/src/visits/VisitsTable.jsx` - Add buttons
- `CRM/frontend/src/api/visits.js` - Add start/end API calls
- `CRM/frontend/src/utils/gps.js` - New GPS helper

**GitHub Branch**: `cursor/frontend-visit-start-end`

---

## 🎯 Phase 1: PWA & Data Integration (P1) - أسبوعان

### Sprint 3: Offline Queue & Sync

#### Task 3.1: IndexedDB Offline Queue ⚡ CODEX CLOUD
**الأداة**: Codex Cloud  
**الوقت**: 6-8 ساعات  
**الوصف**:
- Implement IndexedDB storage للـ offline visits
- Add Dexie.js library (lightweight IndexedDB wrapper)
- Create offline queue structure
- Add sync status tracking

**الملفات**:
- `ALQASEER-PWA/lib/offline-queue.ts` - Enhance existing
- `ALQASEER-PWA/lib/offline-db.ts` - New IndexedDB wrapper
- `ALQASEER-PWA/package.json` - Add dexie dependency

**Codex Cloud Prompt**:
```
Implement IndexedDB-based offline queue for PWA visits:

1. Use Dexie.js library for IndexedDB wrapper
2. Create database schema:
   - pendingVisits: { id, visitData, createdAt, syncStatus }
   - syncLog: { id, visitId, status, error, timestamp }
3. Add functions:
   - addPendingVisit(visitData)
   - getPendingVisits()
   - markVisitSynced(visitId)
   - markVisitFailed(visitId, error)
4. Integrate with existing offline-queue.ts
5. Add TypeScript types

Requirements:
- Handle conflicts (server wins strategy)
- Add retry logic with exponential backoff
- Add sync progress tracking
```

**GitHub Branch**: `cursor/offline-queue-indexeddb`

---

#### Task 3.2: Sync Logic & Conflict Resolution ⚡ CURSOR
**الأداة**: Cursor  
**الوقت**: 4-5 ساعات  
**الوصف**:
- Implement sync logic (sync when online)
- Add conflict resolution (server wins)
- Add retry logic (exponential backoff)
- Add sync status indicator في UI

**الملفات**:
- `ALQASEER-PWA/lib/offline-sync.ts` - New sync logic
- `ALQASEER-PWA/components/OfflineSyncClient.tsx` - Update UI
- `ALQASEER-PWA/lib/offline-queue.ts` - Enhance sync

**GitHub Branch**: `cursor/offline-sync-logic`

---

### Sprint 4: Customer List Integration

#### Task 4.1: Unified Customer List API ⚡ CURSOR
**الأداة**: Cursor  
**الوقت**: 3-4 ساعات  
**الوصف**:
- Create unified Customer endpoint (combines Doctors + Pharmacies)
- Add filters (type, area, specialty, search)
- Add pagination
- Maintain backward compatibility

**الملفات**:
- `CRM/backend/api/v1/customers.py` - New endpoint
- `CRM/backend/schemas/crm.py` - Add Customer schema
- `CRM/backend/tests/test_customers.py` - New tests

**GitHub Branch**: `cursor/unified-customers-api`

---

#### Task 4.2: Frontend Customer List Page ⚡ CURSOR
**الأداة**: Cursor  
**الوقت**: 4-5 ساعات  
**الوصف**:
- Create CustomerListPage component
- Add filters (type, area, specialty, search)
- Add table view (unified Doctors + Pharmacies)
- Add pagination
- Add create/edit/delete actions

**الملفات**:
- `CRM/frontend/src/pages/CustomersPage.jsx` - New page
- `CRM/frontend/src/api/customers.js` - New API client
- `CRM/frontend/src/App.jsx` - Add route

**GitHub Branch**: `cursor/frontend-customers-page`

---

### Sprint 5: Export Features

#### Task 5.1: Excel Export (Visits) ⚡ CODEX CLOUD
**الأداة**: Codex Cloud  
**الوقت**: 3-4 ساعات  
**الوصف**:
- Add openpyxl dependency
- Create Excel export endpoint للـ visits
- Add Arabic column headers
- Include GPS coordinates, timestamps

**الملفات**:
- `CRM/backend/api/v1/visits.py` - Add Excel export endpoint
- `CRM/backend/services/visits.py` - Add Excel generation
- `CRM/backend/requirements.txt` - Add openpyxl

**Codex Cloud Prompt**:
```
Create Excel export endpoint for visits:

1. Add openpyxl to requirements.txt
2. Create POST /api/v1/visits/export/excel endpoint
3. Export visits with filters (date range, rep, doctor, etc.)
4. Include columns:
   - ID, Visit Date, Status, Duration
   - Rep Name, Rep Email
   - Doctor/Pharmacy Name, Area, City
   - GPS: Start Lat/Lng, End Lat/Lng, Accuracy
   - Notes, Next Action
5. Use Arabic column headers (RTL support)
6. Support large datasets (stream if needed)

Requirements:
- Reuse existing visit filters logic
- Add proper error handling
- Set correct MIME type (application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)
```

**GitHub Branch**: `cursor/visits-excel-export`

---

#### Task 5.2: PDF Export (Reports) ⚡ CODEX CLOUD
**الأداة**: Codex Cloud  
**الوقت**: 5-6 ساعات  
**الوصف**:
- Add reportlab أو weasyprint dependency
- Create PDF export للـ reports
- Add Arabic text support (RTL)
- Include charts/graphs

**الملفات**:
- `CRM/backend/api/v1/reports.py` - Add PDF export
- `CRM/backend/services/reports.py` - Add PDF generation
- `CRM/backend/requirements.txt` - Add PDF library

**Codex Cloud Prompt**:
```
Create PDF export for reports:

1. Add reportlab أو weasyprint to requirements.txt
2. Create POST /api/v1/reports/export/pdf endpoint
3. Export rep performance, territory performance, product performance
4. Include:
   - Summary statistics
   - Tables with data
   - Charts/graphs (use matplotlib أو chart.js server-side)
5. Support Arabic text (RTL layout)
6. Professional formatting

Requirements:
- Reuse existing report generation logic
- Add proper error handling
- Set correct MIME type (application/pdf)
```

**GitHub Branch**: `cursor/reports-pdf-export`

---

## 🎯 Phase 2: Enhancement & Polish (P2) - أسبوعان

### Sprint 6: Maps & Geofencing

#### Task 6.1: Admin Dashboard Maps ⚡ CURSOR
**الأداة**: Cursor  
**الوقت**: 6-8 ساعات  
**الوصف**:
- Add Google Maps integration في Admin Dashboard
- Show visit locations on map
- Add rep timeline visualization
- Add geofencing visualization (if configured)

**الملفات**:
- `CRM/frontend/src/pages/VisitsMapPage.jsx` - New page
- `CRM/frontend/src/components/VisitMap.jsx` - Map component
- `CRM/frontend/package.json` - Add @react-google-maps/api

**GitHub Branch**: `cursor/admin-maps-dashboard`

---

#### Task 6.2: Suspicious Visit Flags ⚡ CURSOR
**الأداة**: Cursor  
**الوقت**: 4-5 ساعات  
**الوصف**:
- Add logic للـ flagging suspicious visits:
  - Short visits (< 5 minutes)
  - GPS jumps (large distance in short time)
  - Low accuracy (> 100m)
  - Outside geofence (if configured)
- Add flags field في Visit model
- Add admin view للـ flagged visits

**الملفات**:
- `CRM/backend/models/crm.py` - Add flags field
- `CRM/backend/services/visits.py` - Add flagging logic
- `CRM/frontend/src/pages/FlaggedVisitsPage.jsx` - New page

**GitHub Branch**: `cursor/suspicious-visit-flags`

---

### Sprint 7: UI/UX Polish

#### Task 7.1: Error Handling & Loading States ⚡ CURSOR
**الأداة**: Cursor  
**الوقت**: 4-5 ساعات  
**الوصف**:
- Add error boundaries لجميع major pages
- Add loading skeletons للـ async data
- Add toast notifications (success/error)
- Improve error messages (Arabic + English)

**الملفات**:
- `CRM/frontend/src/components/ErrorBoundary.jsx` - New component
- `CRM/frontend/src/components/LoadingSkeleton.jsx` - New component
- `CRM/frontend/src/components/Toast.jsx` - New component
- Update all pages to use these components

**GitHub Branch**: `cursor/frontend-error-handling`

---

#### Task 7.2: Arabic UI Review ⚡ GEMINI
**الأداة**: Gemini (Documentation & Review)  
**الوقت**: 3-4 ساعات  
**الوصف**:
- Review جميع UI strings
- Ensure RTL support
- Verify Arabic translations
- Create Arabic UI checklist

**الملفات**:
- Review all `.jsx` files
- `ARABIC_UI_CHECKLIST.md` - New document

**Gemini Prompt** (انسخ والصق):
```
Review the CRM frontend codebase for Arabic UI compliance:

1. Check all UI strings (buttons, labels, messages)
2. Verify RTL (Right-to-Left) support
3. Check Arabic translations accuracy
4. Identify missing Arabic strings
5. Create checklist for Arabic UI requirements

Focus on:
- CRM/frontend/src/pages/*.jsx
- CRM/frontend/src/components/*.jsx
- CRM/frontend/src/visits/*.jsx

Create a comprehensive Arabic UI checklist document.
```

**GitHub Branch**: `cursor/arabic-ui-review`

---

### Sprint 8: Testing & Documentation

#### Task 8.1: Test Coverage Expansion ⚡ CURSOR
**الأداة**: Cursor  
**الوقت**: 6-8 ساعات  
**الوصف**:
- Expand backend tests (RBAC, GPS, offline sync)
- Expand frontend tests (components, pages)
- Add integration tests للـ critical flows
- Aim for 80%+ coverage

**الملفات**:
- `CRM/backend/tests/test_*.py` - Expand tests
- `CRM/frontend/src/**/*.test.jsx` - Expand tests

**GitHub Branch**: `cursor/test-coverage-expansion`

---

#### Task 8.2: API Documentation ⚡ CURSOR + GEMINI
**الأداة**: Cursor (implementation) + Gemini (documentation)  
**الوقت**: 2-3 ساعات  
**الوصف**:
- Enhance FastAPI OpenAPI schema
- Add request/response examples
- Add authentication examples
- Create API usage guide

**الملفات**:
- `CRM/backend/main.py` - Enhance OpenAPI
- `docs/API_USAGE.md` - New guide

**GitHub Branch**: `cursor/api-documentation`

---

## 📝 ملاحظات التنفيذ

### Git Workflow
1. **Always branch + PR**: لا push مباشر إلى main
2. **Branch naming**: `cursor/task-name` أو `codex/task-name`
3. **Small commits**: Commit checkpoints صغيرة وواضحة
4. **PR template**: كل PR يحتوي على:
   - ماذا تغير؟
   - كيف نختبر؟
   - ماذا بقي؟

### Testing Requirements
- ✅ Backend: `python -m pytest -q` يجب يمر
- ✅ Frontend: `npm run build` يجب يمر
- ✅ PWA: `npm run build` يجب يمر

### Code Review
- Codex Review Bot سيراجع PRs تلقائياً
- Manual review من كبير المهندسين للـ critical changes

---

## 🚀 Quick Start Guide (أوتوماتيكي - لا أوامر يدوية)

### للبدء في Phase 0:

**في Cursor، فقط أخبرني:**
- "قم بتنفيذ Task 1.1 RBAC Protection" - سأنفذ كل شيء تلقائياً
- "قم بتنفيذ Task 2.1 GPS Validation" - سأنفذ كل شيء تلقائياً

**لا حاجة لأوامر يدوية! انظر `AUTOMATED_WORKFLOW.md` للتفاصيل.**

### للاستفادة من Codex Cloud:

1. انسخ الـ prompt المحدد في المهمة
2. الصقه في Codex Cloud
3. راجع الكود المولد
4. احذف الكود في Cursor
5. اختبر الكود

### للاستفادة من Gemini:

1. انسخ الـ prompt المحدد
2. الصقه في Gemini
3. راجع النتائج
4. استخدم النتائج في Cursor

---

## 📊 Progress Tracking

استخدم هذا الجدول لتتبع التقدم:

| Phase | Task | Status | Assigned To | Estimated | Actual |
|-------|------|--------|-------------|-----------|--------|
| Phase 0 | 1.1 RBAC Protection | ⏳ Pending | Cursor | 4-6h | - |
| Phase 0 | 1.2 JWT Secret | ⏳ Pending | Cursor | 1-2h | - |
| Phase 0 | 2.1 GPS Validation | ⏳ Pending | Cursor | 3-4h | - |
| Phase 0 | 2.2 Start/End Visit | ⏳ Pending | Cursor + Codex Cloud | 4-5h | - |
| Phase 0 | 2.3 Frontend UI | ⏳ Pending | Cursor | 5-6h | - |
| Phase 1 | 3.1 IndexedDB Queue | ⏳ Pending | Codex Cloud | 6-8h | - |
| Phase 1 | 3.2 Sync Logic | ⏳ Pending | Cursor | 4-5h | - |
| Phase 1 | 4.1 Customer API | ⏳ Pending | Cursor | 3-4h | - |
| Phase 1 | 4.2 Customer Frontend | ⏳ Pending | Cursor | 4-5h | - |
| Phase 1 | 5.1 Excel Export | ⏳ Pending | Codex Cloud | 3-4h | - |
| Phase 1 | 5.2 PDF Export | ⏳ Pending | Codex Cloud | 5-6h | - |
| Phase 2 | 6.1 Maps Dashboard | ⏳ Pending | Cursor | 6-8h | - |
| Phase 2 | 6.2 Suspicious Flags | ⏳ Pending | Cursor | 4-5h | - |
| Phase 2 | 7.1 Error Handling | ⏳ Pending | Cursor | 4-5h | - |
| Phase 2 | 7.2 Arabic UI Review | ⏳ Pending | Gemini | 3-4h | - |
| Phase 2 | 8.1 Test Coverage | ⏳ Pending | Cursor | 6-8h | - |
| Phase 2 | 8.2 API Docs | ⏳ Pending | Cursor + Gemini | 2-3h | - |

**إجمالي الوقت المقدر**: ~70-90 ساعة (6 أسابيع مع فريق 2-3 developers)

---

**التاريخ**: 2025-12-25  
**النسخة**: 1.0  
**آخر تحديث**: 2025-12-25

