ADR-005: Delete semantics for products, customers, and orders
Status: Accepted
Context: DELETE endpoints are required, but hard-deleting a product or customer that
  is referenced by historical orders would corrupt order history (PART VI rule 4).
Decision:
  - Products and customers use SOFT delete (set deleted_at). They disappear from all
    list/get endpoints and stats, but their rows remain so existing order_lines/orders
    keep valid foreign keys and historical totals stay intact.
  - Orders use HARD delete (DELETE cascades order_lines). Cancelling/deleting a PLACED
    order RESTOCKS every line back to inventory, in one transaction, so stock stays
    accurate. This is the "cancel" semantics the assessment's DELETE /orders implies.
Rationale:
  - Soft delete preserves auditability and referential integrity for money records.
  - Restock-on-cancel keeps the core invariant (system stock = real availability) true.
Consequences:
  + No dangling references; dashboards and lists reflect only active entities.
  + Re-creating a product with a previously-used SKU is allowed only if no ACTIVE
    product holds it (uniqueness is checked among non-deleted rows + DB constraint).
  - A unique DB constraint on sku/email still spans soft-deleted rows; in practice we
    pre-check active rows for a friendly 409. (A partial unique index is the documented
    enhancement if SKU reuse after deletion is ever required.)
