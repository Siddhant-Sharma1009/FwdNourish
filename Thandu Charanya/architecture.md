# FoodBridge AI - System Architecture

```mermaid
graph TD
    A[FreshRetailNet-50K Dataset] --> B[Data Preprocessing Pipeline]
    B --> C[Prophet Demand Forecasting Engine]
    C --> D[(PostgreSQL Database)]
    E[Current Inventory & Expiry Dates] --> D
    D --> F[Waste Risk Engine]
    D --> G[Smart Reorder Engine]
    F --> H[Surplus Identification]
    H --> I[NGO Food Donation Workflow]
    F --> J[React + Vite Dashboard]
    G --> J
    C --> J
```

## AI Pipeline Flow

1. **Historical Sales Ingestion**: Cleaned daily time series mapped to `ds` and `y`.
2. **Prophet Model**: Trains per product time series to forecast future demand horizons (7, 14, 30 days).
3. **Waste Risk Calculation**: Evaluates Surplus Stock Ratio vs Expiry Urgency Factor to compute a 0-100 score and risk level (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
4. **Smart Reorder Calculation**: $\text{Recommended Quantity} = \max(0, \text{Forecast} + \text{Safety Stock} - \text{Stock})$ bounded by storage capacity limits.
5. **Redistribution**: High/Critical risk surplus inventory mapped to donation listings for NGO pickup.
