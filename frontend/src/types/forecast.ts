export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface AIModel {
  name: string;
  version: string;
  algorithm: string;
  status: "ACTIVE" | "TRAINING" | "INACTIVE";
  last_trained_at?: string | null;
  accuracy?: number;
}

export interface ForecastPoint {
  date: string;
  predicted_demand: number;
  lower_bound?: number;
  upper_bound?: number;
}

export interface ForecastResult {
  inventory_id: number;
  product_name: string;
  forecast: ForecastPoint[];
}

export interface WeeklyForecastPoint {
  week_start: string;
  predicted_demand: number;
}

export interface WeeklyForecastResult {
  inventory_id: number;
  product_name: string;
  weekly_forecast: WeeklyForecastPoint[];
}

export interface WasteRisk {
  inventory_id: number;
  product_name: string;
  sku?: string;
  risk_score: number;
  risk_level: RiskLevel;
  days_to_expiry: number;
  current_stock: number;
  predicted_demand?: number;
}

export interface ReorderRecommendation {
  inventory_id: number;
  product_name: string;
  sku?: string;
  current_stock: number;
  recommended_quantity: number;
  storage_capacity?: number;
  reason?: string;
}

export interface Prediction {
  inventory_id: number;
  product_name: string;
  sku?: string;
  predicted_demand: number;
  risk_score: number;
  risk_level: RiskLevel;
  forecast_date: string;
  recommended_purchase_quantity?: number;
  model_name?: string;
}

export interface BatchPredictionRun {
  job_id: string;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
  started_at?: string;
  items_processed?: number;
}