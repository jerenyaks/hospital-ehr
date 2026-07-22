"""
Visit routes: the core clinical workflow.
Now includes inpatient admission and discharge.
"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.core.deps import require_role, get_current_user
from app.db.session import get_db
from app.models.diagnosis import Diagnosis
from app.models.patient import Patient
from app.models.prescription import Prescription
from app.models.user import User, UserRole
from app.models.visit import Visit, VisitStatus, VisitType
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
        visit_type=payload.visit_type,
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
    query = db.query(Visit)
    if status_filter:
        query = query.filter(Visit.status == status_filter)
    return query.order_by(Visit.checked_in_at.asc()).all()


@router.get("/inpatients/active", response_model=List[VisitOut])
def list_active_inpatients(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    return db.query(Visit).filter(
        Visit.visit_type == VisitType.inpatient,
        Visit.status == VisitStatus.admitted,
    ).all()


@router.get("/inpatients/awaiting-bed", response_model=List[VisitOut])
def list_awaiting_bed_assignment(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Patients the doctor has classified as inpatient, but no ward/bed assigned yet."""
    return db.query(Visit).filter(
        Visit.visit_type == VisitType.inpatient,
        Visit.status != VisitStatus.admitted,
        Visit.ward.is_(None),
    ).all()


@router.get("/patient/{patient_id}/history", response_model=List[VisitOut])
def get_patient_visit_history(
    patient_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    return (
        db.query(Visit)
        .filter(Visit.patient_id == patient_id)
        .order_by(Visit.checked_in_at.desc())
        .all()
    )


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


@router.patch("/{visit_id}/classify-inpatient", response_model=VisitOut)
def classify_inpatient(
    visit_id: int,
    db: Session = Depends(get_db),
    doctor: User = Depends(require_role(UserRole.doctor, UserRole.admin)),
):
    """Doctor marks a patient as needing admission. Ward/bed is assigned later by a nurse."""
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    visit.visit_type = VisitType.inpatient
    db.commit()
    db.refresh(visit)
    return visit


@router.patch("/{visit_id}/assign-bed", response_model=VisitOut)
def assign_bed(
    visit_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    nurse: User = Depends(require_role(UserRole.nurse, UserRole.admin)),
):
    """Nurse assigns ward/bed to a patient already classified as inpatient by a doctor."""
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    if visit.visit_type != VisitType.inpatient:
        raise HTTPException(status_code=400, detail="This patient has not been classified as inpatient yet.")
    visit.ward = payload.get("ward")
    visit.bed_number = payload.get("bed_number")
    visit.status = VisitStatus.admitted
    db.commit()
    db.refresh(visit)
    return visit


@router.patch("/{visit_id}/discharge", response_model=VisitOut)
def discharge_patient(
    visit_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    doctor: User = Depends(require_role(UserRole.doctor, UserRole.admin)),
):
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    visit.discharge_notes = payload.get("discharge_notes")
    visit.discharged_at = datetime.utcnow()
    visit.status = VisitStatus.completed
    visit.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(visit)
    return visit


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
        raise HTTPException(status_code=400, detail="Vitals already recorded for this visit.")
    vitals = Vitals(visit_id=visit_id, recorded_by_id=nurse.id, **payload.model_dump())
    db.add(vitals)
    visit.status = VisitStatus.with_doctor
    db.commit()
    db.refresh(vitals)
    return vitals


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