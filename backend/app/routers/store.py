"""
Store routes: food and patient supplies inventory.
Managed by the store keeper role, and also editable by admin.
"""

from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

from app.core.deps import require_role, get_current_user
from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.store import StoreItem, StoreIssuance, StoreInflow

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

class StoreIssuanceCreate(BaseModel):
    store_item_id: int
    visit_id: Optional[int] = None
    ward: Optional[str] = None
    quantity_issued: int
    notes: Optional[str] = None

class StoreIssuanceOut(BaseModel):
    id: int
    store_item_id: int
    visit_id: Optional[int]
    ward: Optional[str]
    quantity_issued: int
    issued_by_id: int
    notes: Optional[str]
    issued_at: datetime
    class Config: from_attributes = True

class StoreInflowCreate(BaseModel):
    store_item_id: int
    quantity_added: int
    source: Optional[str] = None
    notes: Optional[str] = None

class StoreInflowOut(BaseModel):
    id: int
    store_item_id: int
    quantity_added: int
    added_by_id: int
    source: Optional[str]
    notes: Optional[str]
    added_at: datetime
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
    """Direct correction of item fields (price, reorder level, or a manual quantity fix).
    For normal restocking, use POST /store/restock instead — it keeps an inflow history."""
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


@router.post("/restock", response_model=StoreInflowOut, status_code=201)
def restock_item(
    payload: StoreInflowCreate,
    db: Session = Depends(get_db),
    staff: User = Depends(require_role(UserRole.store_keeper, UserRole.admin)),
):
    """Add stock to an item and log it as an inflow event."""
    item = db.query(StoreItem).filter(StoreItem.id == payload.store_item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Store item not found")

    inflow = StoreInflow(
        store_item_id=payload.store_item_id,
        quantity_added=payload.quantity_added,
        added_by_id=staff.id,
        source=payload.source,
        notes=payload.notes,
    )
    db.add(inflow)
    item.quantity += payload.quantity_added
    db.commit()
    db.refresh(inflow)
    return inflow


@router.get("/inflows", response_model=List[StoreInflowOut])
def list_inflows(
    db: Session = Depends(get_db),
    _staff: User = Depends(require_role(UserRole.store_keeper, UserRole.admin)),
):
    return db.query(StoreInflow).order_by(StoreInflow.added_at.desc()).all()


@router.post("/issue", response_model=StoreIssuanceOut, status_code=201)
def issue_item(
    payload: StoreIssuanceCreate,
    db: Session = Depends(get_db),
    staff: User = Depends(require_role(UserRole.store_keeper, UserRole.admin)),
):
    if not payload.visit_id and not payload.ward:
        raise HTTPException(status_code=400, detail="Provide either a patient (visit) or a ward to issue to.")

    item = db.query(StoreItem).filter(StoreItem.id == payload.store_item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Store item not found")
    if item.quantity < payload.quantity_issued:
        raise HTTPException(status_code=400, detail=f"Insufficient stock. Available: {item.quantity} {item.unit}")

    issuance = StoreIssuance(
        store_item_id=payload.store_item_id,
        visit_id=payload.visit_id,
        ward=payload.ward,
        quantity_issued=payload.quantity_issued,
        issued_by_id=staff.id,
        notes=payload.notes,
    )
    db.add(issuance)
    item.quantity -= payload.quantity_issued
    db.commit()
    db.refresh(issuance)
    return issuance


@router.get("/issuances", response_model=List[StoreIssuanceOut])
def list_all_issuances(
    db: Session = Depends(get_db),
    _staff: User = Depends(require_role(UserRole.store_keeper, UserRole.admin)),
):
    return db.query(StoreIssuance).order_by(StoreIssuance.issued_at.desc()).all()


@router.get("/issuances/visit/{visit_id}", response_model=List[StoreIssuanceOut])
def get_issuances_for_visit(
    visit_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    return db.query(StoreIssuance).filter(StoreIssuance.visit_id == visit_id).order_by(StoreIssuance.issued_at.desc()).all()


# ------------------ Dashboard ------------------

@router.get("/dashboard/summary")
def dashboard_summary(
    days: int = 30,
    db: Session = Depends(get_db),
    _staff: User = Depends(require_role(UserRole.store_keeper, UserRole.admin)),
):
    since = datetime.utcnow() - timedelta(days=days)

    total_items = db.query(StoreItem).count()
    low_stock_count = db.query(StoreItem).filter(StoreItem.quantity <= StoreItem.reorder_level).count()
    total_stock_value = db.query(func.sum(StoreItem.quantity * StoreItem.unit_price)).scalar() or 0

    total_inflow_qty = db.query(func.sum(StoreInflow.quantity_added)).filter(StoreInflow.added_at >= since).scalar() or 0
    total_outflow_qty = db.query(func.sum(StoreIssuance.quantity_issued)).filter(StoreIssuance.issued_at >= since).scalar() or 0

    # Category breakdown by current stock value
    category_rows = (
        db.query(StoreItem.category, func.sum(StoreItem.quantity * StoreItem.unit_price).label("value"))
        .group_by(StoreItem.category)
        .all()
    )
    category_breakdown = [{"category": c or "Uncategorized", "value": round(v or 0, 2)} for c, v in category_rows]

    # Top issued items (outflow) in period
    top_issued_rows = (
        db.query(StoreItem.name, func.sum(StoreIssuance.quantity_issued).label("total"))
        .join(StoreIssuance, StoreIssuance.store_item_id == StoreItem.id)
        .filter(StoreIssuance.issued_at >= since)
        .group_by(StoreItem.name)
        .order_by(func.sum(StoreIssuance.quantity_issued).desc())
        .limit(6)
        .all()
    )
    top_issued = [{"name": n, "total": t} for n, t in top_issued_rows]

    return {
        "total_items": total_items,
        "low_stock_count": low_stock_count,
        "total_stock_value": round(total_stock_value, 2),
        "total_inflow_qty": int(total_inflow_qty),
        "total_outflow_qty": int(total_outflow_qty),
        "category_breakdown": category_breakdown,
        "top_issued": top_issued,
    }


@router.get("/dashboard/timeseries")
def dashboard_timeseries(
    days: int = 30,
    db: Session = Depends(get_db),
    _staff: User = Depends(require_role(UserRole.store_keeper, UserRole.admin)),
):
    since = datetime.utcnow() - timedelta(days=days)

    inflow_rows = (
        db.query(func.date(StoreInflow.added_at).label("day"), func.sum(StoreInflow.quantity_added).label("qty"))
        .filter(StoreInflow.added_at >= since)
        .group_by(func.date(StoreInflow.added_at))
        .all()
    )
    outflow_rows = (
        db.query(func.date(StoreIssuance.issued_at).label("day"), func.sum(StoreIssuance.quantity_issued).label("qty"))
        .filter(StoreIssuance.issued_at >= since)
        .group_by(func.date(StoreIssuance.issued_at))
        .all()
    )
    inflow_map = {str(r.day): int(r.qty or 0) for r in inflow_rows}
    outflow_map = {str(r.day): int(r.qty or 0) for r in outflow_rows}
    all_days = sorted(set(inflow_map) | set(outflow_map))

    return [
        {"date": d, "inflow": inflow_map.get(d, 0), "outflow": outflow_map.get(d, 0)}
        for d in all_days
    ]