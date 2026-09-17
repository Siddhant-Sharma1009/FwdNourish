def calculate_waste_risk(
    days_to_expiry: float,
    current_stock: float,
    forecast_daily_demand: float,
    expiry_threshold_days: int = 3,
):

    days = float(days_to_expiry)
    stock = max(float(current_stock), 0.0)
    demand = max(float(forecast_daily_demand), 0.0)

    if days <= 0:
        expiry_score = 40.0
    elif days <= expiry_threshold_days:
        expiry_score = (40.0* (1.0 - days / max(expiry_threshold_days, 1))
        )
    else:
        expiry_score = 0.0

    if demand == 0:
        days_of_cover = float("inf") if stock > 0 else 0.0
        excess_score = 40.0 if stock > 0 else 0.0
        coverage_score = 20.0 if stock > 0 else 0.0
    else:
        days_of_cover = stock / demand

        excess_score = min(
            40.0,
            max(0.0,(days_of_cover - 7.0)/ 7.0* 40.0,),
        )

        coverage_score = min(
            20.0,
            days_of_cover / 7.0 * 20.0,
        )

    score = min(
        100.0,
        expiry_score
        + excess_score
        + coverage_score,
    )

    if score >= 70:
        level = "HIGH"
    elif score >= 40:
        level = "MEDIUM"
    else:
        level = "LOW"

    return {
        "risk_score": round(score, 2),
        "risk_level": level,
        "days_to_expiry": days,
        "current_stock": stock,
        "forecast_daily_demand": demand,
        "days_of_cover": days_of_cover,
    }


def calculate_reorder_quantity(
    current_stock: float,
    forecast_daily_demand: float,
    lead_time_days: int = 2,
    review_period_days: int = 7,
    safety_stock_days: float = 1.0,
    storage_capacity: float | None = None,
    days_to_expiry: float | None = None,
):


    demand = max(float(forecast_daily_demand), 0.0)
    stock = max(float(current_stock), 0.0)

    lead_time = max(int(lead_time_days), 0)
    review_period = max(int(review_period_days), 0)
    safety_days = max(float(safety_stock_days), 0.0)


    if demand <= 0:
        return 0.0

    # ---------------------------------------------------------
    # Calculate normal target stock
    # ---------------------------------------------------------

    target_days = (
        lead_time
        + review_period
        + safety_days
    )

    target_stock = demand * target_days

    # ---------------------------------------------------------
    # Expiry-aware protection
    # ---------------------------------------------------------

    if days_to_expiry is not None:

        expiry_days = float(days_to_expiry)

    
        if expiry_days <= 0:
            return 0.0

        demand_until_expiry = demand * expiry_days

        if stock >= demand_until_expiry:
            return 0.0

        if expiry_days < target_days:
            target_stock = demand_until_expiry


    # 3. Calculate basic reorder quantity

    quantity = max(
        0.0,
        target_stock - stock,
    )

    # ---------------------------------------------------------
    # 4. Respect storage capacity
    # ---------------------------------------------------------

    if storage_capacity is not None:

        capacity = max(
            float(storage_capacity),
            0.0,
        )

        available_space = max(
            0.0,
            capacity - stock,
        )

        quantity = min(
            quantity,
            available_space,
        )

    return round(quantity, 2)
