"""Order Management module — create / list / get / cancel."""
import uuid

from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.errors import NotFoundError
from app.models import Order
from app.schemas import OrderCreate, OrderOut
from app.services import orders as order_service

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(payload: OrderCreate, request: Request, db: Session = Depends(get_db)) -> Order:
    correlation_id = getattr(request.state, "correlation_id", None)
    return order_service.place_order(db, payload, correlation_id)


@router.get("", response_model=list[OrderOut])
def list_orders(db: Session = Depends(get_db)) -> list[Order]:
    return list(db.scalars(select(Order).order_by(Order.created_at.desc())).all())


@router.get("/{order_id}", response_model=OrderOut)
def get_order(order_id: uuid.UUID, db: Session = Depends(get_db)) -> Order:
    order = db.scalar(select(Order).where(Order.id == order_id))
    if order is None:
        raise NotFoundError(f"Order {order_id} not found")
    return order


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(order_id: uuid.UUID, db: Session = Depends(get_db)) -> Response:
    order_service.cancel_order(db, order_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
