"""Dashboard support — simple aggregate counts (§6.4, XV.4 dashboard)."""
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import Customer, Order, Product
from app.schemas import StatsSummary

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/summary", response_model=StatsSummary)
def summary(db: Session = Depends(get_db)) -> StatsSummary:
    threshold = get_settings().low_stock_threshold
    total_products = db.scalar(
        select(func.count()).select_from(Product).where(Product.deleted_at.is_(None))
    )
    total_customers = db.scalar(
        select(func.count()).select_from(Customer).where(Customer.deleted_at.is_(None))
    )
    total_orders = db.scalar(select(func.count()).select_from(Order))
    low_stock_count = db.scalar(
        select(func.count())
        .select_from(Product)
        .where(Product.deleted_at.is_(None), Product.quantity_in_stock < threshold)
    )
    return StatsSummary(
        total_products=total_products or 0,
        total_customers=total_customers or 0,
        total_orders=total_orders or 0,
        low_stock_count=low_stock_count or 0,
        low_stock_threshold=threshold,
    )
