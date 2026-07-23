"""
Daily inpatient records: vitals, notes, and medication given, logged
each day a patient is admitted. Both doctors and nurses can add entries.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Text
from sqlalchemy.orm import relationship
from app.db.session import Base


class InpatientDailyRecord(Base):
    __tablename__ = "inpatient_daily_records"

    id = Column(Integer, primary_key=True, index=True)
    visit_id = Column(Integer, ForeignKey("visits.id"), nullable=False)
    recorded_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    temperature_celsius = Column(Float, nullable=True)
    systolic_bp = Column(Integer, nullable=True)
    diastolic_bp = Column(Integer, nullable=True)
    pulse_bpm = Column(Integer, nullable=True)

    condition_notes = Column(Text, nullable=True)
    medication_given = Column(Text, nullable=True)

    recorded_at = Column(DateTime, default=datetime.utcnow)

    visit = relationship("Visit")
    recorded_by = relationship("User")