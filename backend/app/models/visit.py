"""
Visit model: one hospital encounter.
Now supports inpatient/outpatient classification, ward/bed assignment,
and discharge notes for inpatients.
"""

import enum
from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship

from app.db.session import Base


class VisitStatus(str, enum.Enum):
    waiting = "waiting"
    with_nurse = "with_nurse"
    with_doctor = "with_doctor"
    admitted = "admitted"
    completed = "completed"
    cancelled = "cancelled"


class VisitType(str, enum.Enum):
    outpatient = "outpatient"
    inpatient = "inpatient"


class Visit(Base):
    __tablename__ = "visits"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    checked_in_at = Column(DateTime, default=datetime.utcnow)
    checked_in_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    chief_complaint = Column(Text, nullable=True)
    status = Column(Enum(VisitStatus), default=VisitStatus.waiting, nullable=False)
    visit_type = Column(Enum(VisitType), default=VisitType.outpatient, nullable=False)

    ward = Column(String, nullable=True)
    bed_number = Column(String, nullable=True)
    discharge_notes = Column(Text, nullable=True)
    discharged_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    patient = relationship("Patient", back_populates="visits")
    checked_in_by = relationship(
        "User", back_populates="checked_in_visits", foreign_keys=[checked_in_by_id]
    )
    vitals = relationship("Vitals", back_populates="visit", uselist=False)
    diagnoses = relationship("Diagnosis", back_populates="visit")
    prescriptions = relationship("Prescription", back_populates="visit")
    lab_tests = relationship("LabTest", back_populates="visit")
    bill = relationship("Bill", back_populates="visit", uselist=False)