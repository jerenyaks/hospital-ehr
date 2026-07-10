"""One-time fix: add v2 columns/enum values to the already-existing
Postgres tables from v1, since create_all() only creates NEW tables
and does not alter existing ones."""

from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://hospital_ehr_db_user:mU8oikq8KvsY3MNICVwFEWmmUfPK4o7y@dpg-d8ragipo3t8c73cueo00-a.oregon-postgres.render.com/hospital_ehr_db"

engine = create_engine(DATABASE_URL)
conn = engine.connect()

# 1. Add 'admitted' to the existing visitstatus enum, if missing
conn.execute(text("ALTER TYPE visitstatus ADD VALUE IF NOT EXISTS 'admitted'"))
conn.commit()

# 2. Create the new visittype enum, if it doesn't exist yet
conn.execute(text("""
    DO $$ BEGIN
        CREATE TYPE visittype AS ENUM ('outpatient', 'inpatient');
    EXCEPTION
        WHEN duplicate_object THEN null;
    END $$;
"""))
conn.commit()

# 3. Add the new columns to the visits table, if missing
statements = [
    "ALTER TABLE visits ADD COLUMN IF NOT EXISTS visit_type visittype NOT NULL DEFAULT 'outpatient'",
    "ALTER TABLE visits ADD COLUMN IF NOT EXISTS ward VARCHAR",
    "ALTER TABLE visits ADD COLUMN IF NOT EXISTS bed_number VARCHAR",
    "ALTER TABLE visits ADD COLUMN IF NOT EXISTS discharge_notes TEXT",
    "ALTER TABLE visits ADD COLUMN IF NOT EXISTS discharged_at TIMESTAMP",
]
for stmt in statements:
    conn.execute(text(stmt))
    conn.commit()

print("Done - visits table updated successfully")