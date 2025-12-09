Write-Host "=== Dev check: CRM2 backend ===" -ForegroundColor Cyan
Set-Location "D:\projects 2\crm2\backend"
npm test
npm run lint
npm run build

Write-Host "=== Dev check: PWA ===" -ForegroundColor Cyan
Set-Location "C:\Users\M S I\Desktop\pwa crm\dopamine-pwa"
npm test
npm run lint
npm run build

Write-Host "=== Dev check: AI Orchestrator (dry run monitor) ===" -ForegroundColor Cyan
Set-Location "C:\\Users\\M\ S\ I\\ALQASEER_CRM_SUITE_FINAL\\AI-Orchestrator"
npm run monitor -- --dry-run

