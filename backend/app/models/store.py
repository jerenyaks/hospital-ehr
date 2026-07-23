"""
Store model: food and patient supplies inventory, managed by the store keeper.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text
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