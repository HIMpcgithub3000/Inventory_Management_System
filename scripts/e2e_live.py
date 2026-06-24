"""Adversarial end-to-end test against the LIVE running stack."""
import concurrent.futures as cf
import sys
import uuid
from decimal import Decimal

import httpx

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"
c = httpx.Client(base_url=BASE, timeout=15)
P, F = 0, 0
def ok(label, cond, extra=""):
    global P, F
    if cond: P += 1; print(f"  \033[32m✓\033[0m {label}")
    else: F += 1; print(f"  \033[31m✗\033[0m {label}  {extra}")

def u(): return uuid.uuid4().hex[:8]
ZERO_UUID = "00000000-0000-0000-0000-000000000000"

print("== 1. Validation / boundary (BR-9) ==")
ok("empty body -> 422", c.post("/products", json={}).status_code == 422)
ok("blank name -> 422", c.post("/products", json={"name":"","sku":u(),"price":"1","quantity_in_stock":1}).status_code == 422)
ok("negative price -> 422", c.post("/products", json={"name":"x","sku":u(),"price":"-1","quantity_in_stock":1}).status_code == 422)
ok("negative stock -> 422", c.post("/products", json={"name":"x","sku":u(),"price":"1","quantity_in_stock":-1}).status_code == 422)
ok("non-integer stock -> 422", c.post("/products", json={"name":"x","sku":u(),"price":"1","quantity_in_stock":1.5}).status_code == 422)
ok("price >4 decimals -> 422", c.post("/products", json={"name":"x","sku":u(),"price":"1.123456","quantity_in_stock":1}).status_code == 422)
ok("bad email -> 422", c.post("/customers", json={"full_name":"x","email":"nope"}).status_code == 422)
ok("malformed uuid path -> 422", c.get("/products/not-a-uuid").status_code == 422)

print("== 2. Products CRUD + unique SKU (BR-1) ==")
sku = f"SKU-{u()}"
r = c.post("/products", json={"name":"Widget","sku":sku,"price":"9.99","quantity_in_stock":5})
ok("create product 201", r.status_code == 201, r.text)
pid = r.json()["id"]
ok("price stored exact DECIMAL", r.json()["price"] == "9.9900", r.json().get("price"))
ok("has created_at/updated_at", "created_at" in r.json() and "updated_at" in r.json())
ok("dup SKU -> 409", c.post("/products", json={"name":"W2","sku":sku,"price":"1","quantity_in_stock":1}).status_code == 409)
ok("get product 200", c.get(f"/products/{pid}").status_code == 200)
ok("get missing product 404", c.get(f"/products/{ZERO_UUID}").status_code == 404)
r = c.put(f"/products/{pid}", json={"price":"12.50","quantity_in_stock":8})
ok("update product 200", r.status_code == 200 and r.json()["price"] == "12.5000")
ok("update missing 404", c.put(f"/products/{ZERO_UUID}", json={"price":"1"}).status_code == 404)
# PUT to an existing other SKU -> 409
sku2 = f"SKU-{u()}"
pid2 = c.post("/products", json={"name":"B","sku":sku2,"price":"1","quantity_in_stock":1}).json()["id"]
ok("update to existing SKU -> 409", c.put(f"/products/{pid}", json={"sku":sku2}).status_code == 409)

print("== 3. Customers + unique email (BR-2) ==")
email = f"a-{u()}@example.com"
r = c.post("/customers", json={"full_name":"Ada","email":email,"phone":"+1-555"})
ok("create customer 201", r.status_code == 201)
cid = r.json()["id"]
ok("dup email -> 409", c.post("/customers", json={"full_name":"A2","email":email}).status_code == 409)
ok("dup email CASE-insensitive -> 409", c.post("/customers", json={"full_name":"A3","email":email.upper()}).status_code == 409)
ok("get missing customer 404", c.get(f"/customers/{ZERO_UUID}").status_code == 404)

print("== 4. Orders: total computed server-side (BR-6), decrement (BR-5) ==")
# fresh product w/ stock 10, price 0.10 to probe float drift
pf = c.post("/products", json={"name":"Float","sku":f"F-{u()}","price":"0.10","quantity_in_stock":10}).json()["id"]
r = c.post("/orders", json={"customer_id":cid,"total_amount":"999.99","lines":[{"product_id":pf,"quantity":3}]})
ok("order 201", r.status_code == 201, r.text)
ok("client total IGNORED, server computes 0.30", r.json()["total_amount"] == "0.3000", r.json().get("total_amount"))
ok("stock decremented 10->7", c.get(f"/products/{pf}").json()["quantity_in_stock"] == 7)
oid = r.json()["id"]
ok("order has lines w/ unit_price+line_total", r.json()["lines"][0]["line_total"] == "0.3000")
ok("get order 200", c.get(f"/orders/{oid}").status_code == 200)

print("== 5. Multi-line total exactness (no float drift) ==")
pa = c.post("/products", json={"name":"A","sku":f"A-{u()}","price":"0.10","quantity_in_stock":100}).json()["id"]
pb = c.post("/products", json={"name":"B","sku":f"B-{u()}","price":"0.20","quantity_in_stock":100}).json()["id"]
r = c.post("/orders", json={"customer_id":cid,"lines":[{"product_id":pa,"quantity":1},{"product_id":pb,"quantity":1}]})
# 0.10 + 0.20 = 0.30 exactly (would be 0.30000000000000004 with float)
ok("0.10+0.20 == 0.3000 exact", r.json()["total_amount"] == "0.3000", r.json().get("total_amount"))

print("== 6. Insufficient stock (BR-4) + all-or-nothing ==")
ps = c.post("/products", json={"name":"S","sku":f"S-{u()}","price":"1","quantity_in_stock":5}).json()["id"]
ok("over-order -> 409", c.post("/orders", json={"customer_id":cid,"lines":[{"product_id":ps,"quantity":10}]}).status_code == 409)
ok("stock untouched after 409", c.get(f"/products/{ps}").json()["quantity_in_stock"] == 5)
# partial failure: good line + bad line -> whole order rolls back
pg = c.post("/products", json={"name":"G","sku":f"G-{u()}","price":"1","quantity_in_stock":10}).json()["id"]
pbad = c.post("/products", json={"name":"X","sku":f"X-{u()}","price":"1","quantity_in_stock":1}).json()["id"]
r = c.post("/orders", json={"customer_id":cid,"lines":[{"product_id":pg,"quantity":5},{"product_id":pbad,"quantity":5}]})
ok("partial-fail order -> 409", r.status_code == 409)
ok("good line NOT decremented (rollback)", c.get(f"/products/{pg}").json()["quantity_in_stock"] == 10)

print("== 7. Unknown refs / bad order bodies ==")
ok("unknown product -> 404", c.post("/orders", json={"customer_id":cid,"lines":[{"product_id":ZERO_UUID,"quantity":1}]}).status_code == 404)
ok("unknown customer -> 404", c.post("/orders", json={"customer_id":ZERO_UUID,"lines":[{"product_id":pf,"quantity":1}]}).status_code == 404)
ok("empty lines -> 422", c.post("/orders", json={"customer_id":cid,"lines":[]}).status_code == 422)
ok("qty 0 -> 422", c.post("/orders", json={"customer_id":cid,"lines":[{"product_id":pf,"quantity":0}]}).status_code == 422)
ok("qty negative -> 422", c.post("/orders", json={"customer_id":cid,"lines":[{"product_id":pf,"quantity":-2}]}).status_code == 422)
ok("dup product in one order -> 422", c.post("/orders", json={"customer_id":cid,"lines":[{"product_id":pf,"quantity":1},{"product_id":pf,"quantity":1}]}).status_code == 422)

print("== 8. Cancel order restocks (ADR-005) ==")
pr = c.post("/products", json={"name":"R","sku":f"R-{u()}","price":"1","quantity_in_stock":5}).json()["id"]
o = c.post("/orders", json={"customer_id":cid,"lines":[{"product_id":pr,"quantity":3}]}).json()
ok("stock 5->2 after order", c.get(f"/products/{pr}").json()["quantity_in_stock"] == 2)
ok("cancel order 204", c.delete(f"/orders/{o['id']}").status_code == 204)
ok("stock restored 2->5", c.get(f"/products/{pr}").json()["quantity_in_stock"] == 5)
ok("cancelled order gone 404", c.get(f"/orders/{o['id']}").status_code == 404)
ok("double-cancel -> 404", c.delete(f"/orders/{o['id']}").status_code == 404)

print("== 9. Soft delete integrity ==")
# delete a product that has historical orders -> order history must survive
ph = c.post("/products", json={"name":"H","sku":f"H-{u()}","price":"2","quantity_in_stock":5}).json()["id"]
oh = c.post("/orders", json={"customer_id":cid,"lines":[{"product_id":ph,"quantity":2}]}).json()
ok("delete referenced product 204", c.delete(f"/products/{ph}").status_code == 204)
ok("deleted product hidden from list", all(p["id"] != ph for p in c.get("/products").json()))
ok("deleted product get -> 404", c.get(f"/products/{ph}").status_code == 404)
ok("historical order STILL retrievable", c.get(f"/orders/{oh['id']}").status_code == 200)
ok("can't order a deleted product -> 404", c.post("/orders", json={"customer_id":cid,"lines":[{"product_id":ph,"quantity":1}]}).status_code == 404)
# delete customer with orders
ok("delete referenced customer 204", c.delete(f"/customers/{cid}").status_code == 204)
ok("deleted customer get -> 404", c.get(f"/customers/{cid}").status_code == 404)
ok("can't order for deleted customer -> 404", c.post("/orders", json={"customer_id":cid,"lines":[{"product_id":pf,"quantity":1}]}).status_code == 404)

print("== 10. HTTP semantics / error envelope ==")
ok("unknown route -> 404", c.get("/does-not-exist").status_code == 404)
r = c.request("PATCH", f"/products/{pid}")
ok("unsupported method -> 405", r.status_code == 405, str(r.status_code))
r = c.post("/orders", json={"customer_id":cid,"lines":[{"product_id":pf,"quantity":99999}]})
body = r.json()
ok("error envelope has title/status/detail", all(k in body for k in ("title","status","detail")), str(body))
ok("error carries traceId", "traceId" in body and body["traceId"])
ok("X-Correlation-ID header present", "x-correlation-id" in {k.lower() for k in r.headers})
ok("no stack trace leak", "Traceback" not in r.text and "psycopg" not in r.text)

print("== 11. /api/v1 alias works ==")
ok("/api/v1/products 200", c.get("/api/v1/products").status_code == 200)
ok("/api/v1/stats/summary 200", c.get("/api/v1/stats/summary").status_code == 200)

print("== 12. Dashboard stats + low-stock ==")
s = c.get("/stats/summary").json()
ok("stats has all 4 counts", all(k in s for k in ("total_products","total_customers","total_orders","low_stock_count")))
ok("low_stock_threshold present", "low_stock_threshold" in s)
low = c.get("/products?low_stock=true&threshold=3").json()
ok("low_stock filter returns only <threshold", all(p["quantity_in_stock"] < 3 for p in low))

print("== 13. Health / readiness ==")
ok("/health 200", c.get("/health").status_code == 200)
ok("/health/ready 200 (db up)", c.get("/health/ready").status_code == 200)

print("== 14. CONCURRENCY: 8 parallel orders for last 1 unit ==")
prace = c.post("/products", json={"name":"Race","sku":f"RACE-{u()}","price":"1","quantity_in_stock":1}).json()["id"]
cust2 = c.post("/customers", json={"full_name":"Racer","email":f"r-{u()}@e.com"}).json()["id"]
def place():
    with httpx.Client(base_url=BASE, timeout=15) as cc:
        return cc.post("/orders", json={"customer_id":cust2,"lines":[{"product_id":prace,"quantity":1}]}).status_code
with cf.ThreadPoolExecutor(max_workers=8) as ex:
    codes = [f.result() for f in [ex.submit(place) for _ in range(8)]]
wins = codes.count(201); losses = codes.count(409)
ok(f"exactly ONE winner (got {wins}x201, {losses}x409)", wins == 1 and losses == 7, str(codes))
ok("final stock == 0 (no oversell)", c.get(f"/products/{prace}").json()["quantity_in_stock"] == 0)

print(f"\n=== RESULT: {P} passed, {F} failed ===")
sys.exit(1 if F else 0)
