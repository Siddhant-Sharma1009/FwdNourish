import api from "./api";

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


// Get all AI predictions
export async function getAIPredictions(): Promise<AIPrediction[]> {
  const response = await api.get<AIPrediction[]>(
    "/predictions"
  );

  return response.data;
}


// Get high-risk predictions
export async function getHighRiskPredictions(): Promise<AIPrediction[]> {
  const response = await api.get<AIPrediction[]>(
    "/ai/predictions/high-risk"
  );

  return response.data;
}


// Get prediction for one inventory item
export async function getInventoryPrediction(
  inventoryId: number
): Promise<AIPrediction> {
  const response = await api.get<AIPrediction>(
    `/ai/predictions/${inventoryId}`
  );

  return response.data;
}