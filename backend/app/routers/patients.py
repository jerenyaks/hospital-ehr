"""
Patient routes.

Registration is restricted to receptionist and admin (front-desk job).
Viewing patient records is open to all clinical/admin roles, since a
nurse or doctor obviously needs to see who they're treating. There's no
"delete patient" endpoint -- medical records should never be deleted,
only ever added to, which is standard practice for any real EHR.
"""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps import require_role, get_current_user
from app.db.session import get_db
from app.models.patient import Patient
from app.models.user import User, UserRole
from app.schemas.patient import PatientCreate, PatientOut, PatientUpdate, PatientSummary

router = APIRouter(prefix="/patients", tags=["patients"])


def generate_patient_number(db: Session) -> str:
    """
    Generates a sequential, human-readable patient number like KNH-000123.
    Sequential per-year would be more realistic for a busy real hospital,
    but a simple running total is more than enough for this project and
    keeps the logic easy to follow.
    """
    count = db.query(Patient).count()
    return f"KNH-{count + 1:06d}"


@router.post("", response_model=PatientOut, status_code=201)
def register_patient(
    payload: PatientCreate,
    db: Session = Depends(get_db),
    _staff: User = Depends(require_role(UserRole.receptionist, UserRole.admin)),
):
    patient_number = generate_patient_number(db)
    patient = Patient(patient_number=patient_number, **payload.model_dump())
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


@router.get("", response_model=List[PatientSummary])
def list_patients(
    search: Optional[str] = Query(None, description="Search by name, phone, or patient number"),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    query = db.query(Patient)
    if search:
        like = f"%{search}%"
        query = query.filter(
            (Patient.first_name.ilike(like))
            | (Patient.last_name.ilike(like))
            | (Patient.phone_number.ilike(like))
            | (Patient.patient_number.ilike(like))
        )
    return query.order_by(Patient.created_at.desc()).limit(100).all()


@router.get("/{patient_id}", response_model=PatientOut)
def get_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@router.patch("/{patient_id}", response_model=PatientOut)
def update_patient(
    patient_id: int,
    payload: PatientUpdate,
    db: Session = Depends(get_db),
    _staff: User = Depends(require_role(UserRole.receptionist, UserRole.admin, UserRole.nurse)),
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(patient, field, value)

    db.commit()
    db.refresh(patient)
    return patient
