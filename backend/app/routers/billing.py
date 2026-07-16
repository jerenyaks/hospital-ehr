"""
Billing routes: generate and manage patient bills, plus pharmacy, lab, and audit logs.
"""

from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

from app.core.deps import require_role, get_current_user
from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.billing import Bill, PharmacyBill, LabBill
from app.models.visit import Visit, VisitType
from app.models.prescription import Prescription
from app.models.audit import AuditLog

# Single router definition
router = APIRouter(prefix="/billing", tags=["billing"])

# ------------------ Pydantic Schemas ------------------
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

# ------------------ Core Bill Endpoints ------------------
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
    bill = Bill(visit_id=visit_id, patient_id=visit.patient_id,
                consultation_fee=500.0, total_amount=500.0)
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

# ------------------ Reports ------------------
@router.get("/reports/summary")
def reports_summary(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    total_visits = db.query(Visit).count()
    outpatient_count = db.query(Visit).filter(Visit.visit_type == VisitType.outpatient).count()
    inpatient_count = db.query(Visit).filter(Visit.visit_type == VisitType.inpatient).count()
    total_prescriptions = db.query(Prescription).count()

    consultation_revenue = db.query(func.sum(Bill.consultation_fee)).scalar() or 0
    lab_revenue = db.query(func.sum(Bill.lab_fee)).scalar() or 0
    pharmacy_revenue = db.query(func.sum(Bill.pharmacy_fee)).scalar() or 0
    total_revenue = db.query(func.sum(Bill.total_amount)).scalar() or 0
    paid_revenue = db.query(func.sum(Bill.total_amount)).filter(Bill.is_paid == True).scalar() or 0
    unpaid_revenue = total_revenue - paid_revenue

    return {
        "total_visits": total_visits,
        "outpatient_count": outpatient_count,
        "inpatient_count": inpatient_count,
        "total_prescriptions": total_prescriptions,
        "consultation_revenue": round(consultation_revenue, 2),
        "lab_revenue": round(lab_revenue, 2),
        "pharmacy_revenue": round(pharmacy_revenue, 2),
        "total_revenue": round(total_revenue, 2),
        "paid_revenue": round(paid_revenue, 2),
        "unpaid_revenue": round(unpaid_revenue, 2),
    }

# ------------------ New Endpoints ------------------
@router.get("/pharmacy")
def get_pharmacy_billing(db: Session = Depends(get_db)):
    return db.query(PharmacyBill).all()

@router.get("/lab")
def get_lab_billing(db: Session = Depends(get_db)):
    return db.query(LabBill).all()

@router.get("/audit")
def get_audit_logs(db: Session = Depends(get_db)):
    return db.query(AuditLog).order_by(AuditLog.timestamp.desc()).all()
