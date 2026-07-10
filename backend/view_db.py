"""
Prints a readable summary of everything in the live database.
Run with: python view_db.py
"""

from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://hospital_ehr_db_user:mU8oikq8KvsY3MNICVwFEWmmUfPK4o7y@dpg-d8ragipo3t8c73cueo00-a.oregon-postgres.render.com/hospital_ehr_db"

engine = create_engine(DATABASE_URL)
conn = engine.connect()

def show_table(title, query):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print('='*60)
    result = conn.execute(text(query))
    rows = result.fetchall()
    columns = result.keys()
    if not rows:
        print("  (no records)")
        return
    for row in rows:
        for col, val in zip(columns, row):
            print(f"  {col}: {val}")
        print("  " + "-"*40)

show_table("USERS (staff accounts)", "SELECT id, full_name, email, role, is_active FROM users ORDER BY id")
show_table("PATIENTS", "SELECT id, patient_number, first_name, last_name, phone_number FROM patients ORDER BY id")
show_table("VISITS", "SELECT id, patient_id, status, visit_type, ward, bed_number, chief_complaint FROM visits ORDER BY id")
show_table("VITALS", "SELECT id, visit_id, temperature_celsius, pulse_bpm, systolic_bp, diastolic_bp FROM vitals ORDER BY id")
show_table("DIAGNOSES", "SELECT id, visit_id, condition, icd10_code FROM diagnoses ORDER BY id")
show_table("PRESCRIPTIONS", "SELECT id, visit_id, medication_name, dosage, frequency FROM prescriptions ORDER BY id")
show_table("MEDICINES (pharmacy inventory)", "SELECT id, name, stock_quantity, unit, unit_price FROM medicines ORDER BY id")
show_table("DISPENSINGS", "SELECT id, prescription_id, medicine_id, quantity_dispensed FROM dispensings ORDER BY id")
show_table("LAB TESTS", "SELECT id, visit_id, test_name, status FROM lab_tests ORDER BY id")
show_table("LAB RESULTS", "SELECT id, lab_test_id, result_value, reference_range FROM lab_results ORDER BY id")
show_table("BILLS", "SELECT id, visit_id, total_amount, is_paid, payment_method FROM bills ORDER BY id")

print(f"\n{'='*60}")
print("  Done.")
print('='*60)