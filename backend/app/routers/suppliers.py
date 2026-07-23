"""
Supplier routes: manage certified medicine suppliers, and restock
medicine inventory through them.
"""

from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.deps import require_role, get_current_user
from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.suppliers import Supplier, SupplyOrder
from app.models.pharmacy import Medicine

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


class SupplierCreate(BaseModel):
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    license_number: Optional[str] = None
    is_certified: bool = False
    address: Optional[str] = None

class SupplierOut(BaseModel):
    id: int
    name: str
    contact_person: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    license_number: Optional[str]
    is_certified: bool
    address: Optional[str]
    created_at: datetime
    class Config: from_attributes = True

class RestockCreate(BaseModel):
    medicine_id: int
    supplier_id: int
    quantity_supplied: int
    unit_cost: Optional[float] = None
    notes: Optional[str] = None

class SupplyOrderOut(BaseModel):
    id: int
    medicine_id: int
    supplier_id: int
    quantity_supplied: int
    unit_cost: Optional[float]
    ordered_by_id: int
    notes: Optional[str]
    received_at: datetime
    class Config: from_attributes = True


@router.get("", response_model=List[SupplierOut])
def list_suppliers(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    return db.query(Supplier).order_by(Supplier.name).all()


@router.post("", response_model=SupplierOut, status_code=201)
def add_supplier(
    payload: SupplierCreate,
    db: Session = Depends(get_db),
    _staff: User = Depends(require_role(UserRole.pharmacist, UserRole.admin)),
):
    supplier = Supplier(**payload.model_dump())
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.post("/restock", response_model=SupplyOrderOut, status_code=201)
def restock_medicine(
    payload: RestockCreate,
    db: Session = Depends(get_db),
    staff: User = Depends(require_role(UserRole.pharmacist, UserRole.admin)),
):
    supplier = db.query(Supplier).filter(Supplier.id == payload.supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    if not supplier.is_certified:
        raise HTTPException(status_code=400, detail="Inventory can only be restocked through a certified supplier.")

    medicine = db.query(Medicine).filter(Medicine.id == payload.medicine_id).first()
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")

    order = SupplyOrder(
        medicine_id=payload.medicine_id,
        supplier_id=payload.supplier_id,
        quantity_supplied=payload.quantity_supplied,
        unit_cost=payload.unit_cost,
        ordered_by_id=staff.id,
        notes=payload.notes,
    )
    db.add(order)
    medicine.stock_quantity += payload.quantity_supplied
    if payload.unit_cost is not None:
        medicine.unit_price = payload.unit_cost

    db.commit()
    db.refresh(order)
    return order


@router.get("/orders", response_model=List[SupplyOrderOut])
def list_supply_orders(
    db: Session = Depends(get_db),
    _staff: User = Depends(require_role(UserRole.pharmacist, UserRole.admin)),
):
    return db.query(SupplyOrder).order_by(SupplyOrder.received_at.desc()).all()