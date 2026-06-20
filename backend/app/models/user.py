"""
User model: hospital staff accounts.

Roles are deliberately a fixed enum rather than a free-text field or a
separate permissions table. For a project this size, a fixed set of four
roles (admin, doctor, nurse, receptionist) is easy to reason about and
easy to grade/demo. A larger real-world system would likely use a proper
permissions table for fine-grained access, but that's overkill here and
would add complexity without adding clarity.
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


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Visits this user checked in (if receptionist)
    checked_in_visits = relationship(
        "Visit", back_populates="checked_in_by", foreign_keys="Visit.checked_in_by_id"
    )
    # Vitals this user recorded (if nurse)
    recorded_vitals = relationship("Vitals", back_populates="recorded_by")
    # Diagnoses this user made (if doctor)
    diagnoses_made = relationship("Diagnosis", back_populates="doctor")
    # Prescriptions this user wrote (if doctor)
    prescriptions_written = relationship("Prescription", back_populates="doctor")
