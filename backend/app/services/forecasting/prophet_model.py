from pathlib import Path
import pickle

import pandas as pd
from prophet import Prophet


def train(history: pd.DataFrame):
    prophet_df = history[["dt", "demand"]].rename(
        columns={"dt": "ds", "demand": "y"}
    )

    model = Prophet(
        yearly_seasonality=False,
        weekly_seasonality=True,
        daily_seasonality=False,
        seasonality_mode="multiplicative",
        interval_width=0.80,
    )

    model.fit(prophet_df)
    return model


def predict(model, horizon: int) -> pd.DataFrame:
    future = model.make_future_dataframe(
        periods=horizon,
        freq="D",
    )

    forecast = model.predict(future)

    return (
        forecast[
            ["ds", "yhat", "yhat_lower", "yhat_upper"]
        ]
        .tail(horizon)
        .reset_index(drop=True)
    )


def save(model, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("wb") as file:
        pickle.dump(model, file)


def load(path: Path):
    with path.open("rb") as file:
        return pickle.load(file)
