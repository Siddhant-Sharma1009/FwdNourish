from sqlalchemy.orm import Session
from datetime import date

from app.models.inventory import Inventory
from app.models.ai_prediction import AIPrediction
from app.services.ai_inventory_service import AIInventoryService


class AIBatchPredictionService:

    def __init__(self):
        pass

    def run_batch(self, db: Session):

        inventories = (
            db.query(Inventory)
            .order_by(Inventory.id)
            .all()
        )

        results = []

        for inventory in inventories:

            try:
                inventory_service = AIInventoryService(db)

                risk = inventory_service.calculate_inventory_risk(
                    inventory
                )

                reorder = inventory_service.calculate_inventory_reorder(
                    inventory
                )

                today = date.today()

                # Check whether today's prediction already exists
                prediction = (
                    db.query(AIPrediction)
                    .filter(
                        AIPrediction.inventory_id == inventory.id,
                        AIPrediction.forecast_date == today,
                    )
                    .first()
                )

                if prediction is None:

                    # Create a new prediction
                    prediction = AIPrediction(
                        inventory_id=inventory.id,
                        forecast_date=today,
                        forecast_daily_demand=risk[
                            "forecast_daily_demand"
                        ],
                        risk_score=risk["risk_score"],
                        risk_level=risk["risk_level"],
                        recommended_purchase_quantity=reorder[
                            "recommended_purchase_quantity"
                        ],
                        model_name="Prophet",
                    )

                    db.add(prediction)

                else:

                    # Update today's existing prediction
                    prediction.forecast_daily_demand = risk[
                        "forecast_daily_demand"
                    ]

                    prediction.risk_score = risk[
                        "risk_score"
                    ]

                    prediction.risk_level = risk[
                        "risk_level"
                    ]

                    prediction.recommended_purchase_quantity = (
                        reorder[
                            "recommended_purchase_quantity"
                        ]
                    )

                    prediction.model_name = "Prophet"

                results.append({
                    "inventory_id": inventory.id,
                    "risk_score": risk["risk_score"],
                    "risk_level": risk["risk_level"],
                    "forecast_daily_demand": risk[
                        "forecast_daily_demand"
                    ],
                    "recommended_purchase_quantity": reorder[
                        "recommended_purchase_quantity"
                    ],
                    "status": "success",
                })

            except Exception as e:

                results.append({
                    "inventory_id": inventory.id,
                    "status": "failed",
                    "error": str(e),
                })

        db.commit()

        return {
            "total_inventory": len(inventories),
            "successful": sum(
                1
                for x in results
                if x["status"] == "success"
            ),
            "failed": sum(
                1
                for x in results
                if x["status"] == "failed"
            ),
            "results": results,
        }


ai_batch_prediction_service = AIBatchPredictionService()