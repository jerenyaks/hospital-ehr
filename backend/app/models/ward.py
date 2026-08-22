"""
Ward model: defines each ward and its total bed capacity.
Bed occupancy is computed from active admitted visits, not stored directly.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime
from app.db.session import Base


class Ward(Base):
    __tablename__ = "wards"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False, index=True)
    capacity = Column(Integer, nullable=False, default=10)
    created_at = Column(DateTime, default=datetime.utcnow)
    