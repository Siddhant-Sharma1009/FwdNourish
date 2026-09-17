from datetime import date
from sqlalchemy.orm import Session
from app.models.inventory import Inventory
from app.services.forecasting.forecast_service import forecast_service
from app.services.forecasting.risk_engine import (
    calculate_waste_risk,
    calculate_reorder_quantity,
)


class AIInventoryService:

    def __init__(self, db: Session):
        self.db = db

    @staticmethod
    def calculate_days_to_expiry(expiry_date):

        today = date.today()
        return (expiry_date - today).days


    # FORECAST

    def get_forecast_daily_demand(
        self,
        category_id: int,
    ):

        forecast = forecast_service.forecast_category(
            category_id=category_id,
            horizon=7,
        )

        if forecast.empty:
            return 0.0

        return float(
            forecast["predicted_demand"].mean()
        )

    # WASTE RISK FOR ONE INVENTORY ITEM


    def calculate_inventory_risk(
        self,
        inventory: Inventory,
    ):

        days_to_expiry = self.calculate_days_to_expiry(
            inventory.expiry_date
        )

        forecast_daily_demand = (
            self.get_forecast_daily_demand(
                inventory.category_id
            )
        )

        risk = calculate_waste_risk(
            days_to_expiry=days_to_expiry,
            current_stock=inventory.quantity,
            forecast_daily_demand=forecast_daily_demand,
            expiry_threshold_days=(
                inventory.expiry_threshold_days
            ),
        )

        days_of_cover = risk["days_of_cover"]

        if days_of_cover == float("inf"):
            days_of_cover = None
        else:
            days_of_cover = round(
                days_of_cover,
                2,
            )

        return {
            "inventory_id": inventory.id,
            "sku": inventory.sku,
            "name": inventory.name,
            "category_id": inventory.category_id,
            "quantity": inventory.quantity,
            "unit": inventory.unit,
            "batch_number": inventory.batch_number,
            "purchase_date": str(
                inventory.purchase_date
            ),
            "expiry_date": str(
                inventory.expiry_date
            ),
            "days_to_expiry": days_to_expiry,
            "forecast_daily_demand": round(
                forecast_daily_demand,
                2,
            ),
            "risk_score": risk["risk_score"],
            "risk_level": risk["risk_level"],
            "days_of_cover": days_of_cover,
        }


    # WASTE RISK FOR ALL INVENTORY
    

    def calculate_all_inventory_risk(self):

        inventory_items = (
            self.db.query(Inventory)
            .all()
        )

        results = []

        for inventory in inventory_items:

            try:

                result = self.calculate_inventory_risk(
                    inventory
                )

                results.append(result)

            except Exception as e:

                results.append({
                    "inventory_id": inventory.id,
                    "sku": inventory.sku,
                    "name": inventory.name,
                    "category_id": inventory.category_id,
                    "error": str(e),
                })

        return results

    # REORDER FOR ONE INVENTORY ITEM
    

    def calculate_inventory_reorder(
        self,
        inventory: Inventory,
        lead_time_days: int = 2,
        review_period_days: int = 7,
        safety_stock_days: float = 1.0,
        storage_capacity: float | None = None,
    ):

        forecast_daily_demand = (
            self.get_forecast_daily_demand(
                inventory.category_id
            )
        )

        days_to_expiry = self.calculate_days_to_expiry(
            inventory.expiry_date
        )

        recommended_quantity = calculate_reorder_quantity(
            current_stock=inventory.quantity,
            forecast_daily_demand=forecast_daily_demand,
            lead_time_days=lead_time_days,
            review_period_days=review_period_days,
            safety_stock_days=safety_stock_days,
            storage_capacity=storage_capacity,
            days_to_expiry=days_to_expiry,
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
            "recommended_purchase_quantity": (
                recommended_quantity
            ),
        }

    # REORDER FOR ALL INVENTORY

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

                result = (
                    self.calculate_inventory_reorder(
                        inventory=inventory,
                        lead_time_days=lead_time_days,
                        review_period_days=review_period_days,
                        safety_stock_days=safety_stock_days,
                    )
                )

                results.append(result)

            except Exception as e:

                results.append({
                    "inventory_id": inventory.id,
                    "sku": inventory.sku,
                    "name": inventory.name,
                    "category_id": inventory.category_id,
                    "error": str(e),
                })

        return results