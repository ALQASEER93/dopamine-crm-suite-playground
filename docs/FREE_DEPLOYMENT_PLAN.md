# Free Deployment Plan (Office PC + Cloudflare Tunnel)

This plan runs the stack on a Windows office PC and exposes it securely with a free Cloudflare Tunnel.
It avoids Google Maps costs by using link-only map mode by default.

Important TLS note:
- TLS termination is handled by Cloudflare at the public edge.
- Keep local origin services private (localhost/internal network only) and do not expose port `80` directly.

## 0) Prerequisites

- Node.js 20+
- Python 3.11+
- Cloudflare account + a domain
- Windows PowerShell

## 1) Local services (Windows)

### Backend (FastAPI)

```powershell
cd D:\ALQASEER_DEV\dopamine-crm-suite_PLAYGROUND\CRM\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:DPM_ENV="production"
# REQUIRED: generate a unique strong secret and store it securely (do not keep placeholders)
$env:JWT_SECRET = [Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 } | ForEach-Object {[byte]$_}))
$env:PROD_DATABASE_URL="sqlite:///./data/fastapi.db"
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

### CRM frontend (static build)

```powershell
cd D:\ALQASEER_DEV\dopamine-crm-suite_PLAYGROUND\CRM\frontend
$env:VITE_API_BASE_URL="http://127.0.0.1:8000/api/v1"
npm ci
npm run build
npx serve -s dist -l 4173
```

### PWA (static build)

```powershell
cd D:\ALQASEER_DEV\dopamine-crm-suite_PLAYGROUND\ALQASEER-PWA
$env:VITE_API_BASE_URL="http://127.0.0.1:8000/api/v1"
$env:VITE_MAP_MODE="links"
$env:VITE_GOOGLE_MAPS_API_KEY=""
npm ci
npm run build
npx serve -s dist -l 4174
```

## 2) Cloudflare Tunnel (Free)

Install Cloudflare Tunnel:

```powershell
winget install --id Cloudflare.cloudflared
```

Authenticate and create a tunnel:

```powershell
cloudflared tunnel login
cloudflared tunnel create dpm-crm
```

Create DNS routes:

```powershell
cloudflared tunnel route dns dpm-crm crm.example.com
cloudflared tunnel route dns dpm-crm pwa.example.com
cloudflared tunnel route dns dpm-crm api.example.com
```

Create `C:\Users\<YOU>\.cloudflared\config.yml`:

```yaml
tunnel: dpm-crm
credentials-file: C:\Users\<YOU>\.cloudflared\dpm-crm.json

ingress:
  - hostname: api.example.com
    service: http://127.0.0.1:8000
  - hostname: crm.example.com
    service: http://127.0.0.1:4173
  - hostname: pwa.example.com
    service: http://127.0.0.1:4174
  - service: http_status:404
```

Run the tunnel:

```powershell
cloudflared tunnel run dpm-crm
```

## 3) Verification

```powershell
Invoke-WebRequest http://127.0.0.1:8000/api/v1/health
Start-Process http://crm.example.com
Start-Process http://pwa.example.com
```

## 4) SQLite backup (daily copy + rotation)

Backup script (PowerShell):

```powershell
$src = "D:\ALQASEER_DEV\dopamine-crm-suite_PLAYGROUND\CRM\backend\data\fastapi.db"
$dst = "D:\ALQASEER_DEV\dopamine-crm-suite_PLAYGROUND\_runs\db_backups"
New-Item -ItemType Directory -Force -Path $dst | Out-Null
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
Copy-Item $src (Join-Path $dst "fastapi_$stamp.db")

# Keep last 7
Get-ChildItem $dst -Filter "fastapi_*.db" | Sort-Object LastWriteTime -Descending | Select-Object -Skip 7 | Remove-Item
```

Schedule with Task Scheduler (daily at 2 AM), running the script above.
