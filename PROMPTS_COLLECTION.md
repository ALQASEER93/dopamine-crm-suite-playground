# مجموعة الـ Prompts - Dopamine CRM Suite
## Prompts Collection for AI Tools

**التاريخ**: 2025-12-25  
**الهدف**: جميع الـ Prompts جاهزة للنسخ واللصق في Codex Cloud و Gemini

---

## 🔵 Codex Cloud Prompts

### Task 2.2: Start/End Visit Endpoints

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
- Use existing schemas from schemas/crm.py
- Add to api/v1/visits.py
```

---

### Task 3.1: IndexedDB Offline Queue

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
- Support visit creation, update, delete operations
- Add to ALQASEER-PWA/lib/offline-db.ts
- Update ALQASEER-PWA/package.json to include dexie dependency
```

---

### Task 5.1: Excel Export (Visits)

```
Create Excel export endpoint for visits:

1. Add openpyxl to requirements.txt
2. Create POST /api/v1/visits/export/excel endpoint
3. Export visits with filters (date range, rep, doctor, etc.)
4. Include columns:
   - ID, Visit Date, Status, Duration (minutes)
   - Rep Name, Rep Email
   - Doctor/Pharmacy Name, Area, City
   - GPS: Start Lat/Lng, End Lat/Lng, Accuracy
   - Notes, Next Action
5. Use Arabic column headers (RTL support)
6. Support large datasets (stream if needed)

Requirements:
- Reuse existing visit filters logic from api/v1/visits.py
- Add proper error handling
- Set correct MIME type (application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)
- Add Content-Disposition header for download
- Support all existing visit filters (date range, rep, doctor, etc.)
- Add to api/v1/visits.py
```

---

### Task 5.2: PDF Export (Reports)

```
Create PDF export for reports:

1. Add reportlab أو weasyprint to requirements.txt (recommend reportlab for better Arabic support)
2. Create POST /api/v1/reports/export/pdf endpoint
3. Export rep performance, territory performance, product performance
4. Include:
   - Summary statistics
   - Tables with data
   - Charts/graphs (use matplotlib for server-side charts)
5. Support Arabic text (RTL layout)
6. Professional formatting

Requirements:
- Reuse existing report generation logic from services/reports.js or create Python equivalent
- Add proper error handling
- Set correct MIME type (application/pdf)
- Add Content-Disposition header for download
- Support date range filters
- Add to api/v1/reports.py (create if doesn't exist)
- Include Arabic font support for proper RTL rendering
```

---

## 🟢 Gemini Prompts

### Task 7.2: Arabic UI Review

```
Review the CRM frontend codebase for Arabic UI compliance:

1. Check all UI strings (buttons, labels, messages) in:
   - CRM/frontend/src/pages/*.jsx
   - CRM/frontend/src/components/*.jsx
   - CRM/frontend/src/visits/*.jsx
   - CRM/frontend/src/auth/*.jsx

2. Verify RTL (Right-to-Left) support:
   - Check CSS for direction: rtl
   - Check for proper text alignment
   - Check for proper icon positioning

3. Check Arabic translations accuracy:
   - Verify all strings are properly translated
   - Check for missing translations
   - Check for mixed Arabic/English

4. Identify missing Arabic strings:
   - List all hardcoded English strings
   - Suggest Arabic translations

5. Create comprehensive Arabic UI checklist document with:
   - Current status of each component
   - Missing translations list
   - RTL support status
   - Recommendations for improvements
   - Priority levels (P0, P1, P2)

Output format: Markdown document ready to save as ARABIC_UI_CHECKLIST.md
```

---

### Task 8.2: API Documentation

```
Create comprehensive API documentation for Dopamine CRM Suite:

1. Review all API endpoints in:
   - CRM/backend/api/v1/*.py
   - Focus on: auth.py, visits.py, doctors.py, pharmacies.py, reports.py

2. For each endpoint, document:
   - HTTP method and path
   - Description (in Arabic and English)
   - Authentication requirements
   - Request parameters (query, path, body)
   - Request body schema (JSON examples)
   - Response schema (JSON examples)
   - Error responses
   - Example curl commands

3. Create API_USAGE.md document with:
   - Overview section
   - Authentication section (JWT)
   - Endpoint groups:
     - Authentication
     - Visits
     - Doctors/HCPs
     - Pharmacies
     - Reports
     - Orders
     - Collections
   - Common patterns
   - Error handling
   - Rate limiting (if any)

4. Include Arabic translations for all descriptions

Output format: Markdown document ready to save as docs/API_USAGE.md
```

---

### Ad-hoc: Security Analysis

```
Analyze CRM/backend/core/security.py for security best practices:

1. Review JWT implementation:
   - Check token generation
   - Check token validation
   - Check expiration handling
   - Check secret management

2. Review RBAC implementation:
   - Check role checking logic
   - Check permission enforcement
   - Check role hierarchy

3. Check for security vulnerabilities:
   - SQL injection risks
   - XSS risks
   - CSRF protection
   - Authentication bypass risks
   - Authorization bypass risks

4. Review for common security anti-patterns:
   - Hardcoded secrets
   - Weak password hashing
   - Insecure token storage
   - Missing input validation

5. Suggest improvements:
   - Priority-based recommendations
   - Code examples for fixes
   - Best practices to follow

Output format: Markdown document with security analysis and recommendations
```

---

### Ad-hoc: GPS Tracking Planning

```
Help plan the GPS tracking implementation for Dopamine CRM:

1. Review Visit model (CRM/backend/models/crm.py):
   - Current GPS fields (start_lat, start_lng, start_accuracy, etc.)
   - Visit statuses
   - Relationships

2. Suggest GPS validation strategy:
   - Accuracy thresholds
   - Coordinate validation
   - Timestamp validation
   - Duplicate visit prevention

3. Suggest geofencing approach:
   - How to define geofences (per account, per territory)
   - How to validate visit locations
   - How to flag suspicious visits

4. Suggest conflict resolution for offline sync:
   - What happens when multiple devices sync same visit
   - Server vs client data priority
   - Conflict detection strategy

5. Create implementation checklist:
   - Backend tasks (endpoints, validation, etc.)
   - Frontend tasks (UI, GPS capture, etc.)
   - PWA tasks (offline storage, sync, etc.)
   - Testing tasks

Output format: Markdown document with detailed implementation plan and checklist
```

---

## 📋 Usage Instructions

### للـ Codex Cloud:

1. **افتح Codex Cloud**
2. **انسخ الـ Prompt** من القائمة أعلاه
3. **الصقه في Codex Cloud**
4. **راجع الكود المولد**
5. **انسخ الكود**
6. **الصقه في Cursor** في الملف المناسب
7. **Review, Test, Commit, PR**

### للـ Gemini:

1. **افتح Gemini**
2. **انسخ الـ Prompt** من القائمة أعلاه
3. **الصقه في Gemini**
4. **راجع المخرجات**
5. **انسخ المخرجات**
6. **احفظها في ملف** (أو استخدمها في Cursor)

---

## 🔍 Quick Reference

| Task | Tool | Prompt Location |
|------|------|----------------|
| Start/End Visit | Codex Cloud | Task 2.2 |
| IndexedDB Queue | Codex Cloud | Task 3.1 |
| Excel Export | Codex Cloud | Task 5.1 |
| PDF Export | Codex Cloud | Task 5.2 |
| Arabic UI Review | Gemini | Task 7.2 |
| API Documentation | Gemini | Task 8.2 |
| Security Analysis | Gemini | Ad-hoc |
| GPS Planning | Gemini | Ad-hoc |

---

## ⚠️ Important Notes

- ✅ **Always review AI-generated code** قبل الاستخدام
- ✅ **Test thoroughly** جميع الكود المولد
- ✅ **Follow project conventions** (naming, structure, etc.)
- ✅ **Update documentation** عند الحاجة
- ✅ **Commit frequently** مع رسائل واضحة

---

**التاريخ**: 2025-12-25  
**النسخة**: 1.0  
**آخر تحديث**: 2025-12-25



