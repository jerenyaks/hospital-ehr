"""
Application configuration.

DATABASE_URL is the single point of control for which database we use.
Today it defaults to a local SQLite file so the project runs with zero setup.
Later, switching to PostgreSQL is just a matter of setting an environment
variable -- no code changes needed anywhere else in the app, because
SQLAlchemy abstracts the database differences for us.

Example for switching to Postgres later:
    DATABASE_URL=postgresql://user:password@localhost:5432/hospital_ehr
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Hospital EHR System"

    # Default: local SQLite file, zero setup required.
    # Override by setting the DATABASE_URL environment variable.
    database_url: str = "sqlite:///./hospital.db"

    # JWT auth settings.
    # IMPORTANT: this default secret is for local development ONLY.
    # In any real deployment, set SECRET_KEY as an environment variable
    # to a long random string and never commit it to source control.
    secret_key: str = "dev-secret-key-CHANGE-THIS-before-any-real-deployment"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 8  # 8-hour shift-length sessions

    class Config:
        env_file = ".env"


settings = Settings()
