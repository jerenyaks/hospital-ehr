"""
Patient model.

Field choices reflect the Kenyan context specifically:
- national_id instead of SSN-style field (Kenya's national ID is the standard identifier).
- phone_number as the primary contact channel (most patients are reached by phone/SMS).
- county instead of US-style state, matching Kenya's 47 counties.
- next_of_kin fields are mandatory in real hospital intake forms.
"""

from datetime import datetime, date
from sqlalchemy import Column, Integer, String, DateTime, Date, Enum
from sqlalchemy.orm import relationship
import enum
from app.db.session import Base


class Gender(str, enum.Enum):
    male = "male"
    female = "female"
    other = "other"


class BloodGroup(str, enum.Enum):
    a_pos = "A+"
    a_neg = "A-"
    b_pos = "B+"
    b_neg = "B-"
    ab_pos = "AB+"
    ab_neg = "AB-"
    o_pos = "O+"
    o_neg = "O-"
    unknown = "unknown"


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    patient_number = Column(String, unique=True, index=True, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    date_of_birth = Column(Date, nullable=False)
    gender = Column(Enum(Gender), nullable=False)

    national_id = Column(String, nullable=True, index=True)
    phone_number = Column(String, nullable=False)
    email = Column(String, nullable=True)

    county = Column(String, nullable=True)
    address = Column(String, nullable=True)

    next_of_kin_name = Column(String, nullable=False)
    next_of_kin_phone = Column(String, nullable=False)
    next_of_kin_relationship = Column(String, nullable=True)

    blood_group = Column(Enum(BloodGroup), default=BloodGroup.unknown)
    allergies = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    visits = relationship("Visit", back_populates="patient")
    appointments = relationship("Appointment", back_populates="patient")  # NEW

    @property
    def age(self) -> int:
        today = date.today()
        return today.year - self.date_of_birth.year - (
            (today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day)
        )
