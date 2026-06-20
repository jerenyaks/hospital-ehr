"""
Importing all models here ensures SQLAlchemy's Base.metadata knows about
every table before we call create_all(). Without this, models that
aren't imported anywhere wouldn't get their tables created.
"""

from app.models.user import User, UserRole
from app.models.patient import Patient, Gender, BloodGroup
from app.models.visit import Visit, VisitStatus
from app.models.vitals import Vitals
from app.models.diagnosis import Diagnosis
from app.models.prescription import Prescription

__all__ = [
    "User", "UserRole",
    "Patient", "Gender", "BloodGroup",
    "Visit", "VisitStatus",
    "Vitals",
    "Diagnosis",
    "Prescription",
]
