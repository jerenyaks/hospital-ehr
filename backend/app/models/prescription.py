"""
Prescription model: medication prescribed by a doctor during a visit.

Many-to-one with Visit, since a single visit commonly results in
multiple prescriptions (e.g. an antimalarial plus a painkiller).
"""

from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship

from app.db.session import Base


class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True, index=True)
    visit_id = Column(Integer, ForeignKey("visits.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    medication_name = Column(String, nullable=False)  # e.g. "Amoxicillin"
    dosage = Column(String, nullable=False)            # e.g. "500mg"
    frequency = Column(String, nullable=False)         # e.g. "3 times a day"
    duration = Column(String, nullable=False)          # e.g. "7 days"
    instructions = Column(Text, nullable=True)          # e.g. "Take after meals"

    prescribed_at = Column(DateTime, default=datetime.utcnow)

    visit = relationship("Visit", back_populates="prescriptions")
    doctor = relationship("User", back_populates="prescriptions_written")
