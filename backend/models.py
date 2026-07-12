# models.py
from sqlalchemy import Column, Integer, String, Date, DECIMAL, TIMESTAMP, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class Patients(Base):
    __tablename__ = "patients"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    dob = Column(Date)
    contact = Column(String(50))

class Doctors(Base):
    __tablename__ = "doctors"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    specialty = Column(String(50))
    contact = Column(String(50))

class Appointments(Base):
    __tablename__ = "appointments"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="SET NULL"))
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="SET NULL"))
    appointment_date = Column(TIMESTAMP)
    status = Column(String(20))
    patient_type = Column(String(20))  # Inpatient/Outpatient

class Pharmacy(Base):
    __tablename__ = "pharmacy"
    id = Column(Integer, primary_key=True, index=True)
    medicine_name = Column(String(100))
    stock = Column(Integer)
    expiry_date = Column(Date)
    price = Column(DECIMAL(10,2))

class Prescriptions(Base):
    __tablename__ = "prescriptions"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="SET NULL"))
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="SET NULL"))
    medicine_id = Column(Integer, ForeignKey("pharmacy.id", ondelete="SET NULL"))
    quantity = Column(Integer)
    date = Column(TIMESTAMP)

class LabBilling(Base):
    __tablename__ = "lab_billing"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"))
    test_name = Column(String(100))
    amount = Column(DECIMAL(10,2))
    date = Column(TIMESTAMP)

class PharmacyBilling(Base):
    __tablename__ = "pharmacy_billing"
    id = Column(Integer, primary_key=True, index=True)
    prescription_id = Column(Integer, ForeignKey("prescriptions.id", ondelete="CASCADE"))
    amount = Column(DECIMAL(10,2))
    date = Column(TIMESTAMP)

class AuditLogs(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_role = Column(String(50))
    action = Column(String(100))
    table_name = Column(String(50))
    timestamp = Column(TIMESTAMP)
