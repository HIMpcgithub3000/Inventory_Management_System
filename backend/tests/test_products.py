"""Product endpoint + business-rule tests (BR-1, BR-3, BR-7..9)."""


def _make_product(client, sku="SKU-1", qty=5, price="9.99", name="Widget"):
    return client.post(
        "/products",
        json={"name": name, "sku": sku, "price": price, "quantity_in_stock": qty},
    )


def test_create_and_get_product(client):
    r = _make_product(client)
    assert r.status_code == 201
    body = r.json()
    assert body["sku"] == "SKU-1"
    assert body["quantity_in_stock"] == 5
    assert body["price"] == "9.9900"  # DECIMAL, exact

    pid = body["id"]
    r2 = client.get(f"/products/{pid}")
    assert r2.status_code == 200
    assert r2.json()["id"] == pid


def test_list_products(client):
    _make_product(client, sku="A")
    _make_product(client, sku="B")
    r = client.get("/products")
    assert r.status_code == 200
    assert len(r.json()) == 2


def test_duplicate_sku_rejected_409(client):
    assert _make_product(client, sku="DUP").status_code == 201
    r = _make_product(client, sku="DUP")
    assert r.status_code == 409  # BR-1


def test_negative_stock_rejected_422(client):
    r = client.post(
        "/products",
        json={"name": "X", "sku": "NEG", "price": "1.00", "quantity_in_stock": -1},
    )
    assert r.status_code == 422  # BR-3 / BR-9 (boundary validation)


def test_invalid_body_rejected_422(client):
    r = client.post("/products", json={"name": "", "sku": "", "price": "-5"})
    assert r.status_code == 422


def test_update_product(client):
    pid = _make_product(client, sku="UPD").json()["id"]
    r = client.put(f"/products/{pid}", json={"price": "12.50", "quantity_in_stock": 8})
    assert r.status_code == 200
    assert r.json()["price"] == "12.5000"
    assert r.json()["quantity_in_stock"] == 8


def test_update_to_existing_sku_conflicts_409(client):
    _make_product(client, sku="ONE")
    pid = _make_product(client, sku="TWO").json()["id"]
    r = client.put(f"/products/{pid}", json={"sku": "ONE"})
    assert r.status_code == 409


def test_delete_product_204_then_404(client):
    pid = _make_product(client, sku="DEL").json()["id"]
    assert client.delete(f"/products/{pid}").status_code == 204
    assert client.get(f"/products/{pid}").status_code == 404


def test_get_missing_product_404(client):
    r = client.get("/products/00000000-0000-0000-0000-000000000000")
    assert r.status_code == 404


def test_sku_reusable_after_soft_delete(client):
    pid = _make_product(client, sku="REUSE").json()["id"]
    assert client.delete(f"/products/{pid}").status_code == 204
    # Same SKU can be used again now that the old product is soft-deleted (ADR-005).
    assert _make_product(client, sku="REUSE").status_code == 201


def test_low_stock_filter(client):
    _make_product(client, sku="LOW", qty=2)
    _make_product(client, sku="HIGH", qty=100)
    r = client.get("/products?low_stock=true&threshold=10")
    assert r.status_code == 200
    skus = {p["sku"] for p in r.json()}
    assert skus == {"LOW"}
