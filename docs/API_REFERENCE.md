# DOPAMINE CRM API Reference

Base URL (local dev): `http://127.0.0.1:8000/api/v1`  
Auth: `Authorization: Bearer <JWT>`

Deployment note: field/staging/production clients must use deployed HTTPS API hosts via env vars (`VITE_API_BASE_URL`, CRM fallback `VITE_API_URL`, and Next-based PWA fallback chain `NEXT_PUBLIC_CRM2_API_BASE` -> `NEXT_PUBLIC_API_BASE`).

## Auth

- `POST /auth/login`
- `GET /auth/me`

## Samples (Arabic-first workflows)

### Products
- `GET /samples/products`  
  يعرض منتجات العينات المتاحة.
- `POST /samples/products`  
  إنشاء منتج عينة جديد (Admin/Sales Manager).

### Inventory
- `GET /samples/inventory?rep_id=&location_type=`  
  عرض رصيد العينات في المستودع أو لدى المندوب.
- `POST /samples/inventory/adjust`  
  تعديل الكميات (`delta`) مع خيار تحديد `reorder_level`.

### Distribution
- `POST /samples/distribute`  
  تسجيل توزيع عينة لطبيب/صيدلية مع خصم الكمية من رصيد المندوب.
- `GET /samples/history?page=&page_size=&rep_id=&sample_product_id=&from_date=&to_date=`  
  سجل التوزيع مع pagination وفلاتر زمنية.

### Requests
- `POST /samples/request`  
  إنشاء طلب عينات من المندوب.
- `GET /samples/request?page=&page_size=&status=&rep_id=`  
  متابعة الطلبات حسب الحالة والمندوب.
- `PATCH /samples/request/{request_id}/status`  
  اعتماد/رفض/تنفيذ الطلب، وعند `fulfilled` يتم النقل من المخزون المركزي إلى المندوب.

## Medical Affairs

### Events
- `GET /medical-affairs/events?page=&page_size=&q=&status=&from_date=&to_date=`
- `POST /medical-affairs/events`
- `GET /medical-affairs/events/{event_id}`
- `PATCH /medical-affairs/events/{event_id}`

### Attendance
- `POST /medical-affairs/events/{event_id}/attendees`
- `GET /medical-affairs/events/{event_id}/attendees`
- `PATCH /medical-affairs/events/{event_id}/attendees/{attendee_id}`

### KOL Directory
- `GET /medical-affairs/kols?page=&page_size=&q=&city=`
- `POST /medical-affairs/kols`
- `PATCH /medical-affairs/kols/{kol_id}`

### Scientific Materials
- `GET /medical-affairs/materials?page=&page_size=&q=&material_type=&therapeutic_area=`
- `POST /medical-affairs/materials`
- `PATCH /medical-affairs/materials/{material_id}`

### Medical Reports
- `GET /medical-affairs/reports/event-roi`
- `GET /medical-affairs/reports/kol-engagement`

## PWA-compatible Endpoints

- `POST /samples/distribute` (offline queue supported)
- `POST /samples/request` (offline queue supported)
- `POST /visits/{id}/start`
- `POST /visits/{id}/end`

## Notes

- Default seeded users:
  - `<ADMIN_EMAIL> / <ADMIN_PASSWORD>`
  - `<SALES_MANAGER_EMAIL> / <SALES_MANAGER_PASSWORD>`
  - `<REP1_EMAIL> / <REP1_PASSWORD>`
- OpenAPI docs available at:
  - `http://127.0.0.1:8000/docs`
  - `http://127.0.0.1:8000/redoc`
