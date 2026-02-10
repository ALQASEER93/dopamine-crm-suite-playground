# MERGE_DECISION

## Decision
Ready to merge once PR is created from web UI and required checks pass.

## Blockers
- Mobile app PR creation returns HTTP 400 for current flow.
- Use browser UI fallback as documented in OWNER_ACTIONS.md.

## Mobile compatibility update
- Binary `.zip` artifacts were converted to text placeholders to avoid `الملفات الثنائية غير مدعومة` during PR creation from mobile.
