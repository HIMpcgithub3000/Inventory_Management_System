ADR-003: Order→stock decrement concurrency strategy
Status: Accepted
Context: FM-02 (inventory race) and business rules 3–5: simultaneous orders for the
  last unit must never oversell; stock must never go negative; a placed order must
  atomically reduce stock; the total is computed server-side.
Decision: Use a guarded atomic conditional UPDATE inside a single transaction:
    UPDATE products SET quantity_in_stock = quantity_in_stock - :qty
     WHERE id = :id AND deleted_at IS NULL AND quantity_in_stock >= :qty
     RETURNING price
  A 0-row result means insufficient stock → roll back the whole order → HTTP 409.
  Lines are processed in a deterministic order (sorted by product_id) to avoid
  deadlocks. The total is summed from the RETURNING prices, never from the client.
Rationale:
  - The `>= :qty` predicate is an atomic compare-and-swap; the row lock taken by the
    UPDATE serializes concurrent writers, so exactly one order wins the last unit.
  - A CHECK (quantity_in_stock >= 0) constraint is a second backstop (defense in depth).
  - All-or-nothing: any failing line rolls back every prior decrement (no partial order).
Consequences:
  + Correct under concurrency without distributed locks or queues.
  + Proven by an automated concurrent-double-order test (exactly one 201, one 409).
  - Hot single-product contention serializes on that row (acceptable at this scale).
Alternatives considered:
  - Read-then-write: rejected (classic race, FM-02).
  - SELECT ... FOR UPDATE then UPDATE: equivalent correctness, one extra round-trip;
    the guarded UPDATE is leaner. Either is acceptable per the spec.
  - Optimistic version column (CAS token): reserved for the multi-warehouse stretch.
