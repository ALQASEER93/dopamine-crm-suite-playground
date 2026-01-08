---
name: dpm-visit-qa
description: Run API smoke tests for visits lifecycle, GPS enforcement, and tracking status in the DPM CRM backend. Use when you need a repo-scoped QA workflow that logs in with a test rep account, creates and cleans up test visits, and writes a Markdown report to docs/_runs/visit_qa_<timestamp>.md while avoiding production data.
---

# DPM Visit QA

Use this skill to run backend API smoke tests for:
- Visits lifecycle (create -> start -> end -> delete)
- GPS enforcement (accuracy + distance)
- Rep tracking status (device + location events)

## Run

1) Ensure the backend API is running locally.
2) Run the script:

```bash
python .codex/skills/dpm-visit-qa/scripts/run_visit_qa.py
```

## Configuration

The script uses these defaults:
- Base URL: `http://127.0.0.1:8000/api/v1`
- Test rep: `rep1@example.com`
- Password: `Rep12345!`

Override via env vars:
- `DPM_VISIT_QA_BASE_URL`
- `DPM_VISIT_QA_EMAIL`
- `DPM_VISIT_QA_PASSWORD`
- `DPM_VISIT_QA_ALLOW_PROD=1` (required if base URL is not localhost)

## Output

A report is written to:
- `docs/_runs/visit_qa_<timestamp>.md`

## Notes

- The script will create a test visit and always attempt to delete it.
- Device cleanup is not available in the API; the report will note this.

## References

See `references/api.md` for the endpoints and payloads used.
