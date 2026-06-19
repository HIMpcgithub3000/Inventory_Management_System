"""initial schema: products, customers, orders, order_lines

Revision ID: 0001_initial
Revises:
Create Date: 2026-06-19
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_ts = lambda: sa.Column(  # noqa: E731
    "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
)


def upgrade() -> None:
    op.create_table(
        "products",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("sku", sa.String(64), nullable=False),
        sa.Column("price", sa.Numeric(18, 4), nullable=False),
        sa.Column("quantity_in_stock", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("quantity_in_stock >= 0", name="ck_products_qty_non_negative"),
        sa.CheckConstraint("price >= 0", name="ck_products_price_non_negative"),
    )
    op.create_index(
        "uq_products_sku_active", "products", ["sku"], unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )
    op.create_table(
        "customers",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("phone", sa.String(32), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(
        "uq_customers_email_active", "customers", ["email"], unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )
    op.create_table(
        "orders",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("customer_id", UUID(as_uuid=True), sa.ForeignKey("customers.id"), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="PLACED"),
        sa.Column("total_amount", sa.Numeric(18, 4), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("status IN ('PLACED','CANCELLED')", name="ck_orders_status"),
        sa.CheckConstraint("total_amount >= 0", name="ck_orders_total_non_negative"),
    )
    op.create_index("idx_orders_customer", "orders", ["customer_id"])
    op.create_table(
        "order_lines",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("order_id", UUID(as_uuid=True), sa.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product_id", UUID(as_uuid=True), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.Numeric(18, 4), nullable=False),
        sa.Column("line_total", sa.Numeric(18, 4), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("quantity > 0", name="ck_order_lines_qty_positive"),
        sa.CheckConstraint("unit_price >= 0", name="ck_order_lines_unit_price_non_negative"),
        sa.CheckConstraint("line_total >= 0", name="ck_order_lines_line_total_non_negative"),
    )
    op.create_index("idx_order_lines_order", "order_lines", ["order_id"])
    op.create_index("idx_order_lines_product", "order_lines", ["product_id"])


def downgrade() -> None:
    op.drop_table("order_lines")
    op.drop_table("orders")
    op.drop_table("customers")
    op.drop_table("products")
