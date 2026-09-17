from pathlib import Path
import sys

BACKEND_DIR = Path(__file__).resolve().parents[2]

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.database import Base, engine

from app.models.inventory import Inventory
from app.models.category import Category
from app.models.ai_prediction import AIPrediction


def main():

    print("Creating missing database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database table creation completed.")


if __name__ == "__main__":
    main()