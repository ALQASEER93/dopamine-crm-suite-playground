# Script لإعداد GitHub Repository تلقائياً
# Dopamine CRM Suite - GitHub Setup Script

param(
    [Parameter(Mandatory=$true)]
    [string]$GitHubUsername,
    
    [Parameter(Mandatory=$false)]
    [string]$RepositoryName = "dopamine-crm-suite",
    
    [Parameter(Mandatory=$false)]
    [string]$RemoteUrl = $null
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Dopamine CRM Suite - GitHub Setup" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# تحديد مجلد المشروع (الـ script يعمل من root)
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

Write-Host "📁 Project Root: $ProjectRoot" -ForegroundColor Green
Write-Host ""

# 1. التحقق من Git
Write-Host "1️⃣ Checking Git status..." -ForegroundColor Yellow
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Git is not installed. Please install Git first." -ForegroundColor Red
    exit 1
}

# 2. Initialize Git إذا لم يكن موجود
if (-not (Test-Path ".git")) {
    Write-Host "2️⃣ Initializing Git repository..." -ForegroundColor Yellow
    git init
    Write-Host "✅ Git initialized" -ForegroundColor Green
} else {
    Write-Host "✅ Git already initialized" -ForegroundColor Green
}

# 3. Add all files
Write-Host "3️⃣ Adding files to Git..." -ForegroundColor Yellow
git add .
Write-Host "✅ Files added" -ForegroundColor Green

# 4. Initial commit إذا لم يكن موجود
$commitCount = (git rev-list --count HEAD 2>$null)
if ($commitCount -eq 0 -or $null -eq $commitCount) {
    Write-Host "4️⃣ Creating initial commit..." -ForegroundColor Yellow
    git commit -m "Initial commit: Dopamine CRM Suite"
    Write-Host "✅ Initial commit created" -ForegroundColor Green
} else {
    Write-Host "✅ Commits already exist ($commitCount commits)" -ForegroundColor Green
}

# 5. Set branch to main
Write-Host "5️⃣ Setting branch to main..." -ForegroundColor Yellow
git branch -M main
Write-Host "✅ Branch set to main" -ForegroundColor Green

# 6. Add remote
if ($null -eq $RemoteUrl) {
    $RemoteUrl = "https://github.com/$GitHubUsername/$RepositoryName.git"
}

Write-Host "6️⃣ Setting up remote..." -ForegroundColor Yellow
$existingRemote = git remote get-url origin 2>$null
if ($existingRemote) {
    Write-Host "⚠️  Remote 'origin' already exists: $existingRemote" -ForegroundColor Yellow
    $response = Read-Host "Do you want to update it? (y/n)"
    if ($response -eq "y" -or $response -eq "Y") {
        git remote set-url origin $RemoteUrl
        Write-Host "✅ Remote updated" -ForegroundColor Green
    } else {
        Write-Host "⏭️  Skipping remote update" -ForegroundColor Yellow
    }
} else {
    git remote add origin $RemoteUrl
    Write-Host "✅ Remote added: $RemoteUrl" -ForegroundColor Green
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "✅ GitHub setup completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "1. Create repository on GitHub: https://github.com/new" -ForegroundColor White
Write-Host "   - Repository name: $RepositoryName" -ForegroundColor White
Write-Host "   - ❌ DO NOT initialize with README, .gitignore, or license" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. Push to GitHub:" -ForegroundColor White
Write-Host "   git push -u origin main" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Or use the automated push script:" -ForegroundColor White
Write-Host "   .\scripts\push-to-github.ps1 -GitHubUsername $GitHubUsername" -ForegroundColor Cyan
Write-Host ""



