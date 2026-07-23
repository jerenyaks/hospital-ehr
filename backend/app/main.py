from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.session import Base, engine
import app.models  # noqa
from app.routers import auth, users, patients, visits
from app.routers import pharmacy, lab, billing, reports, enhancements, inpatient_records, store, suppliers
Base.metadata.create_all(bind=engine)
app = FastAPI(
    title=settings.app_name,
    description="Electronic Health Records system for a Kenyan hospital — v2.",
    version="0.2.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(patients.router)
app.include_router(visits.router)
app.include_router(pharmacy.router)
app.include_router(lab.router)
app.include_router(billing.router)
app.include_router(reports.router)
app.include_router(enhancements.router)
app.include_router(inpatient_records.router)
app.include_router(store.router)
app.include_router(suppliers.router)
@app.get("/")
def root():
    return {"status": "ok", "service": settings.app_name, "version": "0.2.0"}
@app.get("/health")
def health_check():
    return {"status": "healthy"}