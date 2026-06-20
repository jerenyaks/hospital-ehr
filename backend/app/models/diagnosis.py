"""
Diagnosis model: a doctor's diagnosis for a given visit.

A visit can have multiple diagnoses (e.g. primary + secondary), so this
is many-to-one with Visit, not one-to-one.
"""

from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship

from app.db.session import Base


class Diagnosis(Base):
    __tablename__ = "diagnoses"

    id = Column(Integer, primary_key=True, index=True)
    visit_id = Column(Integer, ForeignKey("visits.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Free-text condition name, e.g. "Malaria" or "Type 2 Diabetes Mellitus"
    condition = Column(String, nullable=False)
    # Optional ICD-10 code for those who want to practice using real codes,
    # e.g. "B54" for unspecified malaria. Not required, since requiring a
    # full ICD lookup is out of scope for this project's first version.
    icd10_code = Column(String, nullable=True)

    notes = Column(Text, nullable=True)
    diagnosed_at = Column(DateTime, default=datetime.utcnow)

    visit = relationship("Visit", back_populates="diagnoses")
    doctor = relationship("User", back_populates="diagnoses_made")
