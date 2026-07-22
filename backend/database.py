# database.py
import os  # <-- Added this to read environment variables from Render
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 1. Try to get the "DATABASE_URL" from Render's settings.
# 2. If it is not found (like when you are working on your own computer),
#    it will fall back to your local localhost database.
SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://username:admin123@localhost/hospital_db"
)

# Render's database URL sometimes starts with "postgres://".
# SQLAlchemy requires it to start with "postgresql://". 
# This small fix prevents errors on Render.
if SQLALCHEMY_DATABASE_URL and SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()