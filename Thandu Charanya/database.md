# FoodBridge AI - Database Architecture

Database Engine: PostgreSQL (`foodbridge_ai`)

## Entity Relationship Schema

- **`businesses`**: Tenant organizations (`id`, `name`, `organization_type`, `location`, `email`, `phone`, `created_at`).
- **`users`**: User accounts (`id`, `business_id`, `name`, `email`, `password_hash`, `role`, `is_active`, `created_at`).
- **`food_categories`**: Product classifications (`id`, `name`, `perishability_level`, `default_shelf_life_days`, `storage_type`, `created_at`).
- **`inventory`**: Product stock records (`id`, `business_id`, `product_name`, `category_id`, `sku`, `quantity`, `unit`, `purchase_date`, `expiry_date`, `storage_capacity`, `unit_price`, `supplier`, `created_at`, `updated_at`).
- **`sales_history`**: Historical sales logs (`id`, `business_id`, `product_id`, `store_id`, `sale_date`, `quantity_sold`, `discount`, `holiday_flag`, `activity_flag`, `created_at`).
- **`forecast_predictions`**: Prophet AI outputs (`id`, `business_id`, `product_id`, `forecast_date`, `predicted_demand`, `lower_bound`, `upper_bound`, `model_name`, `created_at`).
- **`waste_risk_scores`**: Calculated risk scores (`id`, `business_id`, `product_id`, `risk_score`, `risk_level`, `current_stock`, `days_to_expiry`, `forecast_demand`, `reason`, `created_at`).
- **`reorder_recommendations`**: Recommended order volumes (`id`, `business_id`, `product_id`, `current_stock`, `forecast_demand`, `safety_stock`, `storage_capacity`, `recommended_quantity`, `reason`, `created_at`).
- **`donations`**: Surplus food donation listings (`id`, `business_id`, `product_id`, `quantity`, `status`, `ngo_name`, `pickup_date`, `pickup_location`, `created_at`).
