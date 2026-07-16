"""
Pharmacy routes: medicine inventory and dispensing.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.deps import require_role, get_current_user
from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.pharmacy import Medicine, Dispensing
from app.models.prescription import Prescription
from app.models.billing import Bill

router = APIRouter(prefix="/pharmacy", tags=["pharmacy"])


class MedicineCreate(BaseModel):
    name: str
    category: Optional[str] = None
    unit: str
    stock_quantity: int = 0
    reorder_level: int = 10
    unit_price: float = 0.0
    description: Optional[str] = None

class MedicineUpdate(BaseModel):
    stock_quantity: Optional[int] = None
    unit_price: Optional[float] = None
    reorder_level: Optional[int] = None

class MedicineOut(BaseModel):
    id: int
    name: str
    category: Optional[str]
    unit: str
    stock_quantity: int
    reorder_level: int
    unit_price: float
    description: Optional[str]
    class Config: from_attributes = True

class DispensingCreate(BaseModel):
    prescription_id: int
    medicine_id: int
    quantity_dispensed: int
    notes: Optional[str] = None


@router.post("/medicines", response_model=MedicineOut, status_code=201)
def add_medicine(
    payload: MedicineCreate,
    db: Session = Depends(get_db),
    _staff: User = Depends(require_role(UserRole.pharmacist, UserRole.admin)),
):
    med = Medicine(**payload.model_dump())
    db.add(med)
    db.commit()
    db.refresh(med)
    return med


@router.get("/medicines", response_model=List[MedicineOut])
def list_medicines(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    return db.query(Medicine).order_by(Medicine.name).all()


@router.patch("/medicines/{medicine_id}", response_model=MedicineOut)
def update_medicine(
    medicine_id: int,
    payload: MedicineUpdate,
    db: Session = Depends(get_db),
    _staff: User = Depends(require_role(UserRole.pharmacist, UserRole.admin)),
):
    med = db.query(Medicine).filter(Medicine.id == medicine_id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medicine not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(med, field, value)
    db.commit()
    db.refresh(med)
    return med


@router.get("/medicines/low-stock", response_model=List[MedicineOut])
def low_stock_alert(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    return db.query(Medicine).filter(Medicine.stock_quantity <= Medicine.reorder_level).all()


@router.get("/prescriptions/pending")
def list_pending_prescriptions(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Prescriptions that have not yet been (fully) dispensed, for the pharmacist to pick from."""
    prescriptions = db.query(Prescription).order_by(Prescription.prescribed_at.desc()).all()
    result = []
    for p in prescriptions:
        already_dispensed = db.query(Dispensing).filter(Dispensing.prescription_id == p.id).first()
        if already_dispensed:
            continue
        patient_id = p.visit.patient_id if p.visit else None
        result.append({
            "id": p.id,
            "medication_name": p.medication_name,
            "dosage": p.dosage,
            "frequency": p.frequency,
            "duration": p.duration,
            "patient_id": patient_id,
        })
    return result


@router.post("/dispense", status_code=201)
def dispense_medicine(
    payload: DispensingCreate,
    db: Session = Depends(get_db),
    pharmacist: User = Depends(require_role(UserRole.pharmacist, UserRole.admin)),
):
    med = db.query(Medicine).filter(Medicine.id == payload.medicine_id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medicine not found")
    if med.stock_quantity < payload.quantity_dispensed:
        raise HTTPException(status_code=400, detail=f"Insufficient stock. Available: {med.stock_quantity} {med.unit}")

    prescription = db.query(Prescription).filter(Prescription.id == payload.prescription_id).first()
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")

    dispensing = Dispensing(
        prescription_id=payload.prescription_id,
        medicine_id=payload.medicine_id,
        dispensed_by_id=pharmacist.id,
        quantity_dispensed=payload.quantity_dispensed,
        notes=payload.notes,
    )
    db.add(dispensing)
    med.stock_quantity -= payload.quantity_dispensed

    bill = db.query(Bill).filter(Bill.visit_id == prescription.visit_id).first()
    if bill:
        bill.pharmacy_fee += med.unit_price * payload.quantity_dispensed
        bill.total_amount = bill.consultation_fee + bill.lab_fee + bill.pharmacy_fee + bill.other_fee

    db.commit()
    db.refresh(dispensing)
    return {"message": "Medicine dispensed successfully", "dispensing_id": dispensing.id}


@router.get("/dispensings/prescription/{prescription_id}")
def get_prescription_dispensings(
    prescription_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    return db.query(Dispensing).filter(Dispensing.prescription_id == prescription_id).all()