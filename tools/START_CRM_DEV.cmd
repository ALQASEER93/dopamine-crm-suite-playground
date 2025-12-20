@echo off
setlocal

for %%I in ("%~dp0..") do set "ROOT=%%~fI"
set "BACKEND_PORT=8000"
set "FRONTEND_PORT=5173"
set "LOG_DIR=%ROOT%\tools\logs"
set "BACKEND_LOG=%LOG_DIR%\backend.log"
set "FRONTEND_LOG=%LOG_DIR%\frontend.log"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

call :check_port 127.0.0.1 %BACKEND_PORT% BACKEND_UP
if /I "%BACKEND_UP%"=="True" (
  echo [info] Backend already running on 127.0.0.1:%BACKEND_PORT%. Skipping start.
) else (
  echo [info] Starting backend...
  start "CRM Backend" powershell -NoProfile -NoExit -Command "Set-Location '%ROOT%\\CRM\\backend'; python -m pip install --upgrade pip; python -m pip install -r requirements.txt; python -m main init-db; python -m uvicorn main:app --host 127.0.0.1 --port %BACKEND_PORT% --reload 2>&1 | Tee-Object -FilePath '%BACKEND_LOG%'"
)

call :check_port 127.0.0.1 %FRONTEND_PORT% FRONTEND_UP
if /I "%FRONTEND_UP%"=="True" (
  echo [info] Frontend already running on 127.0.0.1:%FRONTEND_PORT%. Skipping start.
) else (
  echo [info] Starting frontend...
  start "CRM Frontend" powershell -NoProfile -NoExit -Command "Set-Location '%ROOT%\\CRM\\frontend'; if (-not (Test-Path 'node_modules')) { npm ci }; npm run dev -- --host --port %FRONTEND_PORT% 2>&1 | Tee-Object -FilePath '%FRONTEND_LOG%'"
)

call :wait_port 127.0.0.1 %BACKEND_PORT% "Backend" BACKEND_READY
call :wait_port 127.0.0.1 %FRONTEND_PORT% "Frontend" FRONTEND_READY

echo [info] Opening browser at http://127.0.0.1:%FRONTEND_PORT% ...
start "" "http://127.0.0.1:%FRONTEND_PORT%"

echo [summary] Backend reachable: %BACKEND_READY%
echo [summary] Frontend reachable: %FRONTEND_READY%
echo [info] Logs: %BACKEND_LOG% , %FRONTEND_LOG%
echo [info] Done. Re-running is safe; if ports are already in use, startup is skipped.
exit /b 0

:check_port
set "HOST=%~1"
set "PORT=%~2"
set "OUTVAR=%~3"
for /f %%A in ('powershell -NoProfile -Command "(Test-NetConnection -ComputerName '%HOST%' -Port %PORT%).TcpTestSucceeded"') do (
  set "%OUTVAR%=%%A"
)
exit /b 0

:wait_port
set "HOST=%~1"
set "PORT=%~2"
set "LABEL=%~3"
set "OUTVAR=%~4"
for /f %%A in ('powershell -NoProfile -Command "$label='%LABEL%'; $hostName='%HOST%'; $port=%PORT%; $deadline=(Get-Date).AddSeconds(60); Write-Host ('[wait] {0} on {1}:{2}...' -f $label,$hostName,$port); while ((Get-Date) -lt $deadline) { if ((Test-NetConnection -ComputerName $hostName -Port $port).TcpTestSucceeded) { Write-Output True; exit } ; Start-Sleep -Seconds 1 }; Write-Output False"') do (
  set "%OUTVAR%=%%A"
)
exit /b 0
