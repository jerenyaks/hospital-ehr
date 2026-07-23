from database import engine
from models import Base


"""
Seed script: creates demo staff accounts, sample medicine inventory,
and demo patients with visits at different workflow stages so the
app looks populated immediately (no empty dashboards).
Run with: python -m app.seed
"""

from datetime import date, datetime
from app.db.session import SessionLocal, Base, engine
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.models.pharmacy import Medicine
from app.models.lab_catalog import LabTestCatalog
from app.models.inpatient_record import InpatientDailyRecord
from app.models.store import StoreItem, StoreIssuance
from app.models.suppliers import Supplier, SupplyOrder
from sqlalchemy import text
from app.models.patient import Patient, Gender, BloodGroup
from app.models.visit import Visit, VisitStatus, VisitType
from app.models.vitals import Vitals
from app.models.diagnosis import Diagnosis
from app.models.prescription import Prescription
from app.models.lab import LabTest, LabTestStatus
from app.models.billing import Bill
import app.models  # noqa

Base.metadata.create_all(bind=engine)

COMMON_LAB_TESTS = [
    ("Malaria RDT", "Parasitology", 200.0),
    ("Full Blood Count (FBC)", "Haematology", 500.0),
    ("Urinalysis", "Microbiology", 300.0),
    ("Blood Sugar (Random)", "Chemistry", 200.0),
    ("Blood Sugar (Fasting)", "Chemistry", 200.0),
    ("Widal Test", "Serology", 400.0),
    ("HIV Test", "Serology", 300.0),
    ("Pregnancy Test (bHCG)", "Serology", 300.0),
    ("Liver Function Test (LFT)", "Chemistry", 800.0),
    ("Renal Function Test (RFT)", "Chemistry", 800.0),
    ("Stool Analysis", "Microbiology", 300.0),
    ("Chest X-Ray", "Radiology", 1000.0),
    ("Blood Grouping", "Haematology", 300.0),
    ("ESR", "Haematology", 250.0),
    ("Hepatitis B Screening", "Serology", 500.0),
]


def seed():
    db = SessionLocal()
    try:
        # Postgres enum types don't auto-update when a Python enum gains a new
        # value. Add it here, safely, if it isn't already present.
        try:
            db.execute(text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'store_keeper'"))
            db.commit()
        except Exception as e:
            db.rollback()
            print(f"Note: could not alter userrole enum (may not be Postgres, or already up to date): {e}")

        demo_users = [
            ("Admin User", "admin@hospital.ke", "admin123", UserRole.admin),
            ("Dr. Wanjiru Kamau", "doctor@hospital.ke", "doctor123", UserRole.doctor),
            ("Nurse Achieng Otieno", "nurse@hospital.ke", "nurse123", UserRole.nurse),
            ("Reception Mwangi", "reception@hospital.ke", "reception123", UserRole.receptionist),
            ("Pharmacist Njoki Waweru", "pharmacy@hospital.ke", "pharmacy123", UserRole.pharmacist),
            ("Lab Tech Otieno Odhiambo", "lab@hospital.ke", "lab123", UserRole.lab_technician),
            ("Store Keeper Kiptoo", "store@hospital.ke", "store123", UserRole.store_keeper),
        ]
        user_map = {}
        for full_name, email, password, role in demo_users:
            existing = db.query(User).filter(User.email == email).first()
            if existing:
                user_map[role] = existing
                continue
            user = User(full_name=full_name, email=email, hashed_password=hash_password(password), role=role)
            db.add(user)
            db.flush()
            user_map[role] = user
            print(f"Created {role.value}: {email} / {password}")

        db.commit()

        sample_medicines = [
            ("Paracetamol 500mg", "Painkiller", "tablets", 500, 50, 5.0),
            ("Amoxicillin 250mg", "Antibiotic", "capsules", 300, 30, 15.0),
            ("Artemether/Lumefantrine", "Antimalarial", "tablets", 200, 20, 120.0),
            ("Metformin 500mg", "Antidiabetic", "tablets", 400, 40, 8.0),
            ("Atorvastatin 20mg", "Statin", "tablets", 150, 15, 25.0),
            ("ORS Sachets", "Rehydration", "sachets", 250, 25, 10.0),
            ("Normal Saline 500ml", "IV Fluid", "bottles", 100, 10, 80.0),
            ("Omeprazole 20mg", "Antacid", "capsules", 300, 30, 12.0),
        ]
        for name, category, unit, stock, reorder, price in sample_medicines:
            if db.query(Medicine).filter(Medicine.name == name).first():
                continue
            db.add(Medicine(name=name, category=category, unit=unit, stock_quantity=stock, reorder_level=reorder, unit_price=price))
            print(f"Added medicine: {name}")
        db.commit()

        sample_store_items = [
            ("Rice", "Food", "kg", 100, 20, 150.0),
            ("Maize Flour (Unga)", "Food", "kg", 80, 15, 120.0),
            ("Cooking Oil", "Food", "litres", 40, 10, 350.0),
            ("Beans", "Food", "kg", 60, 15, 180.0),
            ("Sugar", "Food", "kg", 50, 10, 160.0),
            ("Milk", "Food", "litres", 30, 10, 70.0),
            ("Bed Sheets", "Bedding", "pieces", 60, 10, 800.0),
            ("Blankets", "Bedding", "pieces", 40, 8, 1200.0),
            ("Patient Gowns", "Patient supplies", "pieces", 50, 10, 500.0),
            ("Detergent", "Cleaning", "kg", 25, 5, 200.0),
            ("Disinfectant", "Cleaning", "litres", 30, 8, 350.0),
            ("Toilet Paper", "Patient supplies", "rolls", 100, 20, 45.0),
        ]
        for name, category, unit, qty, reorder, price in sample_store_items:
            if db.query(StoreItem).filter(StoreItem.name == name).first():
                continue
            db.add(StoreItem(name=name, category=category, unit=unit, quantity=qty, reorder_level=reorder, unit_price=price))
            print(f"Added store item: {name}")
        db.commit()

        sample_suppliers = [
            ("MediPlus Kenya Ltd", "James Mwangi", "+254711223344", "sales@mediplus.co.ke", "PPB-CERT-00123", True, "Nairobi, Kenya"),
            ("Pharma Direct Suppliers", "Grace Achieng", "+254722334455", "info@pharmadirect.co.ke", "PPB-CERT-00456", True, "Mombasa, Kenya"),
            ("Unverified Meds Co.", "N/A", "+254700000000", None, None, False, None),
        ]
        for name, contact, phone, email, license_no, certified, address in sample_suppliers:
            if db.query(Supplier).filter(Supplier.name == name).first():
                continue
            db.add(Supplier(name=name, contact_person=contact, phone=phone, email=email, license_number=license_no, is_certified=certified, address=address))
            print(f"Added supplier: {name}")
        db.commit()

        existing_test_names = {t.test_name for t in db.query(LabTestCatalog).all()}
        catalog_added = 0
        for name, category, price in COMMON_LAB_TESTS:
            if name in existing_test_names:
                continue
            db.add(LabTestCatalog(test_name=name, category=category, price=price))
            catalog_added += 1
        db.commit()
        if catalog_added:
            print(f"Added {catalog_added} lab test catalog entries")
        else:
            print("Lab test catalog already populated, skipping.")

        if db.query(Patient).count() > 0:
            print("Patients already exist, skipping demo patient creation.")
            print_summary()
            return

        receptionist = user_map[UserRole.receptionist]
        nurse = user_map[UserRole.nurse]
        doctor = user_map[UserRole.doctor]
        lab_tech = user_map[UserRole.lab_technician]

        demo_patients = [
            {
                "first_name": "Wambui", "last_name": "Njoroge", "date_of_birth": date(1990, 4, 12),
                "gender": Gender.female, "national_id": "30123456", "phone_number": "+254712345678",
                "county": "Kajiado", "address": "Kitengela", "next_of_kin_name": "John Njoroge",
                "next_of_kin_phone": "+254700111222", "next_of_kin_relationship": "Spouse",
                "blood_group": BloodGroup.o_pos, "allergies": "Penicillin",
            },
            {
                "first_name": "Kevin", "last_name": "Otieno", "date_of_birth": date(1985, 8, 2),
                "gender": Gender.male, "national_id": "28900112", "phone_number": "+254722334455",
                "county": "Kajiado", "address": "Kitengela", "next_of_kin_name": "Grace Otieno",
                "next_of_kin_phone": "+254733445566", "next_of_kin_relationship": "Spouse",
                "blood_group": BloodGroup.a_pos, "allergies": None,
            },
            {
                "first_name": "Amina", "last_name": "Hassan", "date_of_birth": date(2001, 1, 20),
                "gender": Gender.female, "national_id": "35678901", "phone_number": "+254744556677",
                "county": "Kajiado", "address": "Athi River", "next_of_kin_name": "Fatuma Hassan",
                "next_of_kin_phone": "+254755667788", "next_of_kin_relationship": "Mother",
                "blood_group": BloodGroup.b_pos, "allergies": None,
            },
        ]

        patients = []
        for i, p in enumerate(demo_patients):
            patient = Patient(patient_number=f"KNH-{i+1:06d}", **p)
            db.add(patient)
            db.flush()
            patients.append(patient)
        db.commit()
        print(f"Created {len(patients)} demo patients")

        v1 = Visit(patient_id=patients[0].id, chief_complaint="Fever and headache for 3 days",
                    checked_in_by_id=receptionist.id, status=VisitStatus.waiting, visit_type=VisitType.outpatient)
        db.add(v1); db.flush()
        db.add(Bill(visit_id=v1.id, patient_id=patients[0].id, consultation_fee=500.0, total_amount=500.0))

        v2 = Visit(patient_id=patients[1].id, chief_complaint="Persistent cough and chest pain",
                    checked_in_by_id=receptionist.id, status=VisitStatus.with_doctor, visit_type=VisitType.outpatient)
        db.add(v2); db.flush()
        db.add(Vitals(visit_id=v2.id, recorded_by_id=nurse.id, temperature_celsius=38.2, systolic_bp=122,
                       diastolic_bp=80, pulse_bpm=88, respiratory_rate=20, weight_kg=74, height_cm=175))
        bill2 = Bill(visit_id=v2.id, patient_id=patients[1].id, consultation_fee=500.0, lab_fee=200.0, total_amount=700.0)
        db.add(bill2)
        lt = LabTest(visit_id=v2.id, ordered_by_id=doctor.id, test_name="Chest X-Ray", test_category="Radiology",
                      notes="Rule out pneumonia", status=LabTestStatus.pending)
        db.add(lt)

        v3 = Visit(patient_id=patients[2].id, chief_complaint="Routine check-up", checked_in_by_id=receptionist.id,
                    status=VisitStatus.completed, visit_type=VisitType.outpatient, completed_at=datetime.utcnow())
        db.add(v3); db.flush()
        db.add(Vitals(visit_id=v3.id, recorded_by_id=nurse.id, temperature_celsius=36.7, systolic_bp=110,
                       diastolic_bp=70, pulse_bpm=72, respiratory_rate=16, weight_kg=58, height_cm=162))
        db.add(Diagnosis(visit_id=v3.id, doctor_id=doctor.id, condition="Healthy - no concerns", icd10_code="Z00.0"))
        db.add(Bill(visit_id=v3.id, patient_id=patients[2].id, consultation_fee=500.0, total_amount=500.0,
                     is_paid=True, paid_at=datetime.utcnow(), payment_method="M-Pesa"))

        db.commit()
        print("Created 3 demo visits (waiting, with_doctor, completed) with vitals/bills/lab test")
        print_summary()
    finally:
        db.close()


def print_summary():
    print("\nSeed complete.")
    print("Accounts: admin / doctor / nurse / reception / pharmacy / lab @hospital.ke")
    print("Passwords: role name + 123 (e.g. admin123, pharmacy123, lab123)")


if __name__ == "__main__":
    seed()