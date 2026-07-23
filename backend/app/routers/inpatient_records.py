"""
Daily inpatient record routes.
"""

from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.deps import require_role, get_current_user
from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.visit import Visit
from app.models.inpatient_record import InpatientDailyRecord

router = APIRouter(prefix="/inpatient-records", tags=["inpatient-records"])


class InpatientRecordCreate(BaseModel):
    visit_id: int
    temperature_celsius: Optional[float] = None
    systolic_bp: Optional[int] = None
    diastolic_bp: Optional[int] = None
    pulse_bpm: Optional[int] = None
    condition_notes: Optional[str] = None
    medication_given: Optional[str] = None


class InpatientRecordOut(BaseModel):
    id: int
    visit_id: int
    recorded_by_id: int
    temperature_celsius: Optional[float]
    systolic_bp: Optional[int]
    diastolic_bp: Optional[int]
    pulse_bpm: Optional[int]
    condition_notes: Optional[str]
    medication_given: Optional[str]
    recorded_at: datetime
    class Config: from_attributes = True


@router.post("", response_model=InpatientRecordOut, status_code=201)
def add_record(
    payload: InpatientRecordCreate,
    db: Session = Depends(get_db),
    staff: User = Depends(require_role(UserRole.doctor, UserRole.nurse, UserRole.admin)),
):
    visit = db.query(Visit).filter(Visit.id == payload.visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    record = InpatientDailyRecord(recorded_by_id=staff.id, **payload.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/visit/{visit_id}", response_model=List[InpatientRecordOut])
def get_records_for_visit(
    visit_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    return (
        db.query(InpatientDailyRecord)
        .filter(InpatientDailyRecord.visit_id == visit_id)
        .order_by(InpatientDailyRecord.recorded_at.desc())
        .all()
    )