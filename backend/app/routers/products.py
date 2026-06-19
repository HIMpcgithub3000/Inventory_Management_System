"""Product (Catalog) module — CRUD with unique-SKU enforcement (BR-1, BR-3)."""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.errors import ConflictError, NotFoundError
from app.models import Product
from app.schemas import ProductCreate, ProductOut, ProductUpdate

router = APIRouter(prefix="/products", tags=["products"])


def _active(stmt):
    return stmt.where(Product.deleted_at.is_(None))


def _get_or_404(db: Session, product_id: uuid.UUID) -> Product:
    product = db.scalar(_active(select(Product).where(Product.id == product_id)))
    if product is None:
        raise NotFoundError(f"Product {product_id} not found")
    return product


@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(payload: ProductCreate, db: Session = Depends(get_db)) -> Product:
    # Friendly pre-check for a clear 409 (the UNIQUE constraint is the real guard).
    existing = db.scalar(_active(select(Product).where(Product.sku == payload.sku)))
    if existing is not None:
        raise ConflictError(f"A product with SKU '{payload.sku}' already exists")
    product = Product(**payload.model_dump())
    db.add(product)
    try:
        db.commit()
    except IntegrityError:  # race backstop: unique SKU enforced by the DB index
        db.rollback()
        raise ConflictError(f"A product with SKU '{payload.sku}' already exists")
    db.refresh(product)
    return product


@router.get("", response_model=list[ProductOut])
def list_products(
    low_stock: bool = False,
    threshold: int | None = None,
    db: Session = Depends(get_db),
) -> list[Product]:
    from app.config import get_settings

    stmt = _active(select(Product)).order_by(Product.created_at.desc())
    if low_stock:
        limit = threshold if threshold is not None else get_settings().low_stock_threshold
        stmt = stmt.where(Product.quantity_in_stock < limit)
    return list(db.scalars(stmt).all())


@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: uuid.UUID, db: Session = Depends(get_db)) -> Product:
    return _get_or_404(db, product_id)


@router.put("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: uuid.UUID, payload: ProductUpdate, db: Session = Depends(get_db)
) -> Product:
    product = _get_or_404(db, product_id)
    data = payload.model_dump(exclude_unset=True)
    if "sku" in data and data["sku"] != product.sku:
        clash = db.scalar(_active(select(Product).where(Product.sku == data["sku"])))
        if clash is not None:
            raise ConflictError(f"A product with SKU '{data['sku']}' already exists")
    for key, value in data.items():
        setattr(product, key, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ConflictError(f"A product with SKU '{data.get('sku')}' already exists")
    db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: uuid.UUID, db: Session = Depends(get_db)) -> Response:
    product = _get_or_404(db, product_id)
    product.deleted_at = datetime.now(timezone.utc)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
