# FoodBridge AI - FastAPI Backend

This is the FastAPI backend service for **FoodBridge AI**, an AI-Powered Food Waste Management Platform for Surplus Identification and Redistribution Optimization.

## Features

- **JWT Authentication & Multi-Tenant Isolation**: Secure user registration, login, and tenant boundaries enforced via `business_id`.
- **Relational PostgreSQL Database**: Managed with SQLAlchemy 2.x and Pydantic schemas.
- **Prophet AI Demand Forecasting Engine**: Fits daily retail sales time series for 7, 14, 30-day forecast horizons.
- **Transparent Waste Risk Engine**: Computes reproducible risk scores (0–100) and levels (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) with human-readable explanations.
- **Smart Reorder Engine**: Computes optimized reorder quantities bounded by storage capacities.
- **Surplus & Redistribution Workflow**: Identifies surplus items and tracks NGO donation lifecycles (`AVAILABLE`, `REQUESTED`, `SCHEDULED`, `COMPLETED`, `CANCELLED`).
- **APScheduler Background Jobs**: Automated daily recalculation of predictions at 06:30 AM.

## Setup & Running

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# Initialize database
python scripts/create_tables.py
python scripts/seed_database.py

# Launch server
uvicorn app.main:app --reload --port 8000
```

Interactive Swagger API Documentation available at:
`http://127.0.0.1:8000/docs`
