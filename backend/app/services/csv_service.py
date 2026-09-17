import csv
import io
from datetime import date
from sqlalchemy.orm import Session
from app.models.category import Category
from app.models.inventory import Inventory
from app.models.tenant import Tenant


REQUIRED_COLUMNS = {
    "sku",
    "name",
    "category_id",
    "quantity",
    "unit",
    "batch_number",
    "purchase_date",
    "expiry_date",
    "expiry_threshold_days",
}


def process_inventory_csv(
    file_content: bytes,
    tenant_id: int,
    db: Session
):
    tenant = db.query(Tenant).filter(
        Tenant.id == tenant_id
    ).first()

    if not tenant:
        return {
            "success": False,
            "message": "Tenant not found",
            "inserted": 0,
            "errors": []
        }

    try:
        text = file_content.decode("utf-8-sig")
    except UnicodeDecodeError:
        return {
            "success": False,
            "message": "CSV file must use UTF-8 encoding",
            "inserted": 0,
            "errors": []
        }

    reader = csv.DictReader(
        io.StringIO(text)
    )

    if not reader.fieldnames:
        return {
            "success": False,
            "message": "CSV file is empty",
            "inserted": 0,
            "errors": []
        }

    columns = set(
        column.strip()
        for column in reader.fieldnames
        if column
    )

    missing_columns = (
        REQUIRED_COLUMNS - columns
    )

    if missing_columns:
        return {
            "success": False,
            "message": "Missing required CSV columns",
            "inserted": 0,
            "errors": [
                {
                    "row": 1,
                    "error": f"Missing columns: "
                             f"{', '.join(sorted(missing_columns))}"
                }
            ]
        }

    inserted = 0
    errors = []

    for row_number, row in enumerate(
        reader,
        start=2
    ):

        try:
            sku = row["sku"].strip()
            name = row["name"].strip()
            category_id = int(row["category_id"])
            quantity = float(row["quantity"])
            unit = row["unit"].strip()

            batch_number = (
                row["batch_number"].strip()
                or None
            )

            purchase_date = date.fromisoformat(
                row["purchase_date"].strip()
            )

            expiry_date = date.fromisoformat(
                row["expiry_date"].strip()
            )

            expiry_threshold_days = int(
                row["expiry_threshold_days"]
            )

            if not sku:
                raise ValueError(
                    "SKU cannot be empty"
                )

            if not name:
                raise ValueError(
                    "Product name cannot be empty"
                )

            if quantity <= 0:
                raise ValueError(
                    "Quantity must be greater than 0"
                )

            if expiry_threshold_days < 0:
                raise ValueError(
                    "Expiry threshold cannot be negative"
                )

            if expiry_date < purchase_date:
                raise ValueError(
                    "Expiry date cannot be before purchase date"
                )

            # Check category
            category = db.query(Category).filter(
                Category.id == category_id
            ).first()

            if not category:
                raise ValueError(
                    f"Category {category_id} does not exist"
                )
            
            existing = db.query(Inventory).filter(
                Inventory.tenant_id == tenant_id,
                Inventory.sku == sku
            ).first()

            if existing:
                raise ValueError(
                    f"SKU '{sku}' already exists"
                )

            inventory = Inventory(
                tenant_id=tenant_id,
                sku=sku,
                name=name,
                category_id=category_id,
                quantity=quantity,
                unit=unit,
                batch_number=batch_number,
                purchase_date=purchase_date,
                expiry_date=expiry_date,
                expiry_threshold_days=expiry_threshold_days
            )

            db.add(inventory)

            inserted += 1

        except Exception as error:

            errors.append({
                "row": row_number,
                "sku": row.get("sku"),
                "error": str(error)
            })

    db.commit()

    return {
        "success": True,
        "message": "CSV processed successfully",
        "inserted": inserted,
        "failed": len(errors),
        "errors": errors
    }