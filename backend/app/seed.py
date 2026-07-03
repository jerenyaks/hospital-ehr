"""
Seed script: creates demo staff accounts and sample medicine inventory.
Run with: python -m app.seed
"""

from app.db.session import SessionLocal, Base, engine
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.models.pharmacy import Medicine
import app.models  # noqa

Base.metadata.create_all(bind=engine)


def seed():
    db = SessionLocal()
    try:
        demo_users = [
            ("Admin User", "admin@hospital.ke", "admin123", UserRole.admin),
            ("Dr. Wanjiru Kamau", "doctor@hospital.ke", "doctor123", UserRole.doctor),
            ("Nurse Achieng Otieno", "nurse@hospital.ke", "nurse123", UserRole.nurse),
            ("Reception Mwangi", "reception@hospital.ke", "reception123", UserRole.receptionist),
            ("Pharmacist Njoki Waweru", "pharmacy@hospital.ke", "pharmacy123", UserRole.pharmacist),
            ("Lab Tech Otieno Odhiambo", "lab@hospital.ke", "lab123", UserRole.lab_technician),
        ]

        for full_name, email, password, role in demo_users:
            existing = db.query(User).filter(User.email == email).first()
            if existing:
                print(f"Skipping {email} (already exists)")
                continue
            user = User(full_name=full_name, email=email, hashed_password=hash_password(password), role=role)
            db.add(user)
            print(f"Created {role.value}: {email} / {password}")

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
            existing = db.query(Medicine).filter(Medicine.name == name).first()
            if existing:
                print(f"Skipping medicine {name} (already exists)")
                continue
            med = Medicine(name=name, category=category, unit=unit, stock_quantity=stock, reorder_level=reorder, unit_price=price)
            db.add(med)
            print(f"Added medicine: {name}")

        db.commit()
        print("\nSeed complete.")
        print("Accounts: admin / doctor / nurse / reception / pharmacy / lab @hospital.ke")
        print("Passwords: role name + 123 (e.g. admin123, pharmacy123, lab123)")
    finally:
        db.close()


if __name__ == "__main__":
    seed()