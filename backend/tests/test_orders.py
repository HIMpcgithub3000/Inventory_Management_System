"""Order endpoint + business-rule tests (BR-3..6) including concurrency."""
from concurrent.futures import ThreadPoolExecutor
from decimal import Decimal


def _customer(client, email="buyer@example.com"):
    return client.post(
        "/customers", json={"full_name": "Buyer", "email": email, "phone": "1"}
    ).json()["id"]


def _product(client, sku, qty, price="10.00"):
    return client.post(
        "/products",
        json={"name": sku, "sku": sku, "price": price, "quantity_in_stock": qty},
    ).json()["id"]


def test_create_order_decrements_stock_and_computes_total(client):
    cid = _customer(client)
    pid = _product(client, "P1", qty=5, price="9.99")
    r = client.post("/orders", json={"customer_id": cid, "lines": [{"product_id": pid, "quantity": 3}]})
    assert r.status_code == 201
    body = r.json()
    # BR-6: server computes total = 3 * 9.99 = 29.97 (exact, no float drift)
    assert Decimal(body["total_amount"]) == Decimal("29.9700")
    # BR-5: stock reduced 5 -> 2
    assert client.get(f"/products/{pid}").json()["quantity_in_stock"] == 2


def test_multi_line_total(client):
    cid = _customer(client)
    p1 = _product(client, "M1", qty=10, price="2.50")
    p2 = _product(client, "M2", qty=10, price="3.00")
    r = client.post(
        "/orders",
        json={"customer_id": cid, "lines": [
            {"product_id": p1, "quantity": 2},
            {"product_id": p2, "quantity": 4},
        ]},
    )
    assert r.status_code == 201
    # 2*2.50 + 4*3.00 = 17.00
    assert Decimal(r.json()["total_amount"]) == Decimal("17.0000")


def test_client_supplied_total_is_ignored(client):
    cid = _customer(client)
    pid = _product(client, "IGN", qty=5, price="9.99")
    r = client.post(
        "/orders",
        json={"customer_id": cid, "total_amount": "0.01", "lines": [{"product_id": pid, "quantity": 2}]},
    )
    assert r.status_code == 201
    assert Decimal(r.json()["total_amount"]) == Decimal("19.9800")  # BR-6: client value ignored


def test_insufficient_stock_rejected_409_no_decrement(client):
    cid = _customer(client)
    pid = _product(client, "LOW", qty=5)
    r = client.post("/orders", json={"customer_id": cid, "lines": [{"product_id": pid, "quantity": 10}]})
    assert r.status_code == 409  # BR-4
    assert client.get(f"/products/{pid}").json()["quantity_in_stock"] == 5  # untouched


def test_partial_failure_rolls_back_entire_order(client):
    cid = _customer(client)
    ok = _product(client, "OK", qty=10)
    bad = _product(client, "BAD", qty=1)
    r = client.post(
        "/orders",
        json={"customer_id": cid, "lines": [
            {"product_id": ok, "quantity": 5},
            {"product_id": bad, "quantity": 5},  # insufficient -> whole order fails
        ]},
    )
    assert r.status_code == 409
    # All-or-nothing: the "OK" product must NOT have been decremented.
    assert client.get(f"/products/{ok}").json()["quantity_in_stock"] == 10
    assert len(client.get("/orders").json()) == 0


def test_unknown_product_404(client):
    cid = _customer(client)
    r = client.post(
        "/orders",
        json={"customer_id": cid, "lines": [
            {"product_id": "00000000-0000-0000-0000-000000000000", "quantity": 1}
        ]},
    )
    assert r.status_code == 404


def test_unknown_customer_404(client):
    pid = _product(client, "C404", qty=5)
    r = client.post(
        "/orders",
        json={"customer_id": "00000000-0000-0000-0000-000000000000",
              "lines": [{"product_id": pid, "quantity": 1}]},
    )
    assert r.status_code == 404


def test_get_and_delete_order(client):
    cid = _customer(client)
    pid = _product(client, "GD", qty=5)
    oid = client.post("/orders", json={"customer_id": cid, "lines": [{"product_id": pid, "quantity": 2}]}).json()["id"]
    assert client.get(f"/orders/{oid}").status_code == 200
    # cancel restocks (ADR-005): 3 -> 5
    assert client.delete(f"/orders/{oid}").status_code == 204
    assert client.get(f"/orders/{oid}").status_code == 404
    assert client.get(f"/products/{pid}").json()["quantity_in_stock"] == 5


def test_concurrent_orders_for_last_unit(client):
    """Two simultaneous orders for the last unit: exactly one succeeds (BR-4 concurrency)."""
    cid = _customer(client)
    pid = _product(client, "RACE", qty=1)

    def place():
        # Each thread gets its own TestClient/connection -> real concurrent transactions.
        from fastapi.testclient import TestClient
        from app.main import app
        with TestClient(app) as c:
            return c.post(
                "/orders", json={"customer_id": cid, "lines": [{"product_id": pid, "quantity": 1}]}
            ).status_code

    with ThreadPoolExecutor(max_workers=2) as pool:
        codes = sorted(f.result() for f in [pool.submit(place), pool.submit(place)])

    assert codes == [201, 409]  # exactly one winner
    assert client.get(f"/products/{pid}").json()["quantity_in_stock"] == 0
