# Script لدفع الكود إلى GitHub تلقائياً
# Dopamine CRM Suite - Push to GitHub Script

param(
    [Parameter(Mandatory=$false)]
    [string]$GitHubUsername = $null,
    
    [Parameter(Mandatory=$false)]
    [string]$RepositoryName = "dopamine-crm-suite",
    
    [Parameter(Mandatory=$false)]
    [switch]$Force = $false
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Pushing to GitHub..." -ForegroundColor Cyan
Write-Host "=======================" -ForegroundColor Cyan
Write-Host ""

# تحديد مجلد المشروع
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

# التحقق من remote
$remoteUrl = git remote get-url origin 2>$null
if (-not $remoteUrl) {
    if ($GitHubUsername) {
        $remoteUrl = "https://github.com/$GitHubUsername/$RepositoryName.git"
        git remote add origin $remoteUrl
        Write-Host "✅ Remote added: $remoteUrl" -ForegroundColor Green
    } else {
        Write-Host "❌ No remote found. Please run setup-github.ps1 first" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ Remote found: $remoteUrl" -ForegroundColor Green
}

# التحقق من التغييرات
$status = git status --porcelain
if ($status) {
    Write-Host "📝 Uncommitted changes found. Committing..." -ForegroundColor Yellow
    git add .
    git commit -m "chore: update project files"
    Write-Host "✅ Changes committed" -ForegroundColor Green
}

# Push
Write-Host "📤 Pushing to GitHub..." -ForegroundColor Yellow
try {
    if ($Force) {
        git push -u origin main --force
    } else {
        git push -u origin main
    }
    Write-Host "✅ Successfully pushed to GitHub!" -ForegroundColor Green
} catch {
    Write-Host "❌ Error pushing to GitHub. You may need to:" -ForegroundColor Red
    Write-Host "   1. Create repository on GitHub first" -ForegroundColor Yellow
    Write-Host "   2. Authenticate (use GitHub CLI: gh auth login)" -ForegroundColor Yellow
    Write-Host "   3. Or use Personal Access Token" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "✅ Done!" -ForegroundColor Green
Write-Host ""



