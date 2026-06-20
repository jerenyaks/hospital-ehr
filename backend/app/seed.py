"""
Seed script: creates the first admin account and a few demo staff users
so you can log in and explore the system immediately.

Run with:
    python -m app.seed

Safe to re-run: it checks for existing users by email before creating.
"""

from app.db.session import SessionLocal, Base, engine
from app.core.security import hash_password
from app.models.user import User, UserRole
import app.models  # noqa: F401

Base.metadata.create_all(bind=engine)


def seed():
    db = SessionLocal()
    try:
        demo_users = [
            ("Admin User", "admin@hospital.ke", "admin123", UserRole.admin),
            ("Dr. Wanjiru Kamau", "doctor@hospital.ke", "doctor123", UserRole.doctor),
            ("Nurse Achieng Otieno", "nurse@hospital.ke", "nurse123", UserRole.nurse),
            ("Reception Mwangi", "reception@hospital.ke", "reception123", UserRole.receptionist),
        ]

        for full_name, email, password, role in demo_users:
            existing = db.query(User).filter(User.email == email).first()
            if existing:
                print(f"Skipping {email} (already exists)")
                continue

            user = User(
                full_name=full_name,
                email=email,
                hashed_password=hash_password(password),
                role=role,
            )
            db.add(user)
            print(f"Created {role.value}: {email} / {password}")

        db.commit()
        print("\nSeed complete. You can log in with any of the accounts above.")
        print("IMPORTANT: these are demo credentials -- change or remove them before any real deployment.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
