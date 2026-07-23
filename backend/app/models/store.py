"""
Store model: food and patient supplies inventory, managed by the store keeper.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey
from app.db.session import Base


class StoreItem(Base):
    __tablename__ = "store_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    category = Column(String, nullable=True)  # e.g. "Food", "Bedding", "Cleaning", "Patient supplies"
    unit = Column(String, nullable=False)
    quantity = Column(Integer, default=0)
    reorder_level = Column(Integer, default=10)
    unit_price = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class StoreIssuance(Base):
    """
    Record of a store item being given out — either to a specific patient's
    visit, or generally to a ward/department when it's not patient-specific
    (e.g. cleaning supplies for a whole ward).
    """
    __tablename__ = "store_issuances"

    id = Column(Integer, primary_key=True, index=True)
    store_item_id = Column(Integer, ForeignKey("store_items.id"), nullable=False)
    visit_id = Column(Integer, ForeignKey("visits.id"), nullable=True)
    ward = Column(String, nullable=True)
    quantity_issued = Column(Integer, nullable=False)
    issued_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    notes = Column(Text, nullable=True)
    issued_at = Column(DateTime, default=datetime.utcnow)