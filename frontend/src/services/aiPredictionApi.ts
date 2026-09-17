export interface AIPrediction {
  id: number;
  inventory_id: number;
  forecast_date: string;
  forecast_daily_demand: number;
  risk_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  recommended_purchase_quantity: number;
  model_name: string;
  created_at?: string | null;
}

const API_BASE_URL = "http://127.0.0.1:8000";

export async function getAIPredictions(): Promise<AIPrediction[]> {
  const response = await fetch(
    `${API_BASE_URL}/ai/predictions`
  );

  if (!response.ok) {
    throw new Error("Failed to load AI predictions.");
  }

  return response.json();
}

export async function getHighRiskPredictions(): Promise<AIPrediction[]> {
  const response = await fetch(
    `${API_BASE_URL}/ai/predictions/high-risk`
  );

  if (!response.ok) {
    throw new Error("Failed to load high-risk predictions.");
  }

  return response.json();
}

export async function getInventoryPrediction(
  inventoryId: number
): Promise<AIPrediction> {
  const response = await fetch(
    `${API_BASE_URL}/ai/predictions/${inventoryId}`
  );

  if (!response.ok) {
    throw new Error("Failed to load inventory prediction.");
  }

  return response.json();
}