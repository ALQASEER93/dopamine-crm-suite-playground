# دليل استخدام الأدوات - Dopamine CRM Suite
## Tools Usage Guide for AI-Assisted Development

**التاريخ**: 2025-12-25  
**الهدف**: دليل شامل لاستخدام جميع الأدوات المتاحة

---

## 🛠️ الأدوات المتاحة

1. **Cursor** (أنت - كبير المهندسين)
2. **Codex CLI** (Automation & Scripts)
3. **Codex Cloud** (Code Generation)
4. **Gemini** (Documentation & Analysis)

---

## 1️⃣ Cursor (أنت - كبير المهندسين)

### متى تستخدم Cursor؟
- ✅ **Design & Architecture**: تصميم الحلول والمعمارية
- ✅ **Code Review**: مراجعة الكود قبل merge
- ✅ **Direct Implementation**: تنفيذ مباشر للمهام المعقدة
- ✅ **Integration**: دمج الكود المولد من أدوات أخرى
- ✅ **Testing**: كتابة وتشغيل الاختبارات
- ✅ **Git Operations**: Branching, Committing, PR Creation

### كيفية الاستخدام:

#### للبدء بمهمة جديدة:
```powershell
# 1. Create branch
git checkout -b cursor/task-name

# 2. Work in Cursor (make changes)

# 3. Test changes
cd CRM/backend
python -m pytest -q

# 4. Commit
git add .
git commit -m "feat: implement RBAC endpoint protection"

# 5. Push & Create PR
git push origin cursor/task-name
# Then create PR on GitHub
```

#### للتنفيذ المباشر:
- فتح الملفات في Cursor
- إجراء التغييرات مباشرة
- استخدام Cursor AI للاقتراحات
- Test → Commit → PR

---

## 2️⃣ Codex CLI

### متى تستخدم Codex CLI؟
- ✅ **Batch Operations**: عمليات متكررة على ملفات متعددة
- ✅ **Scripts Generation**: توليد scripts تلقائياً
- ✅ **Code Refactoring**: إعادة هيكلة الكود على نطاق واسع
- ✅ **Database Migrations**: توليد migration scripts
- ✅ **Test Generation**: توليد tests تلقائياً

### كيفية الاستخدام:

#### Setup Codex CLI:
```powershell
# Install (if not already installed)
# Follow Codex CLI installation guide

# Authenticate
codex auth login

# Configure project
codex project init
```

#### أمثلة الاستخدام:

**1. Generate Test Files:**
```powershell
codex generate tests --source CRM/backend/api/v1/visits.py --output CRM/backend/tests/test_visits_gps.py
```

**2. Batch Refactoring:**
```powershell
codex refactor --pattern "require_roles" --replace "@require_roles('admin')" --files CRM/backend/api/v1/*.py
```

**3. Generate Migration:**
```powershell
codex generate migration --model Visit --add-field "flags:JSON" --output CRM/backend/alembic/versions/xxxx_add_visit_flags.py
```

### Codex CLI Prompts (انسخ والصق):

**لتوليد Tests:**
```
Generate pytest tests for CRM/backend/api/v1/visits.py:
- Test all endpoints
- Test RBAC scenarios
- Test GPS validation
- Test error cases
- Use fixtures from tests/conftest.py
```

**لتوليد Migration:**
```
Generate Alembic migration to add 'flags' JSON field to Visit model:
- Field name: flags
- Type: JSON
- Nullable: True
- Default: {}
```

---

## 3️⃣ Codex Cloud

### متى تستخدم Codex Cloud？
- ✅ **Complex Code Generation**: توليد كود معقد (full features)
- ✅ **API Development**: تطوير endpoints جديدة
- ✅ **Service Layer**: تطوير service layer logic
- ✅ **Database Queries**: كتابة queries معقدة
- ✅ **Utility Functions**: وظائف مساعدة

### كيفية الاستخدام:

#### الخطوات:
1. **انسخ الـ Prompt** من `MASTER_EXECUTION_PLAN.md`
2. **الصق في Codex Cloud**
3. **راجع الكود المولد**
4. **انسخ الكود**
5. **الصق في Cursor** في الملف المناسب
6. **Review & Test** في Cursor
7. **Commit & PR**

#### أمثلة Prompts (من الخطة):

**لـ Excel Export (Task 5.1):**
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

**لـ IndexedDB Queue (Task 3.1):**
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

### Best Practices:
- ✅ **Be Specific**: اذكر الملفات، الـ functions، الـ requirements
- ✅ **Provide Context**: اذكر الملفات الموجودة للـ reference
- ✅ **Review Carefully**: راجع الكود المولد دائماً قبل use
- ✅ **Test Thoroughly**: اختبر الكود المولد بشكل شامل

---

## 4️⃣ Gemini

### متى تستخدم Gemini؟
- ✅ **Documentation**: كتابة وتوليد documentation
- ✅ **Code Analysis**: تحليل الكود وتقديم recommendations
- ✅ **Planning**: مساعدة في التخطيط
- ✅ **Review**: مراجعة الكود من منظور best practices
- ✅ **Arabic Content**: محتوى عربي (UI strings, docs)

### كيفية الاستخدام:

#### للـ Documentation:
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

#### للـ Code Analysis:
```
Analyze CRM/backend/core/security.py for security best practices:

1. Review JWT implementation
2. Check for security vulnerabilities
3. Review RBAC implementation
4. Suggest improvements
5. Check for common security anti-patterns
```

#### للـ Planning:
```
Help plan the GPS tracking implementation:

1. Review Visit model (models/crm.py)
2. Suggest GPS validation strategy
3. Suggest geofencing approach
4. Suggest conflict resolution for offline sync
5. Create implementation checklist
```

### Best Practices:
- ✅ **Ask Specific Questions**: اسأل أسئلة محددة
- ✅ **Provide Context**: اعطي context كافي
- ✅ **Review Output**: راجع المخرجات دائماً
- ✅ **Use for Documentation**: استخدمه للـ docs أكثر من code

---

## 🔄 Workflow Integration

### Typical Workflow:

```
1. Planning (Cursor)
   └─> Review requirements
   └─> Design solution
   └─> Create task in MASTER_EXECUTION_PLAN.md

2. Implementation Options:
   
   Option A: Direct (Cursor)
   └─> Implement directly in Cursor
   └─> Test
   └─> Commit & PR
   
   Option B: Code Generation (Codex Cloud)
   └─> Copy prompt from plan
   └─> Generate code in Codex Cloud
   └─> Review & copy to Cursor
   └─> Test
   └─> Commit & PR
   
   Option C: Automation (Codex CLI)
   └─> Use Codex CLI for batch operations
   └─> Review output
   └─> Test
   └─> Commit & PR

3. Documentation (Gemini)
   └─> Generate/update docs
   └─> Review
   └─> Commit

4. Review & Merge (Cursor)
   └─> Code review
   └─> Merge PR
   └─> Update progress tracking
```

---

## 📋 Checklist لكل أداة

### قبل استخدام Codex Cloud:
- [ ] Copied prompt from MASTER_EXECUTION_PLAN.md
- [ ] Reviewed requirements
- [ ] Have context files ready (for reference)

### بعد استخدام Codex Cloud:
- [ ] Reviewed generated code
- [ ] Copied to correct file location
- [ ] Integrated with existing code
- [ ] Tested functionality
- [ ] Checked for errors/warnings

### قبل استخدام Codex CLI:
- [ ] Authenticated (`codex auth login`)
- [ ] Project configured
- [ ] Backup important files
- [ ] Understand what command will do

### بعد استخدام Codex CLI:
- [ ] Reviewed changes
- [ ] Tested output
- [ ] Checked for errors
- [ ] Verified no breaking changes

### قبل استخدام Gemini:
- [ ] Clear question/request
- [ ] Provided context
- [ ] Know what output format needed

### بعد استخدام Gemini:
- [ ] Reviewed output
- [ ] Verified accuracy
- [ ] Applied to project (if code)
- [ ] Updated documentation (if docs)

---

## 🎯 Quick Reference

### Codex Cloud Prompts (من MASTER_EXECUTION_PLAN.md):

| Task | Prompt Location | File to Create/Update |
|------|----------------|----------------------|
| Excel Export | Task 5.1 | `CRM/backend/api/v1/visits.py` |
| PDF Export | Task 5.2 | `CRM/backend/api/v1/reports.py` |
| IndexedDB Queue | Task 3.1 | `ALQASEER-PWA/lib/offline-db.ts` |
| Start/End Visit | Task 2.2 | `CRM/backend/api/v1/visits.py` |

### Gemini Prompts:

| Task | Purpose | Output |
|------|---------|--------|
| Arabic UI Review | Task 7.2 | `ARABIC_UI_CHECKLIST.md` |
| Security Analysis | Ad-hoc | Security recommendations |
| Planning | Ad-hoc | Implementation checklist |

### Codex CLI Commands:

| Purpose | Command Template |
|---------|-----------------|
| Generate Tests | `codex generate tests --source <file> --output <test_file>` |
| Generate Migration | `codex generate migration --model <Model> --add-field <field>` |
| Refactor | `codex refactor --pattern <pattern> --replace <replacement> --files <files>` |

---

## ⚠️ Important Notes

### Security:
- ❌ **Never commit API keys**: Always use `.env` files
- ❌ **Never commit passwords**: Use environment variables
- ✅ **Review generated code**: Always review AI-generated code
- ✅ **Test thoroughly**: Test all AI-generated code

### Quality:
- ✅ **Code Review**: Review all code before commit
- ✅ **Testing**: Run tests before commit
- ✅ **Documentation**: Update docs when needed
- ✅ **Git Hygiene**: Small, focused commits

### Best Practices:
- ✅ **Use right tool for right task**: Don't force tools
- ✅ **Review AI output**: Don't blindly trust AI
- ✅ **Test everything**: Test all changes
- ✅ **Document decisions**: Document architectural decisions

---

**التاريخ**: 2025-12-25  
**النسخة**: 1.0  
**آخر تحديث**: 2025-12-25



