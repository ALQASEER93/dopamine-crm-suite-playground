$ErrorActionPreference = "Stop"

param(
  [string]$Distro = "Ubuntu",
  [string]$Workspace = "~/aljazeera_workspace",
  [string]$WindowsLedgerDir = "C:\\Users\\M\ S\ I\\ALQASEER_CRM_SUITE_FINAL\AlJazeera\ledger_sqlite"
)

function Invoke-WSLCommand {
  param([string]$Command)
  Write-Host "WSL> $Command"
  wsl -d $Distro -- bash -lc "$Command"
}

$windowsSourceRoot = "C:\\Users\\M\ S\ I\\ALQASEER_CRM_SUITE_FINAL\AlJazeera"
$wslSourceRoot = "/mnt/d/CRM\ ALQASEER/AlJazeera"

Write-Host "Preparing WSL workspace at $Workspace ..."
try {
  Invoke-WSLCommand "mkdir -p $Workspace"
} catch {
  Write-Warning "Unable to reach WSL; please ensure the '$Distro' distribution is installed and running."
  return
}

$mdbScript = @'
#!/usr/bin/env bash
set -euo pipefail

MDB_FILE="${1:-}"
SQLITE_OUT="${2:-}"

if [[ -z "$MDB_FILE" || -z "$SQLITE_OUT" ]]; then
  echo "Usage: mdb_to_sqlite.sh <mdb_file> <sqlite_output>" >&2
  exit 1
fi

if [[ ! -f "$MDB_FILE" ]]; then
  echo "MDB file not found: $MDB_FILE" >&2
  exit 2
fi

tables=$(mdb-tables -1 "$MDB_FILE")

{
  echo "PRAGMA journal_mode=WAL;"
  for tbl in $tables; do
    mdb-export -I sqlite "$MDB_FILE" "$tbl"
  done
} | sqlite3 "$SQLITE_OUT"
echo "Exported $MDB_FILE -> $SQLITE_OUT"
 '@

Invoke-WSLCommand "cat > $Workspace/mdb_to_sqlite.sh <<'EOF'
$mdbScript
EOF
chmod +x $Workspace/mdb_to_sqlite.sh"

$conversionPlan = @(
  @{ Year = "2019"; Folder = "AljazeeraControl2019" },
  @{ Year = "2020"; Folder = "AljazeeraControl2020" },
  @{ Year = "2024"; Folder = "AljazeeraControl2024" },
  @{ Year = "Nine"; Folder = "Backup/AljazeeraControlNine" }
)

foreach ($item in $conversionPlan) {
  $year = $item.Year
  $folder = $item.Folder

  $targets = @(
    @{ Kind = "acc"; Path = "$wslSourceRoot/$folder/MainData/DataBaseAcc.mdb" },
    @{ Kind = "other"; Path = "$wslSourceRoot/$folder/Acc/DataOther.mdb" },
    @{ Kind = "stc"; Path = "$wslSourceRoot/$folder/Stc/DataOtherStc.mdb" }
  )

  foreach ($target in $targets) {
    $kind = $target.Kind
    $mdbPath = $target.Path
    $sqliteName = "ledger_${year}_${kind}.sqlite"
    $sqliteOut = "$Workspace/$sqliteName"

    try {
      Invoke-WSLCommand "if [ -f \"$mdbPath\" ]; then $Workspace/mdb_to_sqlite.sh \"$mdbPath\" \"$sqliteOut\"; else echo \"[warn] Missing $mdbPath\"; fi"
    } catch {
      Write-Warning "Failed to convert $mdbPath : $_"
    }
  }
}

Invoke-WSLCommand "mkdir -p /mnt/d/CRM\ ALQASEER/AlJazeera/ledger_sqlite && cp $Workspace/ledger_*_*.sqlite /mnt/d/CRM\ ALQASEER/AlJazeera/ledger_sqlite/ 2>/dev/null || true"

if (Test-Path $WindowsLedgerDir) {
  $zipPath = Join-Path $windowsSourceRoot "ledger_all_years.zip"
  Write-Host "Zipping SQLite outputs to $zipPath"
  Compress-Archive -Path (Join-Path $WindowsLedgerDir "*.sqlite") -DestinationPath $zipPath -Force -ErrorAction SilentlyContinue
} else {
  Write-Warning "Ledger output directory not found: $WindowsLedgerDir"
}

