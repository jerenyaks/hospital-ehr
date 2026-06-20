"""
Vitals model: measurements a nurse takes during triage.

One-to-one with Visit (a visit has exactly one vitals record, taken
once at triage) -- this matches Visit.vitals being uselist=False on
the other side of the relationship.
"""

from datetime import datetime

from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.db.session import Base


class Vitals(Base):
    __tablename__ = "vitals"

    id = Column(Integer, primary_key=True, index=True)
    visit_id = Column(Integer, ForeignKey("visits.id"), unique=True, nullable=False)
    recorded_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    temperature_celsius = Column(Float, nullable=True)
    systolic_bp = Column(Integer, nullable=True)
    diastolic_bp = Column(Integer, nullable=True)
    pulse_bpm = Column(Integer, nullable=True)
    respiratory_rate = Column(Integer, nullable=True)
    weight_kg = Column(Float, nullable=True)
    height_cm = Column(Float, nullable=True)

    recorded_at = Column(DateTime, default=datetime.utcnow)

    visit = relationship("Visit", back_populates="vitals")
    recorded_by = relationship("User", back_populates="recorded_vitals")

    @property
    def bmi(self):
        if self.weight_kg and self.height_cm:
            height_m = self.height_cm / 100
            return round(self.weight_kg / (height_m ** 2), 1)
        return None
