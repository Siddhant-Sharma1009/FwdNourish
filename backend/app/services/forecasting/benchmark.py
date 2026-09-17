from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
import tensorflow as tf

from .config import (
    ARTIFACT_DIR,
    FORECAST_HORIZON,
    LSTM_DIR,
    LSTM_LOOKBACK,
    MIN_HISTORY_DAYS,
    PROPHET_DIR,
    RANDOM_SEED,
    REPORT_DIR,
)
from .data_loader import (
    get_common_categories,
    load_split,
)
from .lstm_model import (
    predict as lstm_predict,
    save as save_lstm,
    train as train_lstm,
)
from .metrics import evaluate
from .prophet_model import (
    predict as prophet_predict,
    save as save_prophet,
    train as train_prophet,
)


def _set_seed():
    np.random.seed(RANDOM_SEED)
    tf.random.set_seed(RANDOM_SEED)


def run(
    max_categories: int | None = 5,
):
    _set_seed()

    print("1/6 Loading FreshRetailNet-50K train split...")
    train_df = load_split("train")

    print("2/6 Loading FreshRetailNet-50K eval split...")
    eval_df = load_split("eval")

    categories = get_common_categories(
        train_df,
        eval_df,
        max_categories=max_categories,
    )

    if not categories:
        raise RuntimeError(
            "No common categories found between train and eval."
        )

    prophet_results = []
    lstm_results = []
    forecasts = []

    for category_id in categories:
       
        history = train_df[train_df["first_category_id"] == category_id].sort_values("dt").copy()
        actual = eval_df[eval_df["first_category_id"]== category_id].sort_values("dt").copy()

        if len(history) < MIN_HISTORY_DAYS:
            print(
                f"Skipping {category_id}: only {len(history)} history days."
            )
            continue

        if actual.empty:
            continue

        horizon = min(
            FORECAST_HORIZON,
            len(actual),
        )

        actual = actual.head(horizon)
        prophet = train_prophet(history)
        prophet_fc = prophet_predict( prophet,horizon,)

        prophet_eval = prophet_fc.merge(
            actual[["dt", "demand"]],
            left_on="ds",
            right_on="dt",
            how="inner",
        )

        if len(prophet_eval) != horizon:
            raise RuntimeError(
                f"Prophet date alignment failed "
                f"for category {category_id}."
            )

        prophet_metrics = evaluate(
            prophet_eval["demand"],
            prophet_eval["yhat"],
        )

        prophet_results.append(
            {
                "category_id": int(category_id),
                **prophet_metrics,
            }
        )

        save_prophet(
            prophet,
            PROPHET_DIR
            / f"category_{category_id}.pkl",
        )

        # ---------------- LSTM ----------------
        lstm, scaler = train_lstm(
            history=history,
            lookback=LSTM_LOOKBACK,
            horizon=horizon,
        )

        lstm_fc = lstm_predict(
            model=lstm,
            scaler=scaler,
            history=history,
            lookback=LSTM_LOOKBACK,
            horizon=horizon,
        )

        lstm_metrics = evaluate(
            actual["demand"].to_numpy(),
            lstm_fc,
        )

        lstm_results.append(
            {
                "category_id": int(category_id),
                **lstm_metrics,
            }
        )

        save_lstm(
            lstm,
            scaler,
            LSTM_DIR
            / f"category_{category_id}.keras",
            LSTM_DIR
            / f"category_{category_id}.joblib",
        )

        for index, actual_row in (
            actual.reset_index(drop=True).iterrows()
        ):
            forecasts.append(
                {
                    "category_id": int(category_id),
                    "date": actual_row["dt"].date().isoformat(),
                    "actual": float(
                        actual_row["demand"]
                    ),
                    "prophet": float(
                        prophet_fc.iloc[index]["yhat"]
                    ),
                    "lstm": float(
                        lstm_fc[index]
                    ),
                }
            )

    prophet_df = pd.DataFrame(prophet_results)
    lstm_df = pd.DataFrame(lstm_results)

    if prophet_df.empty or lstm_df.empty:
        raise RuntimeError(
            "A model produced no evaluation results."
        )

    comparison = pd.DataFrame(
        [
            {
                "model": "Prophet",
                "MAE": prophet_df["MAE"].mean(),
                "RMSE": prophet_df["RMSE"].mean(),
                "sMAPE": prophet_df["sMAPE"].mean(),
            },
            {
                "model": "LSTM",
                "MAE": lstm_df["MAE"].mean(),
                "RMSE": lstm_df["RMSE"].mean(),
                "sMAPE": lstm_df["sMAPE"].mean(),
            },
        ]
    )


    winner = (
        comparison
        .sort_values(
            ["sMAPE", "MAE", "RMSE"],
            ascending=True,
        )
        .iloc[0]
    )

    selected_model = {
        "selected_model": winner["model"],
        "selection_metric": "sMAPE",
        "direction": "lower_is_better",
        "metrics": {
            row["model"]: {
                "MAE": float(row["MAE"]),
                "RMSE": float(row["RMSE"]),
                "sMAPE": float(row["sMAPE"]),
            }
            for _, row in comparison.iterrows()
        },
    }

    comparison.to_csv(
        REPORT_DIR / "model_comparison.csv",
        index=False,
    )

    pd.DataFrame(forecasts).to_csv(
        REPORT_DIR / "forecast_comparison.csv",
        index=False,
    )

    (ARTIFACT_DIR / "selected_model.json").write_text(
        json.dumps(
            selected_model,
            indent=2,
        ),
        encoding="utf-8",
    )

    (REPORT_DIR / "metrics.json").write_text(
        json.dumps(
            {
                "prophet_by_category": prophet_results,
                "lstm_by_category": lstm_results,
                "summary": comparison.to_dict(
                    orient="records"
                ),
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    print("\n==============================")
    print("MODEL COMPARISON")
    print("==============================")
    print(comparison.to_string(
                index=False,
                float_format=lambda x: f"{x:.4f}",
            )   
    )
    print(
        f"\nSelected model: {winner['model']}"
    )
    print(
        f"Reports: {REPORT_DIR.resolve()}"
    )

    return selected_model
