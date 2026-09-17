import argparse
from pathlib import Path
import sys

BACKEND_DIR = Path(__file__).resolve().parents[2]

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


from app.services.forecasting.benchmark import run


def main():
    parser = argparse.ArgumentParser(
        description=(
            "Train Prophet and LSTM on "
            "FreshRetailNet-50K and compare them."
        )
    )

    parser.add_argument("--max-categories",type=int, default=5,)

    args = parser.parse_args()

    max_categories = (
        None
        if args.max_categories == 0
        else args.max_categories
    )

    run(max_categories=max_categories)


if __name__ == "__main__":
    main()