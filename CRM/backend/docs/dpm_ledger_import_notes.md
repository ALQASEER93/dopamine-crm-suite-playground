# DPM Ledger import notes

- Legacy data sources detected under `C:\\Users\\M\ S\ I\\ALQASEER_CRM_SUITE_FINAL\AlJazeera`:
  - `AljazeeraControl2019` (MainData, Acc, Stc)
  - `AljazeeraControl2020` (MainData, Acc, Stc)
  - `AljazeeraControl2024` (MainData, Acc, Stc)
  - Backups under `Backup\AljazeeraControlNine*` (multiple snapshots from 2019â€“2024)
- Target SQLite output directory: `C:\\Users\\M\ S\ I\\ALQASEER_CRM_SUITE_FINAL\AlJazeera\ledger_sqlite`
- Active year env var: `DPM_LEDGER_ACTIVE_YEAR` (default `2024`)
- Conversion script: `CRM/scripts/convert_aljazeera_mdb.ps1`
  - Uses WSL `mdb-tools` + `sqlite3` to export each MDB file into `ledger_<year>_{acc|other|stc}.sqlite`
  - Current run status: **not executed** here because WSL access was denied; run the script once WSL is available.
- Zip archive target after conversion: `C:\\Users\\M\ S\ I\\ALQASEER_CRM_SUITE_FINAL\AlJazeera\ledger_all_years.zip`

Update this file after running the conversion to list produced SQLite files and any mapping tweaks between legacy pharmacy IDs and CRM pharmacies.

