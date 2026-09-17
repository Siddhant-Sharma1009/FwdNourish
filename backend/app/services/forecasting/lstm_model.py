from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import tensorflow as tf
from sklearn.preprocessing import MinMaxScaler

from .config import LSTM_BATCH_SIZE, LSTM_EPOCHS, LSTM_PATIENCE


def _features(scaled_demand: np.ndarray, dates: pd.DatetimeIndex):
    day_of_week = dates.dayofweek.to_numpy()

    return np.column_stack(
        [
            scaled_demand,
            np.sin(2 * np.pi * day_of_week / 7.0),
            np.cos(2 * np.pi * day_of_week / 7.0),
        ]
    ).astype(np.float32)


def make_sequences(
    history: pd.DataFrame,
    lookback: int,
    horizon: int,
):
    history = history.sort_values("dt").copy()

    demand = history["demand"].to_numpy(dtype=np.float32)
    dates = pd.DatetimeIndex(history["dt"])

    scaler = MinMaxScaler()
    scaled = scaler.fit_transform(
        demand.reshape(-1, 1)
    ).reshape(-1)

    features = _features(scaled, dates)

    X, y = [], []

    for end in range(
        lookback,
        len(history) - horizon + 1,
    ):
        start = end - lookback

        X.append(features[start:end])
        y.append(scaled[end:end + horizon])

    if not X:
        raise ValueError(
            "Not enough observations to build LSTM sequences."
        )

    return (
        np.asarray(X, dtype=np.float32),
        np.asarray(y, dtype=np.float32),
        scaler,
    )


def build_model(
    lookback: int,
    feature_count: int,
    horizon: int,
):
    model = tf.keras.Sequential(
        [
            tf.keras.layers.Input(
                shape=(lookback, feature_count)
            ),
            tf.keras.layers.LSTM(
                64,
                return_sequences=True,
            ),
            tf.keras.layers.Dropout(0.20),
            tf.keras.layers.LSTM(32),
            tf.keras.layers.Dense(
                32,
                activation="relu",
            ),
            tf.keras.layers.Dense(horizon),
        ]
    )

    model.compile(
        optimizer=tf.keras.optimizers.Adam(
            learning_rate=0.001
        ),
        loss="mse",
        metrics=["mae"],
    )

    return model


def train(
    history: pd.DataFrame,
    lookback: int,
    horizon: int,
):
    X, y, scaler = make_sequences(
        history,
        lookback,
        horizon,
    )

    model = build_model(
        lookback=lookback,
        feature_count=X.shape[-1],
        horizon=horizon,
    )

    early_stopping = tf.keras.callbacks.EarlyStopping(
        monitor="val_loss",
        patience=LSTM_PATIENCE,
        restore_best_weights=True,
    )

    model.fit(
        X,
        y,
        validation_split=0.15,
        epochs=LSTM_EPOCHS,
        batch_size=LSTM_BATCH_SIZE,
        callbacks=[early_stopping],
        verbose=0,
    )

    return model, scaler


def predict(
    model,
    scaler,
    history: pd.DataFrame,
    lookback: int,
    horizon: int,
):
    history = history.sort_values("dt").copy()

    demand = history["demand"].to_numpy(dtype=np.float32)
    dates = pd.DatetimeIndex(history["dt"])

    if len(demand) < lookback:
        raise ValueError(
            "Not enough history for LSTM prediction."
        )

    scaled = scaler.transform(
        demand.reshape(-1, 1)
    ).reshape(-1)

    window_values = scaled[-lookback:]
    window_dates = dates[-lookback:]

    features = _features(
        window_values,
        window_dates,
    )

    prediction_scaled = model.predict(
        features[np.newaxis, ...],
        verbose=0,
    )[0]

    prediction = scaler.inverse_transform(
        prediction_scaled.reshape(-1, 1)
    ).reshape(-1)

    return np.maximum(prediction, 0.0)


def save(
    model,
    scaler,
    model_path: Path,
    scaler_path: Path,
):
    model_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    model.save(model_path)
    joblib.dump(scaler, scaler_path)


def load(model_path: Path, scaler_path: Path):
    model = tf.keras.models.load_model(
        model_path
    )
    scaler = joblib.load(scaler_path)

    return model, scaler
