# Backend Overview

Core FastAPI CRM API for Dopamine Pharma. Base path: `/api/v1`.

## Health
- `GET /api/v1/health` — Service heartbeat with DB info and version.

## Auth
- `POST /api/v1/auth/login` — Issue JWT for valid credentials.
- `GET /api/v1/auth/me` — Current user profile.

## Doctors
- `GET /api/v1/doctors` — List (filters + pagination).
- `POST /api/v1/doctors` — Create doctor.
- `GET /api/v1/doctors/{id}` — Fetch doctor.
- `PUT /api/v1/doctors/{id}` — Update doctor.

## Pharmacies
- `GET /api/v1/pharmacies` — List (filters + pagination).
- `POST /api/v1/pharmacies` — Create pharmacy.
- `GET /api/v1/pharmacies/{id}` — Fetch pharmacy.
- `PUT /api/v1/pharmacies/{id}` — Update pharmacy.

## Products
- `GET /api/v1/products` — List products.
- `POST /api/v1/products` — Create product.
- `PUT /api/v1/products/{id}` — Update product.

## Reps & Routes
- `GET /api/v1/reps` — List active medical reps.
- `GET /api/v1/routes` — List routes (pagination, filter by rep).
- `POST /api/v1/routes` — Create route with accounts.
- `GET /api/v1/routes/{id}` — Fetch route.

## Visits
- `GET /api/v1/visits` — List visits (filters + pagination).
- `POST /api/v1/visits` — Create visit.

## Orders
- `GET /api/v1/orders` — List orders.
- `POST /api/v1/orders` — Create order with lines.
- `GET /api/v1/orders/{id}` — Fetch order.
- `GET /api/v1/orders/{id}/lines` — List order lines.

## Stock
- `GET /api/v1/stock/locations` — List stock locations.
- `POST /api/v1/stock/locations` — Create stock location.
- `GET /api/v1/stock/movements` — List stock movements.
- `POST /api/v1/stock/movements` — Create stock movement.

## Targets
- `GET /api/v1/targets` — List targets.
- `POST /api/v1/targets` — Create target.

## Collections
- `GET /api/v1/collections` — List collections.
- `POST /api/v1/collections` — Create collection.
