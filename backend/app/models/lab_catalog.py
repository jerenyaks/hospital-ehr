"""
Lab test catalog: predefined list of test types doctors can order from.
"""

from sqlalchemy import Column, Integer, String, Float
from app.db.session import Base


class LabTestCatalog(Base):
    __tablename__ = "lab_test_catalog"

    id = Column(Integer, primary_key=True, index=True)
    test_name = Column(String, nullable=False, index=True)
    category = Column(String, nullable=True)
    price = Column(Float, default=200.0)