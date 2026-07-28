"""
Billing routes: generate and manage patient bills, plus pharmacy, lab, and audit logs.
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
from app.models.billing import Bill, PharmacyBill, LabBill
from app.models.visit import Visit, VisitType
from app.models.prescription import Prescription
from app.models.store import StoreItem, StoreIssuance
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

@router.get("/all", response_model=List[BillOut])
def list_all_bills(
    db: Session = Depends(get_db),
    _staff: User = Depends(require_role(UserRole.receptionist, UserRole.admin)),
):
    """Every bill, paid or unpaid — so nothing disappears from view after payment/discharge."""
    return db.query(Bill).order_by(Bill.created_at.desc()).all()

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

    total_store_items = db.query(StoreItem).count()
    store_low_stock_count = db.query(StoreItem).filter(StoreItem.quantity <= StoreItem.reorder_level).count()
    store_issuances_count = db.query(StoreIssuance).count()
    store_issuance_value = 0.0
    for issuance in db.query(StoreIssuance).all():
        item = db.query(StoreItem).filter(StoreItem.id == issuance.store_item_id).first()
        if item:
            store_issuance_value += item.unit_price * issuance.quantity_issued

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
        "total_store_items": total_store_items,
        "store_low_stock_count": store_low_stock_count,
        "store_issuances_count": store_issuances_count,
        "store_issuance_value": round(store_issuance_value, 2),
    }


@router.get("/reports/range")
def reports_by_range(
    start_date: str,
    end_date: str,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Same shape as /reports/summary, but filtered to a date range (YYYY-MM-DD)."""
    start = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)

    visits_q = db.query(Visit).filter(Visit.checked_in_at >= start, Visit.checked_in_at < end)
    total_visits = visits_q.count()
    outpatient_count = visits_q.filter(Visit.visit_type == VisitType.outpatient).count()
    inpatient_count = visits_q.filter(Visit.visit_type == VisitType.inpatient).count()

    prescriptions_q = db.query(Prescription).filter(Prescription.prescribed_at >= start, Prescription.prescribed_at < end)
    total_prescriptions = prescriptions_q.count()

    bills_q = db.query(Bill).filter(Bill.created_at >= start, Bill.created_at < end)
    consultation_revenue = bills_q.with_entities(func.sum(Bill.consultation_fee)).scalar() or 0
    lab_revenue = bills_q.with_entities(func.sum(Bill.lab_fee)).scalar() or 0
    pharmacy_revenue = bills_q.with_entities(func.sum(Bill.pharmacy_fee)).scalar() or 0
    total_revenue = bills_q.with_entities(func.sum(Bill.total_amount)).scalar() or 0
    paid_revenue = bills_q.filter(Bill.is_paid == True).with_entities(func.sum(Bill.total_amount)).scalar() or 0
    unpaid_revenue = total_revenue - paid_revenue

    return {
        "start_date": start_date,
        "end_date": end_date,
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


@router.get("/reports/timeseries")
def reports_timeseries(
    days: int = 30,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Daily revenue and visit counts for the last N days, for the admin's timeline/chart view."""
    start_date = datetime.utcnow() - timedelta(days=days)

    revenue_rows = (
        db.query(func.date(Bill.created_at).label("day"), func.sum(Bill.total_amount).label("revenue"))
        .filter(Bill.created_at >= start_date, Bill.is_paid == True)
        .group_by(func.date(Bill.created_at))
        .order_by(func.date(Bill.created_at))
        .all()
    )
    visit_rows = (
        db.query(func.date(Visit.checked_in_at).label("day"), func.count(Visit.id).label("count"))
        .filter(Visit.checked_in_at >= start_date)
        .group_by(func.date(Visit.checked_in_at))
        .order_by(func.date(Visit.checked_in_at))
        .all()
    )
    revenue_map = {str(r.day): float(r.revenue or 0) for r in revenue_rows}
    visit_map = {str(v.day): v.count for v in visit_rows}
    all_days = sorted(set(revenue_map) | set(visit_map))

    return [
        {"date": d, "revenue": round(revenue_map.get(d, 0), 2), "visits": visit_map.get(d, 0)}
        for d in all_days
    ]

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