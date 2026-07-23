"""
Store routes: food and patient supplies inventory.
Managed by the store keeper role, and also editable by admin.
"""

from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.deps import require_role, get_current_user
from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.store import StoreItem

router = APIRouter(prefix="/store", tags=["store"])


class StoreItemCreate(BaseModel):
    name: str
    category: Optional[str] = None
    unit: str
    quantity: int = 0
    reorder_level: int = 10
    unit_price: float = 0.0
    notes: Optional[str] = None

class StoreItemUpdate(BaseModel):
    quantity: Optional[int] = None
    unit_price: Optional[float] = None
    reorder_level: Optional[int] = None
    notes: Optional[str] = None

class StoreItemOut(BaseModel):
    id: int
    name: str
    category: Optional[str]
    unit: str
    quantity: int
    reorder_level: int
    unit_price: float
    notes: Optional[str]
    updated_at: datetime
    class Config: from_attributes = True


@router.get("/items", response_model=List[StoreItemOut])
def list_items(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    return db.query(StoreItem).order_by(StoreItem.name).all()


@router.post("/items", response_model=StoreItemOut, status_code=201)
def add_item(
    payload: StoreItemCreate,
    db: Session = Depends(get_db),
    _staff: User = Depends(require_role(UserRole.store_keeper, UserRole.admin)),
):
    item = StoreItem(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/items/{item_id}", response_model=StoreItemOut)
def update_item(
    item_id: int,
    payload: StoreItemUpdate,
    db: Session = Depends(get_db),
    _staff: User = Depends(require_role(UserRole.store_keeper, UserRole.admin)),
):
    item = db.query(StoreItem).filter(StoreItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Store item not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.get("/items/low-stock", response_model=List[StoreItemOut])
def low_stock_items(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    return db.query(StoreItem).filter(StoreItem.quantity <= StoreItem.reorder_level).all()