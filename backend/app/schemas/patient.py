from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator

from app.models.patient import Gender, BloodGroup


class PatientCreate(BaseModel):
    first_name: str
    last_name: str
    date_of_birth: date
    gender: Gender
    national_id: Optional[str] = None
    phone_number: str
    email: Optional[EmailStr] = None
    county: Optional[str] = None
    address: Optional[str] = None
    next_of_kin_name: str
    next_of_kin_phone: str
    next_of_kin_relationship: Optional[str] = None
    blood_group: BloodGroup = BloodGroup.unknown
    allergies: Optional[str] = None

    @field_validator("date_of_birth")
    @classmethod
    def dob_not_in_future(cls, v: date) -> date:
        if v > date.today():
            raise ValueError("Date of birth cannot be in the future")
        return v


class PatientUpdate(BaseModel):
    """All fields optional, for partial updates."""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[EmailStr] = None
    county: Optional[str] = None
    address: Optional[str] = None
    next_of_kin_name: Optional[str] = None
    next_of_kin_phone: Optional[str] = None
    next_of_kin_relationship: Optional[str] = None
    blood_group: Optional[BloodGroup] = None
    allergies: Optional[str] = None


class PatientOut(BaseModel):
    id: int
    patient_number: str
    first_name: str
    last_name: str
    date_of_birth: date
    age: int
    gender: Gender
    national_id: Optional[str]
    phone_number: str
    email: Optional[str]
    county: Optional[str]
    address: Optional[str]
    next_of_kin_name: str
    next_of_kin_phone: str
    next_of_kin_relationship: Optional[str]
    blood_group: BloodGroup
    allergies: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class PatientSummary(BaseModel):
    """Lightweight shape for list views."""
    id: int
    patient_number: str
    first_name: str
    last_name: str
    age: int
    gender: Gender
    phone_number: str

    class Config:
        from_attributes = True
