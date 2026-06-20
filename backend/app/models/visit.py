"""
Visit model: represents a single hospital encounter/visit.

This is the spine of the clinical workflow. A patient can have many visits
over time (that's the whole point of an EHR -- a longitudinal record).
Each visit moves through a status lifecycle that mirrors the real
front-desk -> nurse -> doctor flow in a hospital:

    waiting -> with_nurse -> with_doctor -> completed
                                          -> cancelled

Vitals, diagnoses, and prescriptions all hang off a Visit, not off the
Patient directly, because that's clinically correct: a diagnosis belongs
to a specific encounter, not to the patient's identity record.
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
    completed = "completed"
    cancelled = "cancelled"


class Visit(Base):
    __tablename__ = "visits"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)

    checked_in_at = Column(DateTime, default=datetime.utcnow)
    checked_in_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    chief_complaint = Column(Text, nullable=True)  # reason for visit, in patient's words
    status = Column(Enum(VisitStatus), default=VisitStatus.waiting, nullable=False)

    completed_at = Column(DateTime, nullable=True)

    patient = relationship("Patient", back_populates="visits")
    checked_in_by = relationship(
        "User", back_populates="checked_in_visits", foreign_keys=[checked_in_by_id]
    )

    vitals = relationship("Vitals", back_populates="visit", uselist=False)
    diagnoses = relationship("Diagnosis", back_populates="visit")
    prescriptions = relationship("Prescription", back_populates="visit")
