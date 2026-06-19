"""Customer module — CRUD subset with unique-email enforcement (BR-2)."""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.errors import ConflictError, NotFoundError
from app.models import Customer
from app.schemas import CustomerCreate, CustomerOut

router = APIRouter(prefix="/customers", tags=["customers"])


def _active(stmt):
    return stmt.where(Customer.deleted_at.is_(None))


def _get_or_404(db: Session, customer_id: uuid.UUID) -> Customer:
    customer = db.scalar(_active(select(Customer).where(Customer.id == customer_id)))
    if customer is None:
        raise NotFoundError(f"Customer {customer_id} not found")
    return customer


@router.post("", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
def create_customer(payload: CustomerCreate, db: Session = Depends(get_db)) -> Customer:
    email = payload.email.lower()
    existing = db.scalar(_active(select(Customer).where(Customer.email == email)))
    if existing is not None:
        raise ConflictError(f"A customer with email '{email}' already exists")
    customer = Customer(full_name=payload.full_name, email=email, phone=payload.phone)
    db.add(customer)
    try:
        db.commit()
    except IntegrityError:  # race backstop: unique email enforced by the DB index
        db.rollback()
        raise ConflictError(f"A customer with email '{email}' already exists")
    db.refresh(customer)
    return customer


@router.get("", response_model=list[CustomerOut])
def list_customers(db: Session = Depends(get_db)) -> list[Customer]:
    stmt = _active(select(Customer)).order_by(Customer.created_at.desc())
    return list(db.scalars(stmt).all())


@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(customer_id: uuid.UUID, db: Session = Depends(get_db)) -> Customer:
    return _get_or_404(db, customer_id)


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(customer_id: uuid.UUID, db: Session = Depends(get_db)) -> Response:
    customer = _get_or_404(db, customer_id)
    customer.deleted_at = datetime.now(timezone.utc)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
