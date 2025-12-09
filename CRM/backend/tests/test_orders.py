from __future__ import annotations

from datetime import date


def test_create_order_with_lines(client, auth_headers):
    # Ensure we have a pharmacy and product from seeds
    pharmacies = client.get("/api/v1/pharmacies", headers=auth_headers).json()["data"]
    pharmacy_id = pharmacies[0]["id"]
    products = client.get("/api/v1/products", headers=auth_headers).json()["data"]
    product_id = products[0]["id"]

    payload = {
        "order_date": date.today().isoformat(),
        "pharmacy_id": pharmacy_id,
        "status": "confirmed",
        "payment_status": "pending",
        "lines": [
            {
                "product_id": product_id,
                "quantity": 5,
                "price": "10.00",
                "discount": 0,
                "bonus": 1,
            }
        ],
    }
    resp = client.post("/api/v1/orders", json=payload, headers=auth_headers)
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["pharmacy_id"] == pharmacy_id
    assert body["lines"][0]["product_id"] == product_id
    assert float(body["total_amount"]) > 0
