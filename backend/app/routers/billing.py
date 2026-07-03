"""
Billing routes: generate and manage patient bills.
"""

from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.deps import require_role, get_current_user
from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.billing import Bill
from app.models.visit import Visit

router = APIRouter(prefix="/billing", tags=["billing"])


class BillOut(BaseModel):
    id: int
    visit_id: int
    patient_id: int
    consultation_fee: float
    lab_fee: float
    pharmacy_fee: float
    other_fee: float
    total_amount: float
    is_paid: bool
    paid_at: Optional[datetime]
    payment_method: Optional[str]
    notes: Optional[str]
    created_at: datetime
    class Config: from_attributes = True

class PayBillRequest(BaseModel):
    payment_method: str
    notes: Optional[str] = None


@router.post("/generate/{visit_id}", response_model=BillOut, status_code=201)
def generate_bill(
    visit_id: int,
    db: Session = Depends(get_db),
    _staff: User = Depends(require_role(UserRole.receptionist, UserRole.admin)),
):
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    existing = db.query(Bill).filter(Bill.visit_id == visit_id).first()
    if existing:
        return existing
    bill = Bill(visit_id=visit_id, patient_id=visit.patient_id, consultation_fee=500.0, total_amount=500.0)
    db.add(bill)
    db.commit()
    db.refresh(bill)
    return bill


@router.get("/visit/{visit_id}", response_model=BillOut)
def get_bill(
    visit_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    bill = db.query(Bill).filter(Bill.visit_id == visit_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="No bill found for this visit")
    return bill


@router.patch("/{bill_id}/pay", response_model=BillOut)
def mark_paid(
    bill_id: int,
    payload: PayBillRequest,
    db: Session = Depends(get_db),
    _staff: User = Depends(require_role(UserRole.receptionist, UserRole.admin)),
):
    bill = db.query(Bill).filter(Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    if bill.is_paid:
        raise HTTPException(status_code=400, detail="Bill is already paid")
    bill.is_paid = True
    bill.paid_at = datetime.utcnow()
    bill.payment_method = payload.payment_method
    bill.notes = payload.notes
    db.commit()
    db.refresh(bill)
    return bill


@router.get("/unpaid", response_model=List[BillOut])
def list_unpaid(
    db: Session = Depends(get_db),
    _staff: User = Depends(require_role(UserRole.receptionist, UserRole.admin)),
):
    return db.query(Bill).filter(Bill.is_paid == False).order_by(Bill.created_at.desc()).all()


@router.get("/patient/{patient_id}", response_model=List[BillOut])
def patient_billing_history(
    patient_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    return db.query(Bill).filter(Bill.patient_id == patient_id).order_by(Bill.created_at.desc()).all()