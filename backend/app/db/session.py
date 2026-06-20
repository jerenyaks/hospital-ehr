"""
Database engine and session management.

This module is intentionally database-agnostic. The `connect_args` line
below is the only SQLite-specific quirk in the entire codebase (SQLite
needs check_same_thread=False to work with FastAPI's threaded request
handling). When we switch to PostgreSQL, that line is simply skipped.
Everything else -- models, queries, relationships -- works unchanged
on either database, because SQLAlchemy generates the right SQL dialect
for whichever DATABASE_URL is configured.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.core.config import settings

connect_args = {}
if settings.database_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(settings.database_url, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a DB session and ensures it's closed."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
