from datetime import date

from sqlalchemy.orm import Session

from app.models.inventory import Inventory
from app.models.ai_prediction import AIPrediction
from app.services.ai_inventory_service import AIInventoryService


class AIBatchPredictionService:
    def run_batch(self, db: Session, tenant_id: int | None = None):
        """
        Generate or update today's predictions.

        When tenant_id is supplied, only that tenant's active inventory is
        processed. Soft-deleted inventory is always excluded.
        """
        inventory_query = db.query(Inventory).filter(
            Inventory.is_deleted.is_(False)
        )

        if tenant_id is not None:
            inventory_query = inventory_query.filter(
                Inventory.tenant_id == tenant_id
            )

        inventories = inventory_query.order_by(Inventory.id).all()
        results = []
        today = date.today()
        inventory_service = AIInventoryService(db)

        for inventory in inventories:
            try:
                risk = inventory_service.calculate_inventory_risk(inventory)
                reorder = inventory_service.calculate_inventory_reorder(inventory)

                prediction = (
                    db.query(AIPrediction)
                    .filter(
                        AIPrediction.inventory_id == inventory.id,
                        AIPrediction.forecast_date == today,
                    )
                    .first()
                )

                prediction_values = {
                    "forecast_daily_demand": risk["forecast_daily_demand"],
                    "risk_score": risk["risk_score"],
                    "risk_level": risk["risk_level"],
                    "recommended_purchase_quantity": (
                        reorder["recommended_purchase_quantity"]
                    ),
                    "model_name": "Prophet",
                }

                if prediction is None:
                    prediction = AIPrediction(
                        inventory_id=inventory.id,
                        forecast_date=today,
                        **prediction_values,
                    )
                    db.add(prediction)
                else:
                    for field, value in prediction_values.items():
                        setattr(prediction, field, value)

                results.append(
                    {
                        "inventory_id": inventory.id,
                        "risk_score": risk["risk_score"],
                        "risk_level": risk["risk_level"],
                        "forecast_daily_demand": risk["forecast_daily_demand"],
                        "recommended_purchase_quantity": (
                            reorder["recommended_purchase_quantity"]
                        ),
                        "status": "success",
                    }
                )

            except Exception as exc:
                results.append(
                    {
                        "inventory_id": inventory.id,
                        "status": "failed",
                        "error": str(exc),
                    }
                )

        try:
            db.commit()
        except Exception:
            db.rollback()
            raise

        return {
            "total_inventory": len(inventories),
            "successful": sum(
                1 for item in results if item["status"] == "success"
            ),
            "failed": sum(
                1 for item in results if item["status"] == "failed"
            ),
            "results": results,
        }


ai_batch_prediction_service = AIBatchPredictionService()
