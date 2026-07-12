"""
Enhancements routes: lab & pharmacy billing, audit logs, reports, and inpatient/outpatient appointments.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.billing import LabBill, PharmacyBill
from app.models.audit import AuditLog
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.appointment import Appointment

router = APIRouter(prefix="/api", tags=["Enhancements"])

# ------------------ Billing ------------------
@router.get("/lab-billing")
def get_lab_billing(db: Session = Depends(get_db)):
    return db.query(LabBill).all()

@router.get("/pharmacy-billing")
def get_pharmacy_billing(db: Session = Depends(get_db)):
    return db.query(PharmacyBill).all()

# ------------------ Audit Logs ------------------
@router.get("/audit-logs")
def get_audit_logs(db: Session = Depends(get_db)):
    return db.query(AuditLog).order_by(AuditLog.timestamp.desc()).all()

# ------------------ Reports ------------------
@router.get("/reports/doctor-patient")
def doctor_patient_report(db: Session = Depends(get_db)):
    return db.execute("""
        SELECT d.name AS doctor_name, COUNT(a.id) AS total_appointments
        FROM doctors d
        LEFT JOIN appointments a ON d.id = a.doctor_id
        GROUP BY d.name;
    """).fetchall()

# ------------------ Inpatient/Outpatient ------------------
@router.get("/appointments/inpatient")
def inpatient_appointments(db: Session = Depends(get_db)):
    return db.query(Appointment).filter(Appointment.patient_type == "Inpatient").all()

@router.get("/appointments/outpatient")
def outpatient_appointments(db: Session = Depends(get_db)):
    return db.query(Appointment).filter(Appointment.patient_type == "Outpatient").all()
