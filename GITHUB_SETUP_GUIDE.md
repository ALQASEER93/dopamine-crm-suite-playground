# دليل إعداد GitHub - Dopamine CRM Suite
## GitHub Setup Guide

**التاريخ**: 2025-12-25  
**الهدف**: رفع المشروع إلى GitHub كمشروع جديد

---

## 📋 الخطوات

### 1. إعداد Repository على GitHub

#### أ) إنشاء Repository جديد

1. اذهب إلى GitHub.com
2. Click على **"New repository"**
3. املأ المعلومات:
   - **Repository name**: `dopamine-crm-suite`
   - **Description**: `CRM System for Pharmaceutical Companies - نظام CRM لشركات الأدوية`
   - **Visibility**: Private (أو Public حسب رغبتك)
   - **❌ DO NOT** initialize with README, .gitignore, or license (سنضيفها من المشروع)
4. Click **"Create repository"**

---

### 2. إعداد Git في المشروع المحلي

#### أ) التحقق من Git Status

```powershell
# افتح PowerShell في مجلد المشروع
cd "C:\vs code crm\Dopamine-CRM-FULL-Suite"

# تحقق من Git status
git status
```

#### ب) إذا لم يكن Git initialized:

```powershell
# Initialize Git
git init

# Add all files
git add .

# Initial commit
git commit -m "Initial commit: Dopamine CRM Suite"
```

#### ج) إذا كان Git موجود بالفعل:

```powershell
# تحقق من وجود commits
git log --oneline

# إذا لم يكن هناك commits:
git add .
git commit -m "Initial commit: Dopamine CRM Suite"
```

---

### 3. ربط المشروع بـ GitHub

#### أ) إضافة Remote

```powershell
# استبدل YOUR_USERNAME بـ GitHub username الخاص بك
git remote add origin https://github.com/YOUR_USERNAME/dopamine-crm-suite.git

# التحقق من remote
git remote -v
```

#### ب) Push إلى GitHub

```powershell
# Push إلى main branch
git branch -M main
git push -u origin main
```

**ملاحظة**: إذا طُلب منك authentication:
- استخدم **Personal Access Token** (ليس password)
- أو استخدم **GitHub CLI** (`gh auth login`)

---

### 4. إعداد Branch Protection

#### أ) إعداد Branch Protection Rules

1. اذهب إلى GitHub Repository
2. Settings → Branches
3. Add rule:
   - **Branch name pattern**: `main`
   - **Require pull request reviews**: ✅ (1 reviewer)
   - **Require status checks**: ✅
     - `CRM Backend (FastAPI)`
     - `CRM Frontend (Vite/React)`
     - `ALQASEER PWA`
   - **Require branches to be up to date**: ✅
   - **Include administrators**: ✅

#### ب) إعداد Rulesets (Recommended)

1. Settings → Rules → Rulesets
2. Create new ruleset:
   - **Name**: `protect-main`
   - **Target branches**: `main`
   - **Status checks required**:
     - `CRM Backend (FastAPI)`
     - `CRM Frontend (Vite/React)`
     - `ALQASEER PWA`
   - **Require pull request**: ✅
   - **Require approvals**: 1

---

### 5. إعداد Secrets (للـ CI/CD)

#### أ) Repository Secrets

Settings → Secrets and variables → Actions → New repository secret:

**الـ Secrets المطلوبة:**

1. **OPENAI_API_KEY** (للـ Codex Review Bot)
   - Value: OpenAI API key الخاص بك
   - Used by: `.github/workflows/codex-review-bot.yml`

2. **JWT_SECRET** (للـ Backend)
   - Value: Generate secure random string
   - Command: `python -c "import secrets; print(secrets.token_urlsafe(32))"`
   - Used by: Backend authentication

3. **DATABASE_URL** (للـ Production - Optional)
   - Value: PostgreSQL connection string (if using)
   - Format: `postgresql+psycopg://user:pass@host:5432/db`

---

### 6. التحقق من CI/CD

#### أ) التحقق من Workflows

بعد push، اذهب إلى **Actions** tab:

1. يجب أن ترى workflows running
2. يجب أن تمر جميع checks:
   - ✅ CRM Backend (FastAPI)
   - ✅ CRM Frontend (Vite/React)
   - ✅ ALQASEER PWA

#### ب) إذا فشلت Checks:

- راجع logs في Actions tab
- أصلح المشاكل
- Commit & push التغييرات

---

### 7. إعداد .env.example

#### أ) إنشاء .env.example للـ Backend

```powershell
# في CRM/backend
New-Item -Path ".env.example" -ItemType File
```

**محتوى `.env.example`:**

```env
# Environment
DPM_ENV=development

# Database
DATABASE_URL=sqlite:///./data/fastapi.db
PROD_DATABASE_URL=postgresql+psycopg://user:pass@host:5432/db

# JWT
JWT_SECRET=your-secret-key-here-change-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRES_MINUTES=60

# Admin
DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_PASSWORD=password
DEFAULT_ADMIN_RESET=false

# SQL Logging
ECHO_SQL=false
PROD_ECHO_SQL=false

# AI (Optional)
OPENAI_API_KEY=
LLM_PROVIDER=none
```

#### ب) Commit .env.example

```powershell
git add CRM/backend/.env.example
git commit -m "docs: add .env.example for backend"
git push
```

---

### 8. إعداد README.md

#### أ) تحديث README.md

الملف موجود بالفعل (`README.md` في root)، لكن تأكد من تحديث:
- Repository URL
- Badge URLs (CI, License)
- أي معلومات خاصة بمشروعك

#### ب) Commit & Push

```powershell
git add README.md
git commit -m "docs: update README with GitHub links"
git push
```

---

## ✅ Checklist

قبل اعتبار المشروع جاهز:

- [ ] Repository created on GitHub
- [ ] Git initialized locally
- [ ] Remote added
- [ ] Initial commit pushed
- [ ] Branch protection enabled
- [ ] Rulesets configured
- [ ] Secrets added (OPENAI_API_KEY, JWT_SECRET)
- [ ] CI/CD workflows passing
- [ ] .env.example created
- [ ] README.md updated
- [ ] .gitignore configured correctly

---

## 🔒 Security Checklist

- [ ] ✅ No secrets in code (use .env files)
- [ ] ✅ .env files in .gitignore
- [ ] ✅ .env.example committed (without real values)
- [ ] ✅ GitHub Secrets configured
- [ ] ✅ Branch protection enabled
- [ ] ✅ No hardcoded passwords
- [ ] ✅ JWT_SECRET is strong (32+ characters)

---

## 📝 Next Steps

بعد إعداد GitHub:

1. ✅ **Start Phase 0**: ابدأ بـ RBAC Protection (Task 1.1)
2. ✅ **Follow Plan**: اتبع `MASTER_EXECUTION_PLAN.md`
3. ✅ **Create PRs**: Always use branches + PRs
4. ✅ **Track Progress**: Update progress في `MASTER_EXECUTION_PLAN.md`

---

## 🆘 Troubleshooting

### Error: "remote origin already exists"

```powershell
# Remove existing remote
git remote remove origin

# Add new remote
git remote add origin https://github.com/YOUR_USERNAME/dopamine-crm-suite.git
```

### Error: "Authentication failed"

```powershell
# Use Personal Access Token instead of password
# Or use GitHub CLI:
gh auth login
gh repo set-default YOUR_USERNAME/dopamine-crm-suite
```

### Error: "CI checks failing"

1. Check Actions tab for errors
2. Review workflow files (`.github/workflows/*.yml`)
3. Fix issues locally
4. Test locally before pushing

---

## 📚 مراجع إضافية

- [GitHub Docs - Creating a repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository)
- [GitHub Docs - Branch protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches)
- [GitHub Docs - Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

---

**التاريخ**: 2025-12-25  
**النسخة**: 1.0  
**آخر تحديث**: 2025-12-25



