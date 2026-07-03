from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://hospital_ehr_db_user:mU8oikq8KvsY3MNICVwFEWmmUfPK4o7y@dpg-d8ragipo3t8c73cueo00-a.oregon-postgres.render.com/hospital_ehr_db"

engine = create_engine(DATABASE_URL)
conn = engine.connect()
conn.execute(text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'pharmacist'"))
conn.commit()
conn.execute(text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'lab_technician'"))
conn.commit()
print("Done")