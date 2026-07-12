from datetime import date
from sqlalchemy.orm import Session
from app.db.session import engine
from app.models import Patient, Doctor, Appointment

def seed_demo():
    session = Session(bind=engine)

    # Demo doctors
    doctor1 = Doctor(name="Dr. Achieng", specialty="Cardiology", contact="0712345678")
    doctor2 = Doctor(name="Dr. Kamau", specialty="Pediatrics", contact="0723456789")

    # Demo patients
    patient1 = Patient(
        patient_number="KNH-0001",
        first_name="John",
        last_name="Otieno",
        date_of_birth=date(1985, 5, 12),   # FIXED: Python date object
        gender="male",
        phone_number="0700000001",
        next_of_kin_name="Mary Otieno",
        next_of_kin_phone="0700000002",
    )

    patient2 = Patient(
        patient_number="KNH-0002",
        first_name="Grace",
        last_name="Njeri",
        date_of_birth=date(1990, 8, 20),   # FIXED: Python date object
        gender="female",
        phone_number="0700000003",
        next_of_kin_name="Peter Njeri",
        next_of_kin_phone="0700000004",
    )

    # Demo appointments
    appt1 = Appointment(
        patient=patient1,
        doctor=doctor1,
        date="2026-07-12",
        patient_type="Outpatient"
    )
    appt2 = Appointment(
        patient=patient2,
        doctor=doctor2,
        date="2026-07-13",
        patient_type="Inpatient"
    )

    session.add_all([doctor1, doctor2, patient1, patient2, appt1, appt2])
    session.commit()
    session.close()

if __name__ == "__main__":
    seed_demo()
    print("Demo data seeded successfully!")
