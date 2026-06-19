"""Order-placement service — the single most important code path (§6.3).

Enforces, atomically and all-or-nothing, business rules 3–6:
  BR-3  product quantity can never go negative
  BR-4  orders are rejected when stock is insufficient (HTTP 409)
  BR-5  a successful order automatically reduces stock
  BR-6  the total is computed server-side from DB prices (client total ignored)

Concurrency strategy (ADR-003): a guarded conditional UPDATE
  UPDATE products SET quantity_in_stock = quantity_in_stock - :qty
   WHERE id = :id AND quantity_in_stock >= :qty
returns 0 rows when stock is insufficient — this is the atomic compare-and-swap
that makes two simultaneous orders for the last unit safe. Lines are processed in
a deterministic order (sorted by product_id) to avoid deadlocks.
"""
import logging
import uuid
from decimal import Decimal

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.errors import ConflictError, NotFoundError
from app.models import Customer, Order, OrderLine, Product
from app.schemas import OrderCreate

logger = logging.getLogger("ioms.orders")


def place_order(db: Session, payload: OrderCreate, correlation_id: str | None = None) -> Order:
    # 1. Customer must exist and be active (synchronous read justified: cannot
    #    create an order without a real customer — FM-03 permitted sync read).
    customer = db.scalar(
        select(Customer).where(Customer.id == payload.customer_id, Customer.deleted_at.is_(None))
    )
    if customer is None:
        raise NotFoundError(f"Customer {payload.customer_id} not found")

    # 2. All referenced products must exist (disambiguates 404 from 409 below).
    product_ids = [line.product_id for line in payload.lines]
    products = {
        p.id: p
        for p in db.scalars(
            select(Product).where(Product.id.in_(product_ids), Product.deleted_at.is_(None))
        ).all()
    }
    for pid in product_ids:
        if pid not in products:
            raise NotFoundError(f"Product {pid} not found")

    # 3. Guarded atomic decrement per line, in a stable order to avoid deadlocks.
    order = Order(customer_id=customer.id, status="PLACED", total_amount=Decimal("0"))
    total = Decimal("0")
    for line in sorted(payload.lines, key=lambda ln: str(ln.product_id)):
        result = db.execute(
            update(Product)
            .where(
                Product.id == line.product_id,
                Product.deleted_at.is_(None),
                Product.quantity_in_stock >= line.quantity,  # ← the CAS / sufficiency guard
            )
            .values(quantity_in_stock=Product.quantity_in_stock - line.quantity)
            .returning(Product.price)
        )
        row = result.first()
        if row is None:
            # Product exists (checked in step 2) → this is insufficient stock (BR-4).
            db.rollback()
            available = products[line.product_id].quantity_in_stock
            raise ConflictError(
                f"Insufficient stock for product {line.product_id}: "
                f"requested {line.quantity}, available {available}"
            )

        unit_price: Decimal = row[0]
        line_total = unit_price * line.quantity
        total += line_total
        order.lines.append(
            OrderLine(
                product_id=line.product_id,
                quantity=line.quantity,
                unit_price=unit_price,
                line_total=line_total,
            )
        )

    # 4. Persist order + lines and the server-computed total in the SAME transaction.
    order.total_amount = total
    db.add(order)
    db.commit()
    db.refresh(order)

    logger.info(
        "order_created",
        extra={
            "traceId": correlation_id,
            "order_id": str(order.id),
            "customer_id": str(customer.id),
            "order_total": str(total),
            "line_count": len(order.lines),
        },
    )
    return order


def cancel_order(db: Session, order_id: uuid.UUID, restock: bool = True) -> None:
    """Cancel/delete an order. By design (ADR-005) we restock on cancel so inventory
    stays accurate, and we do it inside one transaction."""
    order = db.scalar(select(Order).where(Order.id == order_id))
    if order is None:
        raise NotFoundError(f"Order {order_id} not found")
    if restock and order.status == "PLACED":
        for line in order.lines:
            db.execute(
                update(Product)
                .where(Product.id == line.product_id)
                .values(quantity_in_stock=Product.quantity_in_stock + line.quantity)
            )
    db.delete(order)  # order_lines cascade-deleted; restock already applied above
    db.commit()
