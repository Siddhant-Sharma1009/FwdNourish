from __future__ import annotations

from datetime import date, timedelta
from pathlib import Path

import pandas as pd

from .data_loader import load_split
from .prophet_model import load, predict


class ForecastService:

    def __init__(self):
        self.model_dir = (
            Path(__file__).resolve().parents[3]
            / "artifacts"
            / "forecasting"
            / "prophet"
        )

        self.train_data = None
        self.models = {}

    def load_training_data(self):

        if self.train_data is None:
            self.train_data = load_split("train")

        return self.train_data

    def load_model(self, category_id: int):
 
        category_id = int(category_id)

        if category_id not in self.models:

            model_path = (
                self.model_dir
                / f"category_{category_id}.pkl"
            )

            if not model_path.exists():
                raise FileNotFoundError(
                    f"No Prophet model found for "
                    f"category {category_id}."
                )

            self.models[category_id] = load(
                model_path
            )

        return self.models[category_id]

    def forecast_category(
        self,
        category_id: int,
        horizon: int = 7,
    ):


        model = self.load_model(category_id)

        forecast = predict(
            model,
            horizon,
        )

        forecast["category_id"] = int(
            category_id
        )

        forecast["forecast_date"] = (
            forecast["ds"].dt.date
        )

        forecast["predicted_demand"] = (
            forecast["yhat"]
            .clip(lower=0)
        )

        return forecast[
            [
                "category_id",
                "forecast_date",
                "predicted_demand",
                "yhat_lower",
                "yhat_upper",
            ]
        ]

    def get_daily_demand(
        self,
        category_id: int,
        horizon: int = 7,
    ):


        forecast = self.forecast_category(
            category_id=category_id,
            horizon=horizon,
        )

        return forecast[
            [
                "forecast_date",
                "predicted_demand",
            ]
        ]

    def get_weekly_demand(
        self,
        category_id: int,
    ):
     
        forecast = self.forecast_category(
            category_id=category_id,
            horizon=7,
        )

        total_demand = float(
            forecast["predicted_demand"].sum()
        )

        return {
            "category_id": int(category_id),
            "forecast_days": 7,
            "predicted_weekly_demand": round(
                total_demand,
                2,
            ),
            "daily_forecast": [
                {
                    "date": str(row["forecast_date"]),
                    "demand": round(
                        float(
                            row["predicted_demand"]
                        ),
                        2,
                    ),
                }
                for _, row in forecast.iterrows()
            ],
        }


forecast_service = ForecastService()