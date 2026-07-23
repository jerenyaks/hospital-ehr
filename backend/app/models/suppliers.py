"""
Supplier models: certified medicine suppliers and restock orders.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
from app.db.session import Base


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    contact_person = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    license_number = Column(String, nullable=True)
    is_certified = Column(Boolean, default=False)
    address = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class SupplyOrder(Base):
    """A restock event: a supplier delivering a quantity of a medicine."""
    __tablename__ = "supply_orders"

    id = Column(Integer, primary_key=True, index=True)
    medicine_id = Column(Integer, ForeignKey("medicines.id"), nullable=False)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    quantity_supplied = Column(Integer, nullable=False)
    unit_cost = Column(Float, nullable=True)
    ordered_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    notes = Column(Text, nullable=True)
    received_at = Column(DateTime, default=datetime.utcnow)