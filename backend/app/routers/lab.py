"""
Lab routes: test orders and results.
"""

from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.deps import require_role, get_current_user
from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.lab import LabTest, LabResult, LabTestStatus
from app.models.billing import Bill

router = APIRouter(prefix="/lab", tags=["lab"])


class LabTestCreate(BaseModel):
    visit_id: int
    test_name: str
    test_category: Optional[str] = None
    notes: Optional[str] = None

class LabTestOut(BaseModel):
    id: int
    visit_id: int
    ordered_by_id: int
    test_name: str
    test_category: Optional[str]
    notes: Optional[str]
    status: LabTestStatus
    ordered_at: datetime
    class Config: from_attributes = True

class LabResultCreate(BaseModel):
    result_value: str
    reference_range: Optional[str] = None
    interpretation: Optional[str] = None

class LabResultOut(BaseModel):
    id: int
    lab_test_id: int
    recorded_by_id: int
    result_value: str
    reference_range: Optional[str]
    interpretation: Optional[str]
    recorded_at: datetime
    class Config: from_attributes = True

class LabTestDetailOut(BaseModel):
    id: int
    visit_id: int
    ordered_by_id: int
    test_name: str
    test_category: Optional[str]
    notes: Optional[str]
    status: LabTestStatus
    ordered_at: datetime
    result: Optional[LabResultOut]
    class Config: from_attributes = True


@router.post("/tests", response_model=LabTestOut, status_code=201)
def order_test(
    payload: LabTestCreate,
    db: Session = Depends(get_db),
    doctor: User = Depends(require_role(UserRole.doctor, UserRole.admin)),
):
    test = LabTest(ordered_by_id=doctor.id, **payload.model_dump())
    db.add(test)

    bill = db.query(Bill).filter(Bill.visit_id == payload.visit_id).first()
    if bill:
        bill.lab_fee += 200.0
        bill.total_amount = bill.consultation_fee + bill.lab_fee + bill.pharmacy_fee + bill.other_fee

    db.commit()
    db.refresh(test)
    return test


@router.get("/tests/pending", response_model=List[LabTestDetailOut])
def get_pending_tests(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    return db.query(LabTest).filter(LabTest.status == LabTestStatus.pending).all()


@router.get("/tests/visit/{visit_id}", response_model=List[LabTestDetailOut])
def get_visit_tests(
    visit_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    return db.query(LabTest).filter(LabTest.visit_id == visit_id).all()


@router.post("/tests/{test_id}/results", response_model=LabResultOut, status_code=201)
def record_result(
    test_id: int,
    payload: LabResultCreate,
    db: Session = Depends(get_db),
    lab_tech: User = Depends(require_role(UserRole.lab_technician, UserRole.admin)),
):
    test = db.query(LabTest).filter(LabTest.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Lab test not found")
    if test.result:
        raise HTTPException(status_code=400, detail="Result already recorded for this test")

    result = LabResult(
        lab_test_id=test_id,
        recorded_by_id=lab_tech.id,
        **payload.model_dump(),
    )
    db.add(result)
    test.status = LabTestStatus.completed
    db.commit()
    db.refresh(result)
    return result


@router.get("/tests/{test_id}", response_model=LabTestDetailOut)
def get_test_detail(
    test_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    test = db.query(LabTest).filter(LabTest.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Lab test not found")
    return test