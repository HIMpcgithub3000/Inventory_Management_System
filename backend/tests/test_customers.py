"""Customer endpoint + business-rule tests (BR-2)."""


def _make_customer(client, email="ada@example.com", name="Ada Lovelace"):
    return client.post(
        "/customers",
        json={"full_name": name, "email": email, "phone": "+1-555-0100"},
    )


def test_create_and_get_customer(client):
    r = _make_customer(client)
    assert r.status_code == 201
    cid = r.json()["id"]
    assert client.get(f"/customers/{cid}").status_code == 200


def test_duplicate_email_rejected_409(client):
    assert _make_customer(client, email="dup@example.com").status_code == 201
    assert _make_customer(client, email="dup@example.com").status_code == 409  # BR-2


def test_duplicate_email_case_insensitive(client):
    assert _make_customer(client, email="Case@Example.com").status_code == 201
    assert _make_customer(client, email="case@example.com").status_code == 409


def test_invalid_email_rejected_422(client):
    r = client.post("/customers", json={"full_name": "X", "email": "not-an-email"})
    assert r.status_code == 422


def test_list_and_delete_customer(client):
    cid = _make_customer(client, email="del@example.com").json()["id"]
    assert len(client.get("/customers").json()) == 1
    assert client.delete(f"/customers/{cid}").status_code == 204
    assert client.get(f"/customers/{cid}").status_code == 404


def test_email_reusable_after_soft_delete(client):
    cid = _make_customer(client, email="reuse@example.com").json()["id"]
    assert client.delete(f"/customers/{cid}").status_code == 204
    assert _make_customer(client, email="reuse@example.com").status_code == 201


def test_delete_missing_customer_404(client):
    assert client.delete("/customers/00000000-0000-0000-0000-000000000000").status_code == 404
