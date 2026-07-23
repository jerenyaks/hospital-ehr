"""
User model: hospital staff accounts.
Now includes pharmacist and lab_technician roles.
"""

import enum
from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, Enum, Boolean
from sqlalchemy.orm import relationship

from app.db.session import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    doctor = "doctor"
    nurse = "nurse"
    receptionist = "receptionist"
    pharmacist = "pharmacist"
    lab_technician = "lab_technician"
    store_keeper = "store_keeper"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    checked_in_visits = relationship(
        "Visit", back_populates="checked_in_by", foreign_keys="Visit.checked_in_by_id"
    )
    recorded_vitals = relationship("Vitals", back_populates="recorded_by")
    diagnoses_made = relationship("Diagnosis", back_populates="doctor")
    prescriptions_written = relationship("Prescription", back_populates="doctor")
    lab_tests_ordered = relationship("LabTest", back_populates="ordered_by", foreign_keys="LabTest.ordered_by_id")
    lab_results_recorded = relationship("LabResult", back_populates="recorded_by")
    dispensings_done = relationship("Dispensing", back_populates="dispensed_by")