"""
Pharmacy models: Medicine inventory and Dispensing records.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Text
from sqlalchemy.orm import relationship
from app.db.session import Base


class Medicine(Base):
    __tablename__ = "medicines"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    category = Column(String, nullable=True)
    unit = Column(String, nullable=False)
    stock_quantity = Column(Integer, default=0)
    reorder_level = Column(Integer, default=10)
    unit_price = Column(Float, default=0.0)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    dispensings = relationship("Dispensing", back_populates="medicine")


class Dispensing(Base):
    __tablename__ = "dispensings"

    id = Column(Integer, primary_key=True, index=True)
    prescription_id = Column(Integer, ForeignKey("prescriptions.id"), nullable=False)
    medicine_id = Column(Integer, ForeignKey("medicines.id"), nullable=False)
    dispensed_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    quantity_dispensed = Column(Integer, nullable=False)
    notes = Column(Text, nullable=True)
    dispensed_at = Column(DateTime, default=datetime.utcnow)

    prescription = relationship("Prescription", back_populates="dispensings")
    medicine = relationship("Medicine", back_populates="dispensings")
    dispensed_by = relationship("User", back_populates="dispensings_done")