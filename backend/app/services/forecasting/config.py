from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[3]
ARTIFACT_DIR = PROJECT_ROOT / "artifacts" / "forecasting"

DATASET_ID = "Dingdong-Inc/FreshRetailNet-50K"

FORECAST_HORIZON = 7
LSTM_LOOKBACK = 14
MIN_HISTORY_DAYS = 30
LSTM_EPOCHS = 40
LSTM_BATCH_SIZE = 32
LSTM_PATIENCE = 6
RANDOM_SEED = 42

PROPHET_DIR = ARTIFACT_DIR / "prophet"
LSTM_DIR = ARTIFACT_DIR / "lstm"
REPORT_DIR = ARTIFACT_DIR / "reports"

for directory in (ARTIFACT_DIR, PROPHET_DIR, LSTM_DIR, REPORT_DIR):
    directory.mkdir(parents=True, exist_ok=True)
