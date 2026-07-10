"""
Reports routes: simple admin-only stats dashboard.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.deps import require_role
from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.models.visit import Visit, VisitStatus, VisitType
from app.models.billing import Bill
from app.models.pharmacy import Medicine
from app.models.lab import LabTest, LabTestStatus

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/summary")
def get_summary(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role(UserRole.admin)),
):
    total_patients = db.query(Patient).count()
    total_visits = db.query(Visit).count()
    outpatients = db.query(Visit).filter(Visit.visit_type == VisitType.outpatient).count()
    inpatients_active = db.query(Visit).filter(
        Visit.visit_type == VisitType.inpatient, Visit.status == VisitStatus.admitted
    ).count()
    inpatients_total = db.query(Visit).filter(Visit.visit_type == VisitType.inpatient).count()

    visits_waiting = db.query(Visit).filter(Visit.status == VisitStatus.waiting).count()
    visits_with_doctor = db.query(Visit).filter(Visit.status == VisitStatus.with_doctor).count()
    visits_completed = db.query(Visit).filter(Visit.status == VisitStatus.completed).count()

    total_revenue = db.query(func.coalesce(func.sum(Bill.total_amount), 0.0)).filter(Bill.is_paid == True).scalar()
    unpaid_amount = db.query(func.coalesce(func.sum(Bill.total_amount), 0.0)).filter(Bill.is_paid == False).scalar()
    unpaid_count = db.query(Bill).filter(Bill.is_paid == False).count()

    lab_fee_total = db.query(func.coalesce(func.sum(Bill.lab_fee), 0.0)).filter(Bill.is_paid == True).scalar()
    pharmacy_fee_total = db.query(func.coalesce(func.sum(Bill.pharmacy_fee), 0.0)).filter(Bill.is_paid == True).scalar()
    consultation_fee_total = db.query(func.coalesce(func.sum(Bill.consultation_fee), 0.0)).filter(Bill.is_paid == True).scalar()

    low_stock_count = db.query(Medicine).filter(Medicine.stock_quantity <= Medicine.reorder_level).count()
    total_medicines = db.query(Medicine).count()

    pending_lab_tests = db.query(LabTest).filter(LabTest.status == LabTestStatus.pending).count()
    completed_lab_tests = db.query(LabTest).filter(LabTest.status == LabTestStatus.completed).count()

    staff_by_role = {}
    for role in UserRole:
        staff_by_role[role.value] = db.query(User).filter(User.role == role, User.is_active == True).count()

    return {
        "patients": {"total": total_patients},
        "visits": {
            "total": total_visits,
            "outpatients": outpatients,
            "inpatients_active": inpatients_active,
            "inpatients_total": inpatients_total,
            "waiting": visits_waiting,
            "with_doctor": visits_with_doctor,
            "completed": visits_completed,
        },
        "revenue": {
            "total_paid": total_revenue,
            "unpaid_amount": unpaid_amount,
            "unpaid_count": unpaid_count,
            "consultation_total": consultation_fee_total,
            "lab_total": lab_fee_total,
            "pharmacy_total": pharmacy_fee_total,
        },
        "pharmacy": {"low_stock_count": low_stock_count, "total_medicines": total_medicines},
        "lab": {"pending_tests": pending_lab_tests, "completed_tests": completed_lab_tests},
        "staff": staff_by_role,
    }