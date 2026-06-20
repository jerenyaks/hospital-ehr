from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel

from app.models.visit import VisitStatus


# ---------- Visit ----------

class VisitCreate(BaseModel):
    patient_id: int
    chief_complaint: Optional[str] = None


class VisitStatusUpdate(BaseModel):
    status: VisitStatus


class VisitOut(BaseModel):
    id: int
    patient_id: int
    checked_in_at: datetime
    checked_in_by_id: int
    chief_complaint: Optional[str]
    status: VisitStatus
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


# ---------- Vitals ----------

class VitalsCreate(BaseModel):
    temperature_celsius: Optional[float] = None
    systolic_bp: Optional[int] = None
    diastolic_bp: Optional[int] = None
    pulse_bpm: Optional[int] = None
    respiratory_rate: Optional[int] = None
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None


class VitalsOut(BaseModel):
    id: int
    visit_id: int
    recorded_by_id: int
    temperature_celsius: Optional[float]
    systolic_bp: Optional[int]
    diastolic_bp: Optional[int]
    pulse_bpm: Optional[int]
    respiratory_rate: Optional[int]
    weight_kg: Optional[float]
    height_cm: Optional[float]
    bmi: Optional[float]
    recorded_at: datetime

    class Config:
        from_attributes = True


# ---------- Diagnosis ----------

class DiagnosisCreate(BaseModel):
    condition: str
    icd10_code: Optional[str] = None
    notes: Optional[str] = None


class DiagnosisOut(BaseModel):
    id: int
    visit_id: int
    doctor_id: int
    condition: str
    icd10_code: Optional[str]
    notes: Optional[str]
    diagnosed_at: datetime

    class Config:
        from_attributes = True


# ---------- Prescription ----------

class PrescriptionCreate(BaseModel):
    medication_name: str
    dosage: str
    frequency: str
    duration: str
    instructions: Optional[str] = None


class PrescriptionOut(BaseModel):
    id: int
    visit_id: int
    doctor_id: int
    medication_name: str
    dosage: str
    frequency: str
    duration: str
    instructions: Optional[str]
    prescribed_at: datetime

    class Config:
        from_attributes = True


# ---------- Composite: full visit detail ----------

class VisitDetailOut(BaseModel):
    """Everything about a visit in one response -- used for the doctor's
    consultation screen so the whole clinical picture loads in one call."""
    id: int
    patient_id: int
    checked_in_at: datetime
    chief_complaint: Optional[str]
    status: VisitStatus
    completed_at: Optional[datetime]
    vitals: Optional[VitalsOut]
    diagnoses: List[DiagnosisOut]
    prescriptions: List[PrescriptionOut]

    class Config:
        from_attributes = True
