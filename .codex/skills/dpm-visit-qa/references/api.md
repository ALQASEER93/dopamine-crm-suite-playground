# DPM Visit QA API Reference

Base URL default: http://127.0.0.1:8000/api/v1

Auth
- POST /auth/login
  - body: {"email": "rep1@example.com", "password": "Rep12345!"}
  - response: {"token": "...", "user": {"id": ...}}

Doctors
- GET /doctors?page=1&page_size=1
  - requires medical_rep/admin/sales_manager

Visits
- POST /visits
  - body: {"visit_date": "YYYY-MM-DD", "rep_id": <rep_id>, "doctor_id": <doctor_id>, "notes": "..."}
- POST /visits/{id}/start
  - body: {"lat": 31.95, "lng": 35.91, "accuracy": 500, "override_reason": "..."}
- POST /visits/{id}/end
  - body: {"lat": 0.0, "lng": 0.0, "accuracy": 10, "override_reason": "..."}
- DELETE /visits/{id}

Tracking
- POST /devices/register
  - body: {"platform": "android", "device_label": "QA Device"}
- POST /location-events/batch
  - body: {"events": [{"device_id": <id>, "ts": "ISO", "lat": 31.95, "lng": 35.91, "accuracy_m": 12, "source": "qa"}]}
- GET /reps/{rep_id}/tracking-status
- GET /reps/tracking-status?rep_id=<rep_id> (admin/supervisor)

GPS policy defaults (server-side)
- gps_min_accuracy_m = 50
- gps_max_distance_m = 150
- geofence_radius_m = 150
