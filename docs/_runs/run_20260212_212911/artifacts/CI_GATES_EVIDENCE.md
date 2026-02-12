# CI Gates Evidence (from GitHub checks)

## CRM Backend (FastAPI)
- state: SUCCESS
- link: https://github.com/ALQASEER93/dopamine-crm-suite-playground/actions/runs/21958590169/job/63429528634
- startedAt: 02/12/2026 18:10:34
- completedAt: 02/12/2026 18:11:09
- log evidence snippet:
```
CRM Backend (FastAPI)	Install node deps	﻿2026-02-12T18:10:44.9151683Z ##[group]Run npm ci
CRM Backend (FastAPI)	Install node deps	2026-02-12T18:10:44.9151980Z [36;1mnpm ci[0m
CRM Backend (FastAPI)	Install python deps	2026-02-12T18:10:53.3057381Z Collecting pytest<9.0,>=8.3.0 (from -r requirements.txt (line 14))
CRM Backend (FastAPI)	Install python deps	2026-02-12T18:10:53.3092482Z   Downloading pytest-8.4.2-py3-none-any.whl.metadata (7.7 kB)
CRM Backend (FastAPI)	Install python deps	2026-02-12T18:10:54.3259016Z Collecting iniconfig>=1 (from pytest<9.0,>=8.3.0->-r requirements.txt (line 14))
CRM Backend (FastAPI)	Install python deps	2026-02-12T18:10:54.3438602Z Collecting packaging>=20 (from pytest<9.0,>=8.3.0->-r requirements.txt (line 14))
CRM Backend (FastAPI)	Install python deps	2026-02-12T18:10:54.3593244Z Collecting pluggy<2,>=1.5 (from pytest<9.0,>=8.3.0->-r requirements.txt (line 14))
CRM Backend (FastAPI)	Install python deps	2026-02-12T18:10:54.3811340Z Collecting pygments>=2.7.2 (from pytest<9.0,>=8.3.0->-r requirements.txt (line 14))
CRM Backend (FastAPI)	Install python deps	2026-02-12T18:10:54.8847318Z Downloading pytest-8.4.2-py3-none-any.whl (365 kB)
CRM Backend (FastAPI)	Install python deps	2026-02-12T18:10:55.2578774Z Installing collected packages: passlib, websockets, uvloop, typing-extensions, sniffio, pyyaml, python-dotenv, PyJWT, pygments, psycopg2-binary, pluggy, packaging, iniconfig, idna, httptools, h11, greenlet, et-xmlfile, dnspython, click, certifi, bcrypt, annotated-types, uvicorn, typing-inspection, sqlalchemy, pytest, pydantic-core, openpyxl, httpcore, email-validator, anyio, watchfiles, starlette, pydantic, httpx, pydantic-settings, fastapi
CRM Backend (FastAPI)	Install python deps	2026-02-12T18:10:59.2527602Z Successfully installed PyJWT-2.11.0 annotated-types-0.7.0 anyio-4.12.1 bcrypt-5.0.0 certifi-2026.1.4 click-8.3.1 dnspython-2.8.0 email-validator-2.3.0 et-xmlfile-2.0.0 fastapi-0.115.14 greenlet-3.3.1 h11-0.16.0 httpcore-1.0.9 httptools-0.7.1 httpx-0.27.2 idna-3.11 iniconfig-2.3.0 openpyxl-3.1.5 packaging-26.0 passlib-1.7.4 pluggy-1.6.0 psycopg2-binary-2.9.11 pydantic-2.12.5 pydantic-core-2.41.5 pydantic-settings-2.12.0 pygments-2.19.2 pytest-8.4.2 python-dotenv-1.2.1 pyyaml-6.0.3 sniffio-1.3.1 sqlalchemy-2.0.46 starlette-0.46.2 typing-extensions-4.15.0 typing-inspection-0.4.2 uvicorn-0.30.6 uvloop-0.22.1 watchfiles-1.1.1 websockets-16.0
CRM Backend (FastAPI)	Pytest	﻿2026-02-12T18:10:59.6313048Z ##[group]Run python -m pytest -q
```

## CRM Frontend (Vite/React)
- state: SUCCESS
- link: https://github.com/ALQASEER93/dopamine-crm-suite-playground/actions/runs/21958590169/job/63429528623
- startedAt: 02/12/2026 18:10:33
- completedAt: 02/12/2026 18:10:50
- log evidence snippet:
```
CRM Frontend (Vite/React)	UNKNOWN STEP	2026-02-12T18:10:40.8071623Z ##[group]Run npm ci
CRM Frontend (Vite/React)	UNKNOWN STEP	2026-02-12T18:10:40.8071919Z [36;1mnpm ci[0m
CRM Frontend (Vite/React)	UNKNOWN STEP	2026-02-12T18:10:46.5975010Z ##[group]Run npm run build
CRM Frontend (Vite/React)	UNKNOWN STEP	2026-02-12T18:10:46.5975324Z [36;1mnpm run build[0m
```

## ALQASEER PWA
- state: SUCCESS
- link: https://github.com/ALQASEER93/dopamine-crm-suite-playground/actions/runs/21958590169/job/63429528619
- startedAt: 02/12/2026 18:10:33
- completedAt: 02/12/2026 18:10:54
- log evidence snippet:
```
ALQASEER PWA	Install deps	﻿2026-02-12T18:10:40.9771869Z ##[group]Run npm ci
ALQASEER PWA	Install deps	2026-02-12T18:10:40.9772257Z [36;1mnpm ci[0m
ALQASEER PWA	Build	﻿2026-02-12T18:10:48.2299405Z ##[group]Run npm run build
ALQASEER PWA	Build	2026-02-12T18:10:48.2299688Z [36;1mnpm run build[0m
```

