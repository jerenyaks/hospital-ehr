"""
Ward routes: define wards with fixed capacity, and compute live occupancy
so nurses can only pick a bed that's actually free.
"""

from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.deps import require_role, get_current_user
from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.ward import Ward
from app.models.visit import Visit, VisitStatus, VisitType

router = APIRouter(prefix="/wards", tags=["wards"])


class WardCreate(BaseModel):
    name: str
    capacity: int = 10

class WardOut(BaseModel):
    id: int
    name: str
    capacity: int
    created_at: datetime
    class Config: from_attributes = True

class WardOccupancyOut(BaseModel):
    id: int
    name: str
    capacity: int
    occupied: int
    free: int
    free_beds: List[str]
    occupied_beds: List[str]


@router.get("", response_model=List[WardOut])
def list_wards(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    return db.query(Ward).order_by(Ward.name).all()


@router.post("", response_model=WardOut, status_code=201)
def add_ward(
    payload: WardCreate,
    db: Session = Depends(get_db),
    _staff: User = Depends(require_role(UserRole.admin)),
):
    if db.query(Ward).filter(Ward.name == payload.name).first():
        raise HTTPException(status_code=400, detail="A ward with this name already exists.")
    ward = Ward(**payload.model_dump())
    db.add(ward)
    db.commit()
    db.refresh(ward)
    return ward


@router.get("/occupancy", response_model=List[WardOccupancyOut])
def ward_occupancy(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Live capacity/occupancy/free-bed breakdown for every ward."""
    wards = db.query(Ward).order_by(Ward.name).all()
    result = []
    for ward in wards:
        admitted = db.query(Visit).filter(
            Visit.visit_type == VisitType.inpatient,
            Visit.status == VisitStatus.admitted,
            Visit.ward == ward.name,
        ).all()
        occupied_beds = sorted({v.bed_number for v in admitted if v.bed_number})
        all_beds = [f"Bed {i}" for i in range(1, ward.capacity + 1)]
        free_beds = [b for b in all_beds if b not in occupied_beds]
        result.append(WardOccupancyOut(
            id=ward.id,
            name=ward.name,
            capacity=ward.capacity,
            occupied=len(occupied_beds),
            free=len(free_beds),
            free_beds=free_beds,
            occupied_beds=occupied_beds,
        ))
    return result
