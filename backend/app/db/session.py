import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://username:admin123@localhost/hospital_db"
)

# Create the SQLAlchemy engine. 
# (Note: For SQLite, you might need connect_args={"check_same_thread": False}, 
# but for PostgreSQL, the default settings are usually sufficient.)
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Create a SessionLocal class. 
# Each instance of this class will represent a database session.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create a Base class. 
# Your database models will inherit from this class to map Python classes to database tables.
Base = declarative_base()

# A helper function/dependency to manage database session lifecycle.
# It ensures the session is closed after the request or transaction is finished.
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()