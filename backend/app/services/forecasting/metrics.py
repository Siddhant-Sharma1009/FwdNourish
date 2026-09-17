import numpy as np


def mae(actual, predicted) -> float:
    actual = np.asarray(actual, dtype=float)
    predicted = np.asarray(predicted, dtype=float)
    return float(np.mean(np.abs(actual - predicted)))


def rmse(actual, predicted) -> float:
    actual = np.asarray(actual, dtype=float)
    predicted = np.asarray(predicted, dtype=float)
    return float(np.sqrt(np.mean((actual - predicted) ** 2)))


def smape(actual, predicted) -> float:
    actual = np.asarray(actual, dtype=float)
    predicted = np.asarray(predicted, dtype=float)

    denominator = (np.abs(actual) + np.abs(predicted)) / 2.0
    mask = denominator > 0

    if not np.any(mask):
        return 0.0

    return float(
        np.mean(
            np.abs(actual[mask] - predicted[mask])
            / denominator[mask]
        ) * 100
    )


def evaluate(actual, predicted) -> dict:
    return {
        "MAE": mae(actual, predicted),
        "RMSE": rmse(actual, predicted),
        "sMAPE": smape(actual, predicted),
    }
