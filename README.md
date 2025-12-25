# Dopamine CRM Suite - نظام إدارة علاقات العملاء لشركات الأدوية

**نظام CRM متكامل لشركات الأدوية الناشئة**

[![CI Status](https://github.com/YOUR_USERNAME/dopamine-crm-suite/workflows/CI/badge.svg)](https://github.com/YOUR_USERNAME/dopamine-crm-suite/actions)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## 📋 نظرة عامة

Dopamine CRM Suite هو نظام CRM متكامل مخصص لشركات الأدوية الناشئة، يوفر إدارة شاملة للمندوبين الطبيين ومندوبي المبيعات، مع تتبع GPS للزيارات، تقارير متقدمة، ودعم العمل offline عبر PWA.

### الميزات الرئيسية

- ✅ **إدارة الزيارات مع GPS**: تتبع دقيق للزيارات مع إحداثيات GPS و timestamps
- ✅ **RBAC متعدد الأدوار**: Admin, Medical Rep, Sales Rep, Supervisor
- ✅ **PWA مع Offline Support**: عمل offline مع sync تلقائي
- ✅ **تقارير متقدمة**: أداء المندوبين، المبيعات، المنتجات
- ✅ **تصدير البيانات**: CSV, Excel, PDF
- ✅ **واجهة عربية**: UI عربي كامل مع Dark Mode
- ✅ **خرائط Google Maps**: تصور الزيارات والمسارات

---

## 🏗️ البنية (Architecture)

المشروع مبني على معمارية **Monorepo** ويتكون من:

```
dopamine-crm-suite/
├── CRM/
│   ├── backend/          # FastAPI Backend (Python)
│   └── frontend/         # React SPA (Vite)
├── ALQASEER-PWA/         # Progressive Web App (Next.js)
├── AI-Orchestrator/      # AI Agents System
└── docs/                 # Documentation
```

### Technology Stack

**Backend:**
- FastAPI (Python 3.11+)
- SQLAlchemy (ORM)
- SQLite (Development) / PostgreSQL (Production)
- JWT Authentication
- Pydantic (Validation)

**Frontend:**
- React 18+
- Vite
- React Query
- Tailwind CSS (Dark Mode)

**PWA:**
- Next.js
- Service Worker
- IndexedDB (Offline Storage)
- Firebase (Push Notifications)

---

## 🚀 البدء السريع

### المتطلبات الأساسية

- Python 3.11+
- Node.js 18+
- Git
- PowerShell 5+ (Windows)

### التثبيت والتشغيل

#### 1. Clone المشروع

```powershell
git clone https://github.com/YOUR_USERNAME/dopamine-crm-suite.git
cd dopamine-crm-suite
```

#### 2. Backend Setup

```powershell
cd CRM/backend

# Install dependencies
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

# Initialize database
python -m main init-db

# Run development server
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Default Credentials:**
- Admin: `admin@example.com` / `password`
- Rep: `rep@example.com` / `password`

#### 3. Frontend Setup

```powershell
cd CRM/frontend

# Install dependencies
npm ci

# Run development server
npm run dev -- --host --port 5173
```

#### 4. PWA Setup

```powershell
cd ALQASEER-PWA

# Install dependencies
npm ci

# Build for production
npm run build
```

### URLs

- **Backend API**: http://127.0.0.1:8000/api/v1
- **Frontend**: http://127.0.0.1:5173
- **API Docs**: http://127.0.0.1:8000/docs

---

## 📚 الوثائق

- [Senior Engineer Review](SENIOR_ENGINEER_REVIEW.md) - تقرير مراجعة شامل
- [Master Execution Plan](MASTER_EXECUTION_PLAN.md) - خطة العمل الكاملة
- [Tools Usage Guide](TOOLS_USAGE_GUIDE.md) - دليل استخدام الأدوات
- [Run on Windows](RUN_ON_WINDOWS.md) - دليل التشغيل على Windows
- [AGENTS.md](AGENTS.md) - قواعد عمل الوكيل

---

## 🧪 الاختبارات

### Backend Tests

```powershell
cd CRM/backend
python -m pytest -q
```

### Frontend Tests

```powershell
cd CRM/frontend
npm run test:ci
npm run build
```

### PWA Tests

```powershell
cd ALQASEER-PWA
npm run build
```

---

## 📊 الحالة الحالية

### ✅ ما تم إنجازه

- ✅ بنية المشروع الأساسية (Backend, Frontend, PWA)
- ✅ Authentication & RBAC foundation
- ✅ Visit model مع GPS fields
- ✅ CRUD APIs للـ Doctors, Pharmacies, Products, Orders
- ✅ Reports APIs (Rep, Territory, Product Performance)
- ✅ CSV Export للزيارات
- ✅ CI/CD workflows
- ✅ AI Agents System

### 🚧 قيد العمل

- 🔄 RBAC Endpoint Protection
- 🔄 GPS Tracking Implementation (Start/End Visit)
- 🔄 Offline Queue & Sync
- 🔄 Customer List Integration

### 📋 المخطط

- ⏳ Excel/PDF Exports
- ⏳ Maps Integration & Geofencing
- ⏳ UI/UX Polish
- ⏳ Test Coverage Expansion

**انظر [MASTER_EXECUTION_PLAN.md](MASTER_EXECUTION_PLAN.md) للتفاصيل الكاملة**

---

## 🤝 المساهمة

### Git Workflow

1. Create branch: `git checkout -b cursor/feature-name`
2. Make changes
3. Test changes: `python -m pytest -q` (backend) or `npm run build` (frontend)
4. Commit: `git commit -m "feat: description"`
5. Push: `git push origin cursor/feature-name`
6. Create PR on GitHub

### Branch Naming

- `cursor/feature-name` - Features
- `cursor/fix-name` - Bug fixes
- `codex/feature-name` - Codex-generated features

### Commit Messages

- `feat: add GPS validation`
- `fix: RBAC endpoint protection`
- `docs: update README`
- `test: add RBAC tests`

---

## 📝 الرخصة

هذا المشروع محمي بحقوق النشر. جميع الحقوق محفوظة.

---

## 📞 التواصل

للاستفسارات والدعم، يرجى فتح issue على GitHub.

---

**التاريخ**: 2025-12-25  
**الإصدار**: 1.0.0



