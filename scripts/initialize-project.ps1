# Script لتهيئة المشروع تلقائياً
# Dopamine CRM Suite - Project Initialization

$ErrorActionPreference = "Stop"

Write-Host "🚀 Dopamine CRM Suite - Project Initialization" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# تحديد مجلد المشروع
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

Write-Host "📁 Project Root: $ProjectRoot" -ForegroundColor Green
Write-Host ""

# 1. التحقق من Python
Write-Host "1️⃣ Checking Python..." -ForegroundColor Yellow
$pythonVersion = python --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Python is not installed. Please install Python 3.11+" -ForegroundColor Red
    exit 1
}
Write-Host "✅ $pythonVersion" -ForegroundColor Green

# 2. التحقق من Node.js
Write-Host "2️⃣ Checking Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Node.js is not installed. Please install Node.js 18+" -ForegroundColor Red
    exit 1
}
Write-Host "✅ $nodeVersion" -ForegroundColor Green

# 3. Backend Setup
Write-Host "3️⃣ Setting up Backend..." -ForegroundColor Yellow
$backendPath = Join-Path $ProjectRoot "CRM\backend"
if (Test-Path $backendPath) {
    Set-Location $backendPath
    
    # Create .env.example if not exists
    $envExample = Join-Path $backendPath ".env.example"
    if (-not (Test-Path $envExample)) {
        @"
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
"@ | Out-File -FilePath $envExample -Encoding UTF8
        Write-Host "✅ Created .env.example" -ForegroundColor Green
    }
    
    # Install dependencies
    Write-Host "   Installing Python dependencies..." -ForegroundColor Yellow
    python -m pip install --upgrade pip --quiet
    python -m pip install -r requirements.txt --quiet
    Write-Host "   ✅ Backend dependencies installed" -ForegroundColor Green
    
    # Initialize database
    Write-Host "   Initializing database..." -ForegroundColor Yellow
    python -m main init-db 2>&1 | Out-Null
    Write-Host "   ✅ Database initialized" -ForegroundColor Green
    
    Set-Location $ProjectRoot
} else {
    Write-Host "⚠️  Backend directory not found" -ForegroundColor Yellow
}

# 4. Frontend Setup
Write-Host "4️⃣ Setting up Frontend..." -ForegroundColor Yellow
$frontendPath = Join-Path $ProjectRoot "CRM\frontend"
if (Test-Path $frontendPath) {
    Set-Location $frontendPath
    
    # Install dependencies
    Write-Host "   Installing Node.js dependencies..." -ForegroundColor Yellow
    npm ci --silent 2>&1 | Out-Null
    Write-Host "   ✅ Frontend dependencies installed" -ForegroundColor Green
    
    Set-Location $ProjectRoot
} else {
    Write-Host "⚠️  Frontend directory not found" -ForegroundColor Yellow
}

# 5. PWA Setup
Write-Host "5️⃣ Setting up PWA..." -ForegroundColor Yellow
$pwaPath = Join-Path $ProjectRoot "ALQASEER-PWA"
if (Test-Path $pwaPath) {
    Set-Location $pwaPath
    
    # Install dependencies
    Write-Host "   Installing Node.js dependencies..." -ForegroundColor Yellow
    npm ci --silent 2>&1 | Out-Null
    Write-Host "   ✅ PWA dependencies installed" -ForegroundColor Green
    
    Set-Location $ProjectRoot
} else {
    Write-Host "⚠️  PWA directory not found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "✅ Project initialization completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "1. Start Backend: cd CRM\backend && python -m uvicorn main:app --reload" -ForegroundColor White
Write-Host "2. Start Frontend: cd CRM\frontend && npm run dev" -ForegroundColor White
Write-Host "3. Setup GitHub: .\scripts\setup-github.ps1 -GitHubUsername YOUR_USERNAME" -ForegroundColor White
Write-Host ""



