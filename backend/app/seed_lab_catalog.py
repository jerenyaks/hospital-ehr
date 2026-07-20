"""
One-time script to populate the lab test catalog with common tests.
Run manually: python -m app.seed_lab_catalog
"""

from app.db.session import SessionLocal
from app.models.lab_catalog import LabTestCatalog

COMMON_TESTS = [
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

def run():
    db = SessionLocal()
    try:
        existing_names = {t.test_name for t in db.query(LabTestCatalog).all()}
        added = 0
        for name, category, price in COMMON_TESTS:
            if name not in existing_names:
                db.add(LabTestCatalog(test_name=name, category=category, price=price))
                added += 1
        db.commit()
        print(f"Lab catalog seeded. Added {added} new tests.")
    finally:
        db.close()

if __name__ == "__main__":
    run()