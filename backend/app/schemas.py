"""Pydantic schemas — boundary validation (BR-9) and typed responses.

All money is Decimal end-to-end (AP-5). Validation runs before any DB access,
so malformed bodies are rejected with 422 by FastAPI automatically.
"""
import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


# ----------------------------- Products -----------------------------
class ProductBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    sku: str = Field(min_length=1, max_length=64)
    price: Decimal = Field(ge=0, max_digits=18, decimal_places=4)
    quantity_in_stock: int = Field(ge=0)

    @field_validator("sku")
    @classmethod
    def sku_no_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("sku must not be blank")
        return v


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    sku: str | None = Field(default=None, min_length=1, max_length=64)
    price: Decimal | None = Field(default=None, ge=0, max_digits=18, decimal_places=4)
    quantity_in_stock: int | None = Field(default=None, ge=0)


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    sku: str
    price: Decimal
    quantity_in_stock: int
    created_at: datetime
    updated_at: datetime


# ----------------------------- Customers -----------------------------
class CustomerCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=32)


class CustomerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    full_name: str
    email: str
    phone: str | None
    created_at: datetime
    updated_at: datetime


# ----------------------------- Orders -----------------------------
class OrderLineIn(BaseModel):
    product_id: uuid.UUID
    quantity: int = Field(gt=0, description="Units to order; must be > 0")


class OrderCreate(BaseModel):
    customer_id: uuid.UUID
    lines: list[OrderLineIn] = Field(min_length=1, description="At least one order line")

    @field_validator("lines")
    @classmethod
    def no_duplicate_products(cls, v: list[OrderLineIn]) -> list[OrderLineIn]:
        seen = {line.product_id for line in v}
        if len(seen) != len(v):
            raise ValueError("each product may appear at most once per order")
        return v


class OrderLineOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    product_id: uuid.UUID
    quantity: int
    unit_price: Decimal
    line_total: Decimal


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    customer_id: uuid.UUID
    status: str
    total_amount: Decimal
    lines: list[OrderLineOut]
    created_at: datetime
    updated_at: datetime


# ----------------------------- Stats / Health -----------------------------
class StatsSummary(BaseModel):
    total_products: int
    total_customers: int
    total_orders: int
    low_stock_count: int
    low_stock_threshold: int


class HealthOut(BaseModel):
    status: str
    service: str
    version: str
