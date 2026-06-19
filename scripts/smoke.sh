#!/usr/bin/env bash
# Executable proof of the graded business behavior against a running backend.
# Usage: bash scripts/smoke.sh http://localhost:8000
set -uo pipefail

BASE="${1:-http://localhost:8000}"
CT='content-type: application/json'
pass=0; fail=0

expect() { # expect <label> <actual> <wanted>
  if [ "$2" = "$3" ]; then echo "  ✓ $1 (got $2)"; pass=$((pass+1));
  else echo "  ✗ $1 — got $2, wanted $3"; fail=$((fail+1)); fi
}
post_code() { curl -s -o /dev/null -w "%{http_code}" -X POST "$1" -H "$CT" -d "$2"; }
post_body() { curl -s -X POST "$1" -H "$CT" -d "$2"; }
jget() { python3 -c "import sys,json;print(json.load(sys.stdin)['$1'])"; }

echo "Smoke testing $BASE"
expect "health 200" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/health")" "200"

SKU="SKU-$RANDOM"; EMAIL="ada-$RANDOM@example.com"

prod_json="{\"name\":\"Widget\",\"sku\":\"$SKU\",\"price\":\"9.99\",\"quantity_in_stock\":5}"
PROD="$(post_body "$BASE/products" "$prod_json")"
PID="$(printf '%s' "$PROD" | jget id)"
echo "  created product $PID"

dup_json="{\"name\":\"W2\",\"sku\":\"$SKU\",\"price\":\"1.00\",\"quantity_in_stock\":1}"
expect "duplicate SKU -> 409" "$(post_code "$BASE/products" "$dup_json")" "409"

neg_json="{\"name\":\"N\",\"sku\":\"x$RANDOM\",\"price\":\"1\",\"quantity_in_stock\":-1}"
expect "negative stock -> 422" "$(post_code "$BASE/products" "$neg_json")" "422"

cust_json="{\"full_name\":\"Ada\",\"email\":\"$EMAIL\",\"phone\":\"+1-555-0100\"}"
CUST="$(post_body "$BASE/customers" "$cust_json")"
CID="$(printf '%s' "$CUST" | jget id)"

dupc_json="{\"full_name\":\"Ada2\",\"email\":\"$EMAIL\"}"
expect "duplicate email -> 409" "$(post_code "$BASE/customers" "$dupc_json")" "409"

# Order 3 units with a bogus client total -> server must compute 29.97
ord_json="{\"customer_id\":\"$CID\",\"total_amount\":\"0.01\",\"lines\":[{\"product_id\":\"$PID\",\"quantity\":3}]}"
ORD="$(post_body "$BASE/orders" "$ord_json")"
expect "order total computed server-side" "$(printf '%s' "$ORD" | jget total_amount)" "29.9700"

over_json="{\"customer_id\":\"$CID\",\"lines\":[{\"product_id\":\"$PID\",\"quantity\":10}]}"
expect "insufficient stock -> 409" "$(post_code "$BASE/orders" "$over_json")" "409"

expect "stock decremented to 2" "$(curl -s "$BASE/products/$PID" | jget quantity_in_stock)" "2"

noprod_json="{\"customer_id\":\"$CID\",\"lines\":[{\"product_id\":\"00000000-0000-0000-0000-000000000000\",\"quantity\":1}]}"
expect "unknown product -> 404" "$(post_code "$BASE/orders" "$noprod_json")" "404"

nocust_json="{\"customer_id\":\"00000000-0000-0000-0000-000000000000\",\"lines\":[{\"product_id\":\"$PID\",\"quantity\":1}]}"
expect "unknown customer -> 404" "$(post_code "$BASE/orders" "$nocust_json")" "404"

echo ""
echo "Passed: $pass   Failed: $fail"
[ "$fail" -eq 0 ]
