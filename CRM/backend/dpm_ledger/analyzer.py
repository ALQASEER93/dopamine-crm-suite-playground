from __future__ import annotations

from pathlib import Path
from typing import Dict, List

from sqlalchemy import create_engine, inspect, text

from dpm_ledger.config import DEFAULT_DB_DIR

REPORT_PATH = Path(__file__).resolve().parents[1] / "docs" / "dpm_ledger_schema_report.md"


def _approx_row_count(engine, table_name: str) -> int:
    try:
        with engine.connect() as conn:
            result = conn.execute(text(f"SELECT COUNT(*) FROM \"{table_name}\""))
            return int(result.scalar() or 0)
    except Exception:
        return -1


def analyze_sqlite(path: Path) -> Dict:
    engine = create_engine(f"sqlite:///{path}", connect_args={"check_same_thread": False})
    inspector = inspect(engine)
    tables: List[Dict] = []
    for table_name in inspector.get_table_names():
        columns = [
            f"{col['name']} ({col.get('type')})"
            for col in inspector.get_columns(table_name)
        ]
        tables.append(
            {
                "name": table_name,
                "columns": columns,
                "row_count": _approx_row_count(engine, table_name),
            }
        )
    return {"path": path, "tables": tables}


def generate_report(directory: Path = DEFAULT_DB_DIR, output_path: Path = REPORT_PATH) -> Path:
    directory.mkdir(parents=True, exist_ok=True)
    sqlite_files = sorted(directory.glob("ledger_*_*.sqlite"))
    sections: List[str] = []

    if not sqlite_files:
        sections.append("## No ledger SQLite files found\n")
        sections.append(f"Searched in `{directory}` and found none.\n")
    else:
        for db_file in sqlite_files:
            analysis = analyze_sqlite(db_file)
            sections.append(f"## {db_file.name}\n")
            if not analysis["tables"]:
                sections.append("_No tables discovered._\n")
                continue
            for table in analysis["tables"]:
                sections.append(f"### {table['name']}\n")
                columns = ", ".join(table["columns"]) or "No columns"
                row_count = table["row_count"]
                row_label = "unknown" if row_count < 0 else str(row_count)
                sections.append(f"- Columns: {columns}\n")
                sections.append(f"- Approx rows: {row_label}\n")
            sections.append("\n")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    content = "# DPM Ledger Schema Report\n\n" + "\n".join(sections)
    output_path.write_text(content, encoding="utf-8")
    return output_path


if __name__ == "__main__":
    generate_report()
