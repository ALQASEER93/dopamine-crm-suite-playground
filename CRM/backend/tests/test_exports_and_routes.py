from __future__ import annotations

from datetime import date


def _get_first_id(client, endpoint: str, headers: dict[str, str], key: str = "id") -> int:
    resp = client.get(endpoint, headers=headers)
    assert resp.status_code == 200, resp.text
    payload = resp.json()
    items = payload.get("data") if isinstance(payload, dict) else payload
    assert items, f"No items returned for {endpoint}"
    return items[0][key]


def test_products_import_and_export(client, auth_headers):
    export_resp = client.get("/api/v1/products/export", headers=auth_headers)
    assert export_resp.status_code == 200
    assert "text/csv" in export_resp.headers.get("content-type", "")

    csv_body = "code,name,line,pack,cost,selling_price,bonus_rules,is_active\n"
    csv_body += "PX-TEST-1,Test Product,Line A,10,1.00,2.00,bonus,True\n"
    files = {"file": ("products.csv", csv_body, "text/csv")}
    import_resp = client.post("/api/v1/products/import", files=files, headers=auth_headers)
    assert import_resp.status_code == 201, import_resp.text
    payload = import_resp.json()
    assert payload["created"] >= 1


def test_orders_update_and_export(client, auth_headers):
    pharmacy_id = _get_first_id(client, "/api/v1/pharmacies", auth_headers)
    product_id = _get_first_id(client, "/api/v1/products", auth_headers)

    payload = {
        "order_date": date.today().isoformat(),
        "pharmacy_id": pharmacy_id,
        "status": "confirmed",
        "payment_status": "pending",
        "lines": [
            {"product_id": product_id, "quantity": 2, "price": "5.00", "discount": 0, "bonus": 0}
        ],
    }
    create_resp = client.post("/api/v1/orders", json=payload, headers=auth_headers)
    assert create_resp.status_code == 201, create_resp.text
    order_id = create_resp.json()["id"]

    update_payload = {
        "status": "delivered",
        "payment_status": "paid",
        "lines": [
            {"product_id": product_id, "quantity": 3, "price": "5.00", "discount": 0, "bonus": 0}
        ],
    }
    update_resp = client.put(f"/api/v1/orders/{order_id}", json=update_payload, headers=auth_headers)
    assert update_resp.status_code == 200, update_resp.text
    assert update_resp.json()["status"] == "delivered"

    export_resp = client.get("/api/v1/orders/export", headers=auth_headers)
    assert export_resp.status_code == 200
    assert "text/csv" in export_resp.headers.get("content-type", "")


def test_stock_exports(client, auth_headers):
    loc_resp = client.get("/api/v1/stock/locations/export", headers=auth_headers)
    assert loc_resp.status_code == 200
    assert "text/csv" in loc_resp.headers.get("content-type", "")

    mov_resp = client.get("/api/v1/stock/movements/export", headers=auth_headers)
    assert mov_resp.status_code == 200
    assert "text/csv" in mov_resp.headers.get("content-type", "")


def test_targets_exports(client, auth_headers):
    targets_resp = client.get("/api/v1/targets/export", headers=auth_headers)
    assert targets_resp.status_code == 200
    assert "text/csv" in targets_resp.headers.get("content-type", "")

    visit_targets_resp = client.get("/api/v1/visit-targets/export", headers=auth_headers)
    assert visit_targets_resp.status_code == 200
    assert "text/csv" in visit_targets_resp.headers.get("content-type", "")


def test_collections_export(client, auth_headers):
    export_resp = client.get("/api/v1/collections/export", headers=auth_headers)
    assert export_resp.status_code == 200
    assert "text/csv" in export_resp.headers.get("content-type", "")


def test_routes_crud_and_export(client, auth_headers):
    rep_id = _get_first_id(client, "/api/v1/reps", auth_headers)
    pharmacy_id = _get_first_id(client, "/api/v1/pharmacies", auth_headers)

    payload = {
        "name": "Route Alpha",
        "rep_id": rep_id,
        "frequency": "weekly",
        "notes": "Primary route",
        "accounts": [
            {"account_type": "pharmacy", "pharmacy_id": pharmacy_id, "visit_frequency": "weekly"}
        ],
    }
    create_resp = client.post("/api/v1/routes", json=payload, headers=auth_headers)
    assert create_resp.status_code == 201, create_resp.text
    route_id = create_resp.json()["id"]

    get_resp = client.get(f"/api/v1/routes/{route_id}", headers=auth_headers)
    assert get_resp.status_code == 200

    update_payload = {
        "name": "Route Alpha Updated",
        "notes": "Updated",
        "accounts": [
            {"account_type": "pharmacy", "pharmacy_id": pharmacy_id, "visit_frequency": "monthly"}
        ],
    }
    update_resp = client.put(f"/api/v1/routes/{route_id}", json=update_payload, headers=auth_headers)
    assert update_resp.status_code == 200, update_resp.text
    assert update_resp.json()["name"] == "Route Alpha Updated"

    export_resp = client.get("/api/v1/routes/export", headers=auth_headers)
    assert export_resp.status_code == 200
    assert "text/csv" in export_resp.headers.get("content-type", "")

    delete_resp = client.delete(f"/api/v1/routes/{route_id}", headers=auth_headers)
    assert delete_resp.status_code == 204
