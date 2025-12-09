# WSL setup & MDB â†’ SQLite conversion

1) Open Ubuntu
- Start menu â†’ Ubuntu, or from PowerShell: `wsl -d Ubuntu`

2) Prepare workspace (inside Ubuntu)
```bash
mkdir -p ~/aljazeera_workspace
cd ~/aljazeera_workspace
```

3) Install tools (once)
```bash
sudo apt-get update
sudo apt-get install -y mdbtools sqlite3 unzip
```

4) Copy legacy data from Windows
- Windows root: `C:\\Users\\M\ S\ I\\ALQASEER_CRM_SUITE_FINAL\AlJazeera`
- WSL path: `/mnt/d/CRM\ ALQASEER/AlJazeera`
- Zips to unpack if present: `AljazeeraControl2024.zip`, `AljazeeraControl2020.zip`, `AlJazeera.zip`, backups under `Backup/`
```bash
cp /mnt/d/CRM\ ALQASEER/AlJazeera/*.zip .
unzip AljazeeraControl2024.zip -d year_2024   # repeat per zip/year
```

5) Create exporter script (inside Ubuntu)
```bash
cat > ~/aljazeera_workspace/mdb_to_sqlite.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
MDB_FILE="${1:-}"
SQLITE_OUT="${2:-}"
tables=$(mdb-tables -1 "$MDB_FILE")
{
  echo "PRAGMA journal_mode=WAL;"
  for tbl in $tables; do
    mdb-export -I sqlite "$MDB_FILE" "$tbl"
  done
} | sqlite3 "$SQLITE_OUT"
echo "Exported $MDB_FILE -> $SQLITE_OUT"
EOF
chmod +x ~/aljazeera_workspace/mdb_to_sqlite.sh
```

6) Export each year
- Paths to convert:
  - `MainData/DataBaseAcc.mdb` â†’ `ledger_<year>_acc.sqlite`
  - `Acc/DataOther.mdb` â†’ `ledger_<year>_other.sqlite`
  - `Stc/DataOtherStc.mdb` â†’ `ledger_<year>_stc.sqlite`
```bash
./mdb_to_sqlite.sh /mnt/d/CRM\ ALQASEER/AlJazeera/AljazeeraControl2024/MainData/DataBaseAcc.mdb ledger_2024_acc.sqlite
./mdb_to_sqlite.sh /mnt/d/CRM\ ALQASEER/AlJazeera/AljazeeraControl2024/Acc/DataOther.mdb ledger_2024_other.sqlite
./mdb_to_sqlite.sh /mnt/d/CRM\ ALQASEER/AlJazeera/AljazeeraControl2024/Stc/DataOtherStc.mdb ledger_2024_stc.sqlite
# Repeat for 2019, 2020, Nine/backups
```

7) Copy outputs back to Windows
```bash
mkdir -p /mnt/d/CRM\ ALQASEER/AlJazeera/ledger_sqlite
cp ledger_*_*.sqlite /mnt/d/CRM\ ALQASEER/AlJazeera/ledger_sqlite/
```

8) Zip outputs (Windows)
```powershell
Compress-Archive -Path "C:\\Users\\M\ S\ I\\ALQASEER_CRM_SUITE_FINAL\AlJazeera\ledger_sqlite\*.sqlite" -DestinationPath "C:\\Users\\M\ S\ I\\ALQASEER_CRM_SUITE_FINAL\AlJazeera\ledger_all_years.zip" -Force
```

Active ledger DB folder: `C:\\Users\\M\ S\ I\\ALQASEER_CRM_SUITE_FINAL\AlJazeera\ledger_sqlite`  
Active year env var: `DPM_LEDGER_ACTIVE_YEAR` (default `2024`).

