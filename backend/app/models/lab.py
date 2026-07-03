"""
Lab models: LabTest orders and LabResult records.
"""

import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from app.db.session import Base


class LabTestStatus(str, enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"


class LabTest(Base):
    __tablename__ = "lab_tests"

    id = Column(Integer, primary_key=True, index=True)
    visit_id = Column(Integer, ForeignKey("visits.id"), nullable=False)
    ordered_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    test_name = Column(String, nullable=False)
    test_category = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(Enum(LabTestStatus), default=LabTestStatus.pending)
    ordered_at = Column(DateTime, default=datetime.utcnow)

    visit = relationship("Visit", back_populates="lab_tests")
    ordered_by = relationship("User", back_populates="lab_tests_ordered", foreign_keys=[ordered_by_id])
    result = relationship("LabResult", back_populates="lab_test", uselist=False)


class LabResult(Base):
    __tablename__ = "lab_results"

    id = Column(Integer, primary_key=True, index=True)
    lab_test_id = Column(Integer, ForeignKey("lab_tests.id"), unique=True, nullable=False)
    recorded_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    result_value = Column(Text, nullable=False)
    reference_range = Column(String, nullable=True)
    interpretation = Column(Text, nullable=True)
    recorded_at = Column(DateTime, default=datetime.utcnow)

    lab_test = relationship("LabTest", back_populates="result")
    recorded_by = relationship("User", back_populates="lab_results_recorded")