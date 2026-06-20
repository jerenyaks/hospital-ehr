"""
Visit routes: the core clinical workflow.

Flow enforced here:
  1. Receptionist creates a Visit (check-in) -> status = waiting
  2. Nurse records Vitals -> status moves to with_doctor (nurse's job is done)
  3. Doctor adds Diagnosis / Prescription, then marks visit completed

We don't hard-block out-of-order actions (e.g. a doctor diagnosing before
vitals exist) because in real hospitals emergencies skip steps -- but we
do enforce who is allowed to perform which action via role checks, which
is the access-control boundary that actually matters.
"""

from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.core.deps import require_role, get_current_user
from app.db.session import get_db
from app.models.diagnosis import Diagnosis
from app.models.patient import Patient
from app.models.prescription import Prescription
from app.models.user import User, UserRole
from app.models.visit import Visit, VisitStatus
from app.models.vitals import Vitals
from app.schemas.visit import (
    VisitCreate, VisitOut, VisitStatusUpdate, VisitDetailOut,
    VitalsCreate, VitalsOut,
    DiagnosisCreate, DiagnosisOut,
    PrescriptionCreate, PrescriptionOut,
)

router = APIRouter(prefix="/visits", tags=["visits"])


@router.post("", response_model=VisitOut, status_code=201)
def check_in_patient(
    payload: VisitCreate,
    db: Session = Depends(get_db),
    staff: User = Depends(require_role(UserRole.receptionist, UserRole.admin)),
):
    patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    visit = Visit(
        patient_id=payload.patient_id,
        chief_complaint=payload.chief_complaint,
        checked_in_by_id=staff.id,
        status=VisitStatus.waiting,
    )
    db.add(visit)
    db.commit()
    db.refresh(visit)
    return visit


@router.get("", response_model=List[VisitOut])
def list_visits(
    status_filter: VisitStatus | None = None,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """
    Powers the queue views: receptionist/nurse/doctor dashboards all
    filter this same endpoint by status (e.g. nurses query status=waiting,
    doctors query status=with_doctor).
    """
    query = db.query(Visit)
    if status_filter:
        query = query.filter(Visit.status == status_filter)
    return query.order_by(Visit.checked_in_at.asc()).all()


@router.get("/{visit_id}", response_model=VisitDetailOut)
def get_visit_detail(
    visit_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    visit = (
        db.query(Visit)
        .options(
            joinedload(Visit.vitals),
            joinedload(Visit.diagnoses),
            joinedload(Visit.prescriptions),
        )
        .filter(Visit.id == visit_id)
        .first()
    )
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    return visit


@router.patch("/{visit_id}/status", response_model=VisitOut)
def update_visit_status(
    visit_id: int,
    payload: VisitStatusUpdate,
    db: Session = Depends(get_db),
    _staff: User = Depends(
        require_role(UserRole.nurse, UserRole.doctor, UserRole.admin, UserRole.receptionist)
    ),
):
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")

    visit.status = payload.status
    if payload.status == VisitStatus.completed:
        visit.completed_at = datetime.utcnow()

    db.commit()
    db.refresh(visit)
    return visit


# ---------- Vitals (nurse) ----------

@router.post("/{visit_id}/vitals", response_model=VitalsOut, status_code=201)
def record_vitals(
    visit_id: int,
    payload: VitalsCreate,
    db: Session = Depends(get_db),
    nurse: User = Depends(require_role(UserRole.nurse, UserRole.admin)),
):
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")

    existing = db.query(Vitals).filter(Vitals.visit_id == visit_id).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Vitals already recorded for this visit. Use PATCH to update.",
        )

    vitals = Vitals(visit_id=visit_id, recorded_by_id=nurse.id, **payload.model_dump())
    db.add(vitals)

    # Nurse's part is done -- hand off to the doctor's queue.
    visit.status = VisitStatus.with_doctor

    db.commit()
    db.refresh(vitals)
    return vitals


# ---------- Diagnosis (doctor) ----------

@router.post("/{visit_id}/diagnoses", response_model=DiagnosisOut, status_code=201)
def add_diagnosis(
    visit_id: int,
    payload: DiagnosisCreate,
    db: Session = Depends(get_db),
    doctor: User = Depends(require_role(UserRole.doctor, UserRole.admin)),
):
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")

    diagnosis = Diagnosis(visit_id=visit_id, doctor_id=doctor.id, **payload.model_dump())
    db.add(diagnosis)
    db.commit()
    db.refresh(diagnosis)
    return diagnosis


# ---------- Prescription (doctor) ----------

@router.post("/{visit_id}/prescriptions", response_model=PrescriptionOut, status_code=201)
def add_prescription(
    visit_id: int,
    payload: PrescriptionCreate,
    db: Session = Depends(get_db),
    doctor: User = Depends(require_role(UserRole.doctor, UserRole.admin)),
):
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")

    prescription = Prescription(visit_id=visit_id, doctor_id=doctor.id, **payload.model_dump())
    db.add(prescription)
    db.commit()
    db.refresh(prescription)
    return prescription


# ---------- Patient history ----------

@router.get("/patient/{patient_id}/history", response_model=List[VisitOut])
def get_patient_visit_history(
    patient_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """The longitudinal record -- every past visit for a patient, newest first."""
    return (
        db.query(Visit)
        .filter(Visit.patient_id == patient_id)
        .order_by(Visit.checked_in_at.desc())
        .all()
    )
