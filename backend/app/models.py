"""SQLAlchemy ORM models — the write-side domain schema.

Golden rules applied (PART VI): UUID PKs (generated app-side for portability,
no pgcrypto dependency), created_at/updated_at TIMESTAMPTZ, DECIMAL money,
CHECK constraints enforcing the graded business invariants.
"""
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _uuid() -> uuid.UUID:
    return uuid.uuid4()


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class Product(TimestampMixin, Base):
    __tablename__ = "products"
    __table_args__ = (
        CheckConstraint("quantity_in_stock >= 0", name="ck_products_qty_non_negative"),
        CheckConstraint("price >= 0", name="ck_products_price_non_negative"),
        # BR-1: unique SKU among ACTIVE (non-deleted) products — allows SKU reuse
        # after a soft delete while still preventing duplicates (ADR-005).
        Index("uq_products_sku_active", "sku", unique=True, postgresql_where=text("deleted_at IS NULL")),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    sku: Mapped[str] = mapped_column(String(64), nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)  # AP-5: DECIMAL money
    quantity_in_stock: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )  # BR-3: never negative (enforced by CHECK + guarded UPDATE)
    # Soft delete preserves order history when a product is removed (PART VI rule 4).
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Customer(TimestampMixin, Base):
    __tablename__ = "customers"
    __table_args__ = (
        # BR-2: unique email among ACTIVE customers (ADR-005).
        Index("uq_customers_email_active", "email", unique=True, postgresql_where=text("deleted_at IS NULL")),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(320), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Order(TimestampMixin, Base):
    __tablename__ = "orders"
    __table_args__ = (
        CheckConstraint("status IN ('PLACED','CANCELLED')", name="ck_orders_status"),
        CheckConstraint("total_amount >= 0", name="ck_orders_total_non_negative"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="PLACED", server_default="PLACED")
    total_amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)  # BR-6: server-computed

    lines: Mapped[list["OrderLine"]] = relationship(
        back_populates="order", cascade="all, delete-orphan", lazy="selectin"
    )
    customer: Mapped["Customer"] = relationship(lazy="joined")


class OrderLine(TimestampMixin, Base):
    __tablename__ = "order_lines"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_order_lines_qty_positive"),
        CheckConstraint("unit_price >= 0", name="ck_order_lines_unit_price_non_negative"),
        CheckConstraint("line_total >= 0", name="ck_order_lines_line_total_non_negative"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id"), nullable=False, index=True
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)  # price snapshot
    line_total: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)

    order: Mapped["Order"] = relationship(back_populates="lines")
    product: Mapped["Product"] = relationship(lazy="joined")
