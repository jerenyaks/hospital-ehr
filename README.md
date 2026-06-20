# Kitengela District Hospital — EHR System

A patient records (EHR) system built for a Kenyan hospital context, with
role-based access for receptionists, nurses, doctors, and admins.

## Project structure

```
hospital-ehr/
├── backend/          FastAPI + SQLAlchemy + SQLite API
│   └── app/
│       ├── models/       Database tables (User, Patient, Visit, Vitals, Diagnosis, Prescription)
│       ├── schemas/      Request/response shapes (Pydantic)
│       ├── routers/      API endpoints (auth, users, patients, visits)
│       ├── core/         Config, security (JWT/password hashing), auth dependencies
│       ├── db/           Database connection setup
│       ├── main.py       App entry point
│       └── seed.py       Creates the first admin + demo accounts
└── frontend/          React + Vite app
    └── src/
        ├── api/           Functions that call the backend
        ├── context/       Auth state (who's logged in)
        ├── components/    Shared UI pieces (TopBar, StatusPill, buttons, etc.)
        └── pages/          One page per role: Login, Reception, Nurse, Doctor, Admin
```

## Prerequisites

- **Python 3.10+** (check with `python3 --version`)
- **Node.js 18+** (check with `node --version`)

Both are commonly already installed; if not, install Python from
python.org and Node from nodejs.org.

## 1. Set up the backend

Open a terminal in the `backend/` folder:

```bash
cd backend
python3 -m venv venv

# Activate the virtual environment:
# On Mac/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

pip install -r requirements.txt
```

Create the database and demo accounts:

```bash
python -m app.seed
```

This creates `hospital.db` (a local SQLite file — no separate database
server needed) with four demo accounts:

| Role         | Email                  | Password      |
|--------------|-------------------------|----------------|
| Admin        | admin@hospital.ke       | admin123       |
| Doctor       | doctor@hospital.ke      | doctor123      |
| Nurse        | nurse@hospital.ke       | nurse123       |
| Receptionist | reception@hospital.ke   | reception123   |

Start the backend server:

```bash
uvicorn app.main:app --reload
```

The API is now running at **http://localhost:8000**. You can see every
endpoint and try them interactively at **http://localhost:8000/docs**.

Keep this terminal running.

## 2. Set up the frontend

Open a **second** terminal in the `frontend/` folder:

```bash
cd frontend
npm install
npm run dev
```

The app will be available at **http://localhost:5173**. Log in with any
of the demo accounts above.

## How the clinical workflow works

1. **Receptionist** logs in, registers a new patient (or finds an
   existing one), and checks them in for a visit.
2. **Nurse** sees the patient in their "waiting" queue, records vitals
   (temperature, blood pressure, pulse, weight, height). This
   automatically moves the visit into the doctor's queue.
3. **Doctor** sees the patient in their queue, reviews vitals and the
   patient's past visit history, adds a diagnosis and prescription(s),
   then marks the visit complete.
4. **Admin** manages staff accounts (create/deactivate users).

## Switching from SQLite to PostgreSQL later

The whole backend was built so this is a one-line change. In
`backend/app/core/config.py`, the `database_url` defaults to a local
SQLite file. To use PostgreSQL instead, set an environment variable
before starting the server:

```bash
export DATABASE_URL="postgresql://username:password@localhost:5432/hospital_ehr"
```

You'll also need to `pip install psycopg2-binary` and create the
`hospital_ehr` database in PostgreSQL first. No code changes are
required — SQLAlchemy handles the rest.

## Important notes

- This is a learning/demo project, **not** production-ready software.
  Before this could ever touch real patient data, it would need: HTTPS,
  a real secrets-management setup (the JWT secret key is currently a
  placeholder default), audit logging, database migrations (Alembic),
  rate limiting, and compliance review against Kenya's Data Protection
  Act, 2019.
- There's no public sign-up page by design — staff accounts are created
  by an admin only, which mirrors how real hospital systems work.
- Medical records are never deleted in this system, only added to —
  that's standard practice for any real EHR.
