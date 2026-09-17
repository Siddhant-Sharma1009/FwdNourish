# backend/app/api/forecasting.py

from pathlib import Path
import json

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.forecasting.forecast_service import forecast_service
from app.services.forecasting.risk_engine import (
    calculate_waste_risk,
    calculate_reorder_quantity,
)
from sqlalchemy.orm import Session
from fastapi import Depends

from app.core.database import SessionLocal
from app.services.ai_inventory_service import AIInventoryService
from app.models.inventory import Inventory
from app.services.forecasting.risk_engine import (
    calculate_waste_risk,
    calculate_reorder_quantity,
)
from app.services.ai_inventory_service import AIInventoryService
from app.core.database import SessionLocal
from app.services.ai_batch_prediction import ai_batch_prediction_service
from app.models.ai_prediction import AIPrediction

router = APIRouter(
    prefix="/ai",
    tags=["AI Forecasting"],
)


def get_db():
    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()


ARTIFACT_DIR = (
    Path(__file__).resolve().parents[2]
    / "artifacts"
    / "forecasting"
)

SELECTED_MODEL_FILE = ARTIFACT_DIR / "selected_model.json"

class ForecastRequest(BaseModel):
    category_id: int = Field(..., ge=1)
    horizon: int = Field(default=7, ge=1, le=30)


class WeeklyForecastRequest(BaseModel):
    category_id: int = Field(..., ge=1)


class WasteRiskRequest(BaseModel):
    days_to_expiry: float
    current_stock: float = Field(..., ge=0)
    forecast_daily_demand: float = Field(..., ge=0)

class ReorderRequest(BaseModel):
    current_stock: float = Field(..., ge=0)
    forecast_daily_demand: float = Field(..., ge=0)
    lead_time_days: int = Field(default=2, ge=0)
    review_period_days: int = Field(default=7, ge=1)
    safety_stock_days: float = Field(default=1.0, ge=0)
    storage_capacity: float | None = None


    # Calculate reorder recommendation for one inventory item

    def calculate_inventory_reorder(
        self,
        inventory: Inventory,
        lead_time_days: int = 2,
        review_period_days: int = 7,
        safety_stock_days: float = 1.0,
        storage_capacity: float | None = None,
    ):

        forecast_daily_demand = self.get_forecast_daily_demand(
            inventory.category_id
        )

        recommended_quantity = calculate_reorder_quantity(
            current_stock=inventory.quantity,
            forecast_daily_demand=forecast_daily_demand,
            lead_time_days=lead_time_days,
            review_period_days=review_period_days,
            safety_stock_days=safety_stock_days,
            storage_capacity=storage_capacity,
        )

        return {
            "inventory_id": inventory.id,
            "sku": inventory.sku,
            "name": inventory.name,
            "category_id": inventory.category_id,
            "current_stock": inventory.quantity,
            "unit": inventory.unit,
            "forecast_daily_demand": round(
                forecast_daily_demand,
                2,
            ),
            "lead_time_days": lead_time_days,
            "review_period_days": review_period_days,
            "safety_stock_days": safety_stock_days,
            "recommended_purchase_quantity": recommended_quantity,
        }


    # ---------------------------------------------------------------
    # Calculate reorder recommendations for all inventory
    # ---------------------------------------------------------------

    def calculate_all_inventory_reorder(
        self,
        lead_time_days: int = 2,
        review_period_days: int = 7,
        safety_stock_days: float = 1.0,
    ):

        inventory_items = (
            self.db.query(Inventory)
            .all()
        )

        results = []

        for inventory in inventory_items:

            try:

                result = self.calculate_inventory_reorder(
                    inventory=inventory,
                    lead_time_days=lead_time_days,
                    review_period_days=review_period_days,
                    safety_stock_days=safety_stock_days,
                )

                results.append(result)

            except FileNotFoundError as e:

                results.append({
                    "inventory_id": inventory.id,
                    "sku": inventory.sku,
                    "name": inventory.name,
                    "category_id": inventory.category_id,
                    "error": str(e),
                })

            except Exception as e:

                results.append({
                    "inventory_id": inventory.id,
                    "sku": inventory.sku,
                    "name": inventory.name,
                    "category_id": inventory.category_id,
                    "error": str(e),
                })

        return results

# -------------------------------------------------------------------
# MODEL INFO
# -------------------------------------------------------------------

@router.get("/model")
def get_selected_model():

    if not SELECTED_MODEL_FILE.exists():
        raise HTTPException(
            status_code=404,
            detail="No trained model found. Run train_forecasting.py first.",
        )

    with open(SELECTED_MODEL_FILE, "r") as f:
        return json.load(f)


# -------------------------------------------------------------------
# DAILY FORECAST
# -------------------------------------------------------------------

@router.post("/forecast")
def get_forecast(payload: ForecastRequest):

    try:
        forecast = forecast_service.forecast_category(
            category_id=payload.category_id,
            horizon=payload.horizon,
        )

        return {
            "model": "Prophet",
            "category_id": payload.category_id,
            "horizon_days": payload.horizon,
            "forecast": forecast.to_dict(orient="records"),
        }

    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -------------------------------------------------------------------
# WEEKLY FORECAST
# -------------------------------------------------------------------

@router.post("/forecast/weekly")
def weekly_forecast(payload: WeeklyForecastRequest):

    try:
        result = forecast_service.get_weekly_demand(
            category_id=payload.category_id
        )

        return {
            "model": "Prophet",
            **result,
        }

    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -------------------------------------------------------------------
# WASTE RISK
# -------------------------------------------------------------------

@router.post("/waste-risk")
def waste_risk(payload: WasteRiskRequest):

    result = calculate_waste_risk(
        days_to_expiry=payload.days_to_expiry,
        current_stock=payload.current_stock,
        forecast_daily_demand=payload.forecast_daily_demand,
    )

    return result


# -------------------------------------------------------------------
# REORDER RECOMMENDATION
# -------------------------------------------------------------------

@router.post("/reorder")
def reorder(payload: ReorderRequest):

    quantity = calculate_reorder_quantity(
        current_stock=payload.current_stock,
        forecast_daily_demand=payload.forecast_daily_demand,
        lead_time_days=payload.lead_time_days,
        review_period_days=payload.review_period_days,
        safety_stock_days=payload.safety_stock_days,
        storage_capacity=payload.storage_capacity,
    )

    return {
        "model": "Prophet",
        "recommended_purchase_quantity": quantity,
        "current_stock": payload.current_stock,
        "forecast_daily_demand": payload.forecast_daily_demand,
    }


@router.get("/inventory-risk")
def get_inventory_risk(
    db: Session = Depends(get_db),
):

    service = AIInventoryService(db)

    results = service.calculate_all_inventory_risk()

    return {
        "count": len(results),
        "results": results,
    }
    
@router.get("/inventory-risk/{inventory_id}")
def get_single_inventory_risk(
    inventory_id: int,
    db: Session = Depends(get_db),
):

    inventory = (
        db.query(Inventory)
        .filter(
            Inventory.id == inventory_id
        )
        .first()
    )

    if inventory is None:

        raise HTTPException(
            status_code=404,
            detail="Inventory item not found.",
        )

    service = AIInventoryService(db)

    try:

        result = service.calculate_inventory_risk(
            inventory
        )

        return result

    except FileNotFoundError as e:

        raise HTTPException(
            status_code=404,
            detail=str(e),
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e),
        )
        
@router.get("/inventory-reorder")
def get_inventory_reorder(
    db: Session = Depends(get_db),
):

    service = AIInventoryService(db)

    results = service.calculate_all_inventory_reorder()

    return {
        "count": len(results),
        "results": results,
    }
    

@router.get("/inventory-reorder/{inventory_id}")
def get_single_inventory_reorder(
    inventory_id: int,
    db: Session = Depends(get_db),
):

    inventory = (
        db.query(Inventory)
        .filter(
            Inventory.id == inventory_id
        )
        .first()
    )

    if inventory is None:

        raise HTTPException(
            status_code=404,
            detail="Inventory item not found.",
        )

    service = AIInventoryService(db)

    try:

        return service.calculate_inventory_reorder(
            inventory
        )

    except FileNotFoundError as e:

        raise HTTPException(
            status_code=404,
            detail=str(e),
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e),
        )
        
@router.post("/batch-prediction")
def run_batch_prediction():
    db = SessionLocal()

    try:
        return ai_batch_prediction_service.run_batch(db)

    finally:
        db.close()
        
        
@router.get("/predictions")
def get_predictions():
    db = SessionLocal()

    try:
        predictions = (
            db.query(AIPrediction)
            .order_by(
                AIPrediction.forecast_date.desc(),
                AIPrediction.inventory_id.asc(),
            )
            .all()
        )

        return [
            {
                "id": prediction.id,
                "inventory_id": prediction.inventory_id,
                "forecast_date": str(prediction.forecast_date),
                "forecast_daily_demand": prediction.forecast_daily_demand,
                "risk_score": prediction.risk_score,
                "risk_level": prediction.risk_level,
                "recommended_purchase_quantity": (
                    prediction.recommended_purchase_quantity
                ),
                "model_name": prediction.model_name,
                "created_at": (
                    prediction.created_at.isoformat()
                    if prediction.created_at
                    else None
                ),
            }
            for prediction in predictions
        ]

    finally:
        db.close()


@router.get("/predictions/high-risk")
def get_high_risk_predictions():
    db = SessionLocal()

    try:
        predictions = (
            db.query(AIPrediction)
            .filter(
                AIPrediction.risk_level.in_(
                    ["HIGH", "MEDIUM"]
                )
            )
            .order_by(
                AIPrediction.risk_score.desc()
            )
            .all()
        )

        return [
            {
                "id": prediction.id,
                "inventory_id": prediction.inventory_id,
                "forecast_date": str(prediction.forecast_date),
                "forecast_daily_demand": prediction.forecast_daily_demand,
                "risk_score": prediction.risk_score,
                "risk_level": prediction.risk_level,
                "recommended_purchase_quantity": (
                    prediction.recommended_purchase_quantity
                ),
                "model_name": prediction.model_name,
            }
            for prediction in predictions
        ]

    finally:
        db.close()        

@router.get("/predictions/{inventory_id}")
def get_inventory_prediction(inventory_id: int):
    db = SessionLocal()

    try:
        prediction = (
            db.query(AIPrediction)
            .filter(
                AIPrediction.inventory_id == inventory_id
            )
            .order_by(
                AIPrediction.forecast_date.desc()
            )
            .first()
        )

        if prediction is None:
            raise HTTPException(
                status_code=404,
                detail=(
                    f"No AI prediction found for "
                    f"inventory {inventory_id}"
                ),
            )

        return {
            "id": prediction.id,
            "inventory_id": prediction.inventory_id,
            "forecast_date": str(prediction.forecast_date),
            "forecast_daily_demand": prediction.forecast_daily_demand,
            "risk_score": prediction.risk_score,
            "risk_level": prediction.risk_level,
            "recommended_purchase_quantity": (
                prediction.recommended_purchase_quantity
            ),
            "model_name": prediction.model_name,
            "created_at": (
                prediction.created_at.isoformat()
                if prediction.created_at
                else None
            ),
        }

    finally:
        db.close()
        
