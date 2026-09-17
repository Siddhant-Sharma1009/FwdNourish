from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile
)

from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.csv_service import (
    process_inventory_csv
)


router = APIRouter(
    prefix="/api/v1/inventory",
    tags=["CSV Upload"]
)


@router.post("/upload-csv")
async def upload_inventory_csv(
    tenant_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file selected"
        )

    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Only CSV files are allowed"
        )

    content = await file.read()

    if not content:
        raise HTTPException(
            status_code=400,
            detail="CSV file is empty"
        )

    result = process_inventory_csv(
        file_content=content,
        tenant_id=tenant_id,
        db=db
    )

    if not result["success"]:
        raise HTTPException(
            status_code=400,
            detail=result["message"]
        )

    return result