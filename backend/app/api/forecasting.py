# backend/app/api/forecasting.py

from contextlib import contextmanager
from pathlib import Path
import json

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.security import require_tenant, require_admin
from app.models.user import User
from app.models.inventory import Inventory
from app.models.ai_prediction import AIPrediction

from app.services.forecasting.forecast_service import forecast_service
from app.services.forecasting.risk_engine import (
    calculate_waste_risk,
    calculate_reorder_quantity,
)
from app.services.ai_inventory_service import AIInventoryService
from app.services.ai_batch_prediction import ai_batch_prediction_service


# ============================================================================
# ROUTER
# ============================================================================

router = APIRouter(
    prefix="/api/v1",
    tags=["AI Forecasting"],
)


# ============================================================================
# DATABASE
# ============================================================================

def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


# ============================================================================
# MODEL ARTIFACTS
# ============================================================================

ARTIFACT_DIR = (
    Path(__file__).resolve().parents[2]
    / "artifacts"
    / "forecasting"
)

SELECTED_MODEL_FILE = ARTIFACT_DIR / "selected_model.json"


# ============================================================================
# REQUEST SCHEMAS
# ============================================================================

class ForecastRequest(BaseModel):
    """
    Forecast demand for a specific inventory item.

    The inventory item determines the category used by the
    forecasting model.
    """

    inventory_id: int = Field(..., ge=1)
    horizon: int = Field(default=14, ge=1, le=30)


class WeeklyForecastRequest(BaseModel):
    category_id: int = Field(..., ge=1)


class WasteRiskRequest(BaseModel):
    days_to_expiry: float
    current_stock: float = Field(..., ge=0)
    forecast_daily_demand: float = Field(..., ge=0)


class ReorderRequest(BaseModel):
    """
    Generate a reorder recommendation for an inventory item.

    Current stock and forecast demand are obtained from the
    inventory and AI forecasting services.
    """

    inventory_id: int = Field(..., ge=1)
    lead_time_days: int = Field(default=2, ge=0)
    review_period_days: int = Field(default=7, ge=1)
    safety_stock_days: float = Field(default=1.0, ge=0)
    storage_capacity: float | None = None


# ============================================================================
# MODEL INFO
# ============================================================================

@router.get("/model")
def get_selected_model():
    if not SELECTED_MODEL_FILE.exists():
        raise HTTPException(
            status_code=404,
            detail=(
                "No trained model found. "
                "Run train_forecasting.py first."
            ),
        )

    with open(SELECTED_MODEL_FILE, "r") as f:
        return json.load(f)


# ============================================================================
# DAILY FORECAST
# ============================================================================

@router.post("/forecast")
def get_forecast(
    payload: ForecastRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_tenant),
):
    """
    Generate a demand forecast for a specific inventory item.

    The inventory item's category is passed to the Prophet
    forecasting service.
    """

    if not user.tenant_id:
        raise HTTPException(
            status_code=403,
            detail="Tenant profile is not configured.",
        )

    inventory = (
        db.query(Inventory)
        .filter(
            Inventory.id == payload.inventory_id,
            Inventory.tenant_id == user.tenant_id,
        )
        .first()
    )

    if inventory is None:
        raise HTTPException(
            status_code=404,
            detail="Inventory item not found.",
        )

    try:
        forecast = forecast_service.forecast_category(
            category_id=inventory.category_id,
            horizon=payload.horizon,
        )

        forecast_records = forecast.to_dict(
            orient="records"
        )

        return {
            "inventory_id": inventory.id,
            "product_name": inventory.name,
            "sku": inventory.sku,
            "category_id": inventory.category_id,
            "current_stock": inventory.quantity,
            "unit": inventory.unit,
            "model": "Prophet",
            "horizon_days": payload.horizon,
            "forecast": forecast_records,
        }

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


# ============================================================================
# WEEKLY FORECAST
# ============================================================================

@router.post("/forecast/weekly")
def weekly_forecast(
    payload: WeeklyForecastRequest,
):
    try:
        result = forecast_service.get_weekly_demand(
            category_id=payload.category_id
        )

        return {
            "model": "Prophet",
            **result,
        }

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


# ============================================================================
# WASTE RISK
# ============================================================================

@router.post("/waste-risk")
def waste_risk(
    payload: WasteRiskRequest,
):
    result = calculate_waste_risk(
        days_to_expiry=payload.days_to_expiry,
        current_stock=payload.current_stock,
        forecast_daily_demand=payload.forecast_daily_demand,
    )

    return result


# ============================================================================
# REORDER RECOMMENDATION
# ============================================================================

@router.post("/reorder")
def reorder(
    payload: ReorderRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_tenant),
):
    """
    Generate an AI reorder recommendation for one inventory item.

    The AIInventoryService obtains the forecast demand using the
    inventory category and calculates the recommended quantity.
    """

    if not user.tenant_id:
        raise HTTPException(
            status_code=403,
            detail="Tenant profile is not configured.",
        )

    inventory = (
        db.query(Inventory)
        .filter(
            Inventory.id == payload.inventory_id,
            Inventory.tenant_id == user.tenant_id,
        )
        .first()
    )

    if inventory is None:
        raise HTTPException(
            status_code=404,
            detail="Inventory item not found.",
        )

    try:
        service = AIInventoryService(db)

        result = service.calculate_inventory_reorder(
            inventory=inventory,
            lead_time_days=payload.lead_time_days,
            review_period_days=payload.review_period_days,
            safety_stock_days=payload.safety_stock_days,
            storage_capacity=payload.storage_capacity,
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


# ============================================================================
# INVENTORY WASTE RISK
# ============================================================================

@router.get("/inventory-risk")
def get_inventory_risk(
    db: Session = Depends(get_db),
    user: User = Depends(require_tenant),
):
    """
    Calculate AI waste risk for all inventory items
    belonging to the logged-in tenant.
    """

    if not user.tenant_id:
        raise HTTPException(
            status_code=403,
            detail="Tenant profile is not configured.",
        )

    service = AIInventoryService(db)

    items = (
        db.query(Inventory)
        .filter(
            Inventory.tenant_id == user.tenant_id
        )
        .all()
    )

    results = []

    for item in items:
        try:
            result = service.calculate_inventory_risk(item)

            # Ensure frontend always has product information.
            result["product_name"] = (
                result.get("product_name")
                or item.name
            )

            result["sku"] = (
                result.get("sku")
                or item.sku
            )

            result["current_stock"] = (
                result.get("current_stock")
                if result.get("current_stock") is not None
                else item.quantity
            )

            result["inventory_id"] = item.id

            results.append(result)

        except Exception as e:
            results.append(
                {
                    "inventory_id": item.id,
                    "product_name": item.name,
                    "sku": item.sku,
                    "current_stock": item.quantity,
                    "risk_score": 0,
                    "risk_level": "LOW",
                    "days_to_expiry": 0,
                    "error": str(e),
                }
            )

    return {
        "count": len(results),
        "results": results,
    }


# ============================================================================
# SINGLE INVENTORY WASTE RISK
# ============================================================================

@router.get("/inventory-risk/{inventory_id}")
def get_single_inventory_risk(
    inventory_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_tenant),
):
    inventory = (
        db.query(Inventory)
        .filter(
            Inventory.id == inventory_id,
            Inventory.tenant_id == user.tenant_id,
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

        result["inventory_id"] = inventory.id
        result["product_name"] = (
            result.get("product_name")
            or inventory.name
        )
        result["sku"] = (
            result.get("sku")
            or inventory.sku
        )

        if result.get("current_stock") is None:
            result["current_stock"] = inventory.quantity

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


# ============================================================================
# INVENTORY REORDER
# ============================================================================

@router.get("/inventory-reorder")
def get_inventory_reorder(
    db: Session = Depends(get_db),
    user: User = Depends(require_tenant),
):
    """
    Calculate reorder recommendations for all inventory
    items belonging to the logged-in tenant.
    """

    if not user.tenant_id:
        raise HTTPException(
            status_code=403,
            detail="Tenant profile is not configured.",
        )

    service = AIInventoryService(db)

    items = (
        db.query(Inventory)
        .filter(
            Inventory.tenant_id == user.tenant_id
        )
        .all()
    )

    results = []

    for item in items:
        try:
            result = service.calculate_inventory_reorder(
                inventory=item
            )

            result["inventory_id"] = item.id

            result["product_name"] = (
                result.get("product_name")
                or result.get("name")
                or item.name
            )

            result["sku"] = (
                result.get("sku")
                or item.sku
            )

            result["current_stock"] = (
                result.get("current_stock")
                if result.get("current_stock") is not None
                else item.quantity
            )

            # Keep frontend field name consistent.
            if result.get(
                "recommended_quantity"
            ) is None:
                result["recommended_quantity"] = (
                    result.get(
                        "recommended_purchase_quantity"
                    )
                    or 0
                )

            results.append(result)

        except FileNotFoundError as e:
            results.append(
                {
                    "inventory_id": item.id,
                    "product_name": item.name,
                    "sku": item.sku,
                    "current_stock": item.quantity,
                    "recommended_quantity": 0,
                    "reason": str(e),
                }
            )

        except Exception as e:
            results.append(
                {
                    "inventory_id": item.id,
                    "product_name": item.name,
                    "sku": item.sku,
                    "current_stock": item.quantity,
                    "recommended_quantity": 0,
                    "reason": str(e),
                }
            )

    return {
        "count": len(results),
        "results": results,
    }


# ============================================================================
# SINGLE INVENTORY REORDER
# ============================================================================

@router.get("/inventory-reorder/{inventory_id}")
def get_single_inventory_reorder(
    inventory_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_tenant),
):
    inventory = (
        db.query(Inventory)
        .filter(
            Inventory.id == inventory_id,
            Inventory.tenant_id == user.tenant_id,
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
        result = service.calculate_inventory_reorder(
            inventory
        )

        result["inventory_id"] = inventory.id

        result["product_name"] = (
            result.get("product_name")
            or result.get("name")
            or inventory.name
        )

        result["sku"] = (
            result.get("sku")
            or inventory.sku
        )

        result["current_stock"] = (
            result.get("current_stock")
            if result.get("current_stock") is not None
            else inventory.quantity
        )

        if result.get("recommended_quantity") is None:
            result["recommended_quantity"] = (
                result.get(
                    "recommended_purchase_quantity"
                )
                or 0
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


# ============================================================================
# BATCH PREDICTION
# ============================================================================

@router.post("/batch-prediction")
def run_batch_prediction(
    admin: User = Depends(require_admin),
):
    """
    Run the AI batch prediction process.

    This endpoint remains admin-only because the batch operation
    processes inventory records and creates AIPrediction records.
    """

    db = SessionLocal()

    try:
        return ai_batch_prediction_service.run_batch(db)

    finally:
        db.close()


# ============================================================================
# PREDICTIONS
# ============================================================================

# ============================================================================
# PREDICTIONS
# ============================================================================

@router.get("/predictions")
def get_predictions(
    user: User = Depends(require_tenant),
):
    """
    Return only the latest AI prediction for each inventory item
    belonging to the logged-in tenant.
    """

    if not user.tenant_id:
        raise HTTPException(
            status_code=403,
            detail="Tenant profile is not configured.",
        )

    db = SessionLocal()

    try:
        # ------------------------------------------------------------------
        # Find the latest prediction ID for every inventory item
        # ------------------------------------------------------------------

        latest_prediction_ids = (
            db.query(
                AIPrediction.inventory_id,
                func.max(AIPrediction.id).label("latest_id"),
            )
            .join(
                Inventory,
                Inventory.id == AIPrediction.inventory_id,
            )
            .filter(
                Inventory.tenant_id == user.tenant_id
            )
            .group_by(
                AIPrediction.inventory_id
            )
            .subquery()
        )

        # ------------------------------------------------------------------
        # Fetch only those latest prediction records
        # ------------------------------------------------------------------

        predictions = (
            db.query(
                AIPrediction,
                Inventory,
            )
            .join(
                Inventory,
                Inventory.id == AIPrediction.inventory_id,
            )
            .join(
                latest_prediction_ids,
                latest_prediction_ids.c.latest_id
                == AIPrediction.id,
            )
            .filter(
                Inventory.tenant_id == user.tenant_id
            )
            .order_by(
                AIPrediction.inventory_id.asc()
            )
            .all()
        )

        # ------------------------------------------------------------------
        # Build response
        # ------------------------------------------------------------------

        return [
            {
                "id": prediction.id,
                "inventory_id": prediction.inventory_id,

                "product_name": inventory.name,
                "sku": inventory.sku,
                "category_id": inventory.category_id,
                "current_stock": inventory.quantity,
                "unit": inventory.unit,

                "forecast_date": str(
                    prediction.forecast_date
                ),

                "forecast_daily_demand": float(
                    prediction.forecast_daily_demand or 0
                ),

                "risk_score": float(
                    prediction.risk_score or 0
                ),

                "risk_level": prediction.risk_level,

                "recommended_purchase_quantity": float(
                    prediction.recommended_purchase_quantity or 0
                ),

                "model_name": prediction.model_name,

                "created_at": (
                    prediction.created_at.isoformat()
                    if prediction.created_at
                    else None
                ),
            }
            for prediction, inventory in predictions
        ]

    finally:
        db.close()


# ============================================================================
# HIGH / CRITICAL RISK PREDICTIONS
# ============================================================================

@router.get("/predictions/high-risk")
def get_high_risk_predictions(
    user: User = Depends(require_tenant),
):
    """
    Return only HIGH and CRITICAL risk predictions.

    MEDIUM risk items are intentionally excluded.
    """

    if not user.tenant_id:
        raise HTTPException(
            status_code=403,
            detail="Tenant profile is not configured.",
        )

    db = SessionLocal()

    try:
        predictions = (
            db.query(
                AIPrediction,
                Inventory,
            )
            .join(
                Inventory,
                Inventory.id == AIPrediction.inventory_id,
            )
            .filter(
                Inventory.tenant_id == user.tenant_id,
                AIPrediction.risk_level.in_(
                    ["HIGH", "CRITICAL"]
                ),
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

                "product_name": inventory.name,
                "sku": inventory.sku,
                "category_id": inventory.category_id,
                "current_stock": inventory.quantity,
                "unit": inventory.unit,

                "forecast_date": str(
                    prediction.forecast_date
                ),

                "forecast_daily_demand": float(
                    prediction.forecast_daily_demand
                    or 0
                ),

                "risk_score": float(
                    prediction.risk_score
                    or 0
                ),

                "risk_level": (
                    prediction.risk_level
                ),

                "recommended_purchase_quantity": float(
                    prediction.recommended_purchase_quantity
                    or 0
                ),

                "model_name": prediction.model_name,

                "created_at": (
                    prediction.created_at.isoformat()
                    if prediction.created_at
                    else None
                ),
            }
            for prediction, inventory in predictions
        ]

    finally:
        db.close()


# ============================================================================
# SINGLE PREDICTION
# ============================================================================

@router.get("/predictions/{inventory_id}")
def get_inventory_prediction(
    inventory_id: int,
    user: User = Depends(require_tenant),
):
    """
    Return the latest AI prediction for one inventory item.
    """

    if not user.tenant_id:
        raise HTTPException(
            status_code=403,
            detail="Tenant profile is not configured.",
        )

    db = SessionLocal()

    try:
        result = (
            db.query(
                AIPrediction,
                Inventory,
            )
            .join(
                Inventory,
                Inventory.id == AIPrediction.inventory_id,
            )
            .filter(
                AIPrediction.inventory_id == inventory_id,
                Inventory.tenant_id == user.tenant_id,
            )
            .order_by(
                AIPrediction.forecast_date.desc()
            )
            .first()
        )

        if result is None:
            raise HTTPException(
                status_code=404,
                detail=(
                    f"No AI prediction found for "
                    f"inventory {inventory_id}"
                ),
            )

        prediction, inventory = result

        return {
            "id": prediction.id,
            "inventory_id": prediction.inventory_id,

            "product_name": inventory.name,
            "sku": inventory.sku,
            "category_id": inventory.category_id,
            "current_stock": inventory.quantity,
            "unit": inventory.unit,

            "forecast_date": str(
                prediction.forecast_date
            ),

            "forecast_daily_demand": float(
                prediction.forecast_daily_demand
                or 0
            ),

            "risk_score": float(
                prediction.risk_score
                or 0
            ),

            "risk_level": (
                prediction.risk_level
            ),

            "recommended_purchase_quantity": float(
                prediction.recommended_purchase_quantity
                or 0
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