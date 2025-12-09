### PowerShell helpers

Daily monitor (real email):

```powershell
cd "C:\\Users\\M\ S\ I\\ALQASEER_CRM_SUITE_FINAL\\AI-Orchestrator"
powershell -ExecutionPolicy Bypass -File "C:\\Users\\M\ S\ I\\ALQASEER_CRM_SUITE_FINAL\\AI-Orchestrator\scripts\run-daily.ps1"
```

Daily monitor (dry-run, no real email):

```powershell
cd "C:\\Users\\M\ S\ I\\ALQASEER_CRM_SUITE_FINAL\\AI-Orchestrator"
powershell -ExecutionPolicy Bypass -File "C:\\Users\\M\ S\ I\\ALQASEER_CRM_SUITE_FINAL\\AI-Orchestrator\scripts\run-daily.ps1" -DryRun
```

Dev-check (CRM2 + PWA + monitor):

```powershell
cd "C:\\Users\\M\ S\ I\\ALQASEER_CRM_SUITE_FINAL\\AI-Orchestrator"
powershell -ExecutionPolicy Bypass -File "C:\\Users\\M\ S\ I\\ALQASEER_CRM_SUITE_FINAL\\AI-Orchestrator\scripts\dev-check.ps1"
```

