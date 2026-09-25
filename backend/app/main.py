from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models  # noqa: F401
from app.core.database import Base, engine
from app.api.forecasting import router as forecasting_router
from app.api.routes import (
    auth,
    admin,
    tenants,
    inventory,
    transactions,
    expiry,
    categories,
    csv_upload,
    pos,
    donations,
    ngo_requirement,
    donation_matches,
    pickup,
    notification,
    ngo,
)
from app.core.scheduler import start_scheduler, stop_scheduler

Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(
    title="AI Food Waste Management Platform",
    version="1.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(tenants.router)
app.include_router(inventory.router)
app.include_router(transactions.router)
app.include_router(expiry.router)
app.include_router(categories.router)
app.include_router(csv_upload.router)
app.include_router(pos.router)
app.include_router(donations.router)
app.include_router(ngo_requirement.router)
app.include_router(forecasting_router)
app.include_router(donation_matches.router)
app.include_router(pickup.router)
app.include_router(notification.router)
app.include_router(ngo.router)

@app.get("/")
def root():
    return {"message": "Food Waste Management API is running"}
