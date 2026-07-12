"""
Billing model: auto-generated bill per visit.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Text, Boolean
from sqlalchemy.orm import relationship
from app.db.session import Base


class Bill(Base):
    __tablename__ = "bills"

    id = Column(Integer, primary_key=True, index=True)
    visit_id = Column(Integer, ForeignKey("visits.id"), unique=True, nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)

    consultation_fee = Column(Float, default=500.0)
    lab_fee = Column(Float, default=0.0)
    pharmacy_fee = Column(Float, default=0.0)
    other_fee = Column(Float, default=0.0)

    total_amount = Column(Float, default=0.0)
    is_paid = Column(Boolean, default=False)
    paid_at = Column(DateTime, nullable=True)
    payment_method = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    visit = relationship("Visit", back_populates="bill")
    patient = relationship("Patient")
    # existing Bill class stays unchanged...

class PharmacyBill(Base):
    __tablename__ = "pharmacy_billing"

    id = Column(Integer, primary_key=True, index=True)
    prescription_id = Column(Integer, ForeignKey("prescriptions.id", ondelete="CASCADE"))
    amount = Column(Float, default=0.0)
    date = Column(DateTime, default=datetime.utcnow)


class LabBill(Base):
    __tablename__ = "lab_billing"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"))
    test_name = Column(String(100))
    amount = Column(Float, default=0.0)
    date = Column(DateTime, default=datetime.utcnow)
