import api from "./api";

import type {
  AIModel,
  ForecastResult,
  WeeklyForecastResult,
  WasteRisk,
  ReorderRecommendation,
  Prediction,
  BatchPredictionRun,
} from "../types/forecast";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function extractArray<T>(
  payload: unknown,
  wrapperKeys: string[] = []
): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;

    const keysToTry = [
      ...wrapperKeys,
      "data",
      "results",
      "items",
      "predictions",
      "inventory_risk",
      "inventory_reorder",
      "risks",
      "reorders",
      "high_risk",
    ];

    for (const key of keysToTry) {
      if (Array.isArray(record[key])) {
        return record[key] as T[];
      }
    }
  }

  console.warn("Expected array response but received:", payload);
  return [];
}

/**
 * Converts the different field names that may come from the backend
 * into the field names used by the frontend.
 */
function normalizePrediction(item: any): Prediction {
  return {
    inventory_id: Number(
      item.inventory_id ?? item.id ?? 0
    ),

    product_name:
      item.product_name ??
      item.name ??
      item.product ??
      `Inventory #${item.inventory_id ?? item.id ?? ""}`,

    sku: item.sku,

    predicted_demand: Number(
      item.predicted_demand ??
      item.forecast_daily_demand ??
      item.daily_demand ??
      0
    ),

    risk_score: Number(
      item.risk_score ?? 0
    ),

    risk_level:
      item.risk_level ??
      item.risk ??
      "LOW",

    forecast_date:
      item.forecast_date ??
      item.date ??
      new Date().toISOString(),

    recommended_purchase_quantity:
      item.recommended_purchase_quantity != null
        ? Number(item.recommended_purchase_quantity)
        : item.recommended_quantity != null
        ? Number(item.recommended_quantity)
        : undefined,

    model_name:
      item.model_name ??
      item.model ??
      undefined,

    // These are useful if your Prediction type supports them.
    // They are intentionally only included if the backend provides them.
    ...(item.category_id != null
      ? { category_id: Number(item.category_id) }
      : {}),

    ...(item.current_stock != null
      ? { current_stock: Number(item.current_stock) }
      : item.quantity != null
      ? { current_stock: Number(item.quantity) }
      : {}),

    ...(item.unit != null
      ? { unit: item.unit }
      : {}),
  };
}

function normalizeWasteRisk(item: any): WasteRisk {
  return {
    inventory_id: Number(
      item.inventory_id ?? item.id ?? 0
    ),

    product_name:
      item.product_name ??
      item.name ??
      item.product ??
      `Inventory #${item.inventory_id ?? item.id ?? ""}`,

    sku: item.sku,

    risk_score: Number(
      item.risk_score ?? 0
    ),

    risk_level:
      item.risk_level ??
      item.risk ??
      "LOW",

    days_to_expiry: Number(
      item.days_to_expiry ??
      item.days_remaining ??
      0
    ),

    current_stock: Number(
      item.current_stock ??
      item.quantity ??
      item.stock ??
      0
    ),

    predicted_demand:
      item.predicted_demand != null
        ? Number(item.predicted_demand)
        : item.forecast_daily_demand != null
        ? Number(item.forecast_daily_demand)
        : undefined,
  };
}

function normalizeReorder(
  item: any
): ReorderRecommendation {
  return {
    inventory_id: Number(
      item.inventory_id ?? item.id ?? 0
    ),

    product_name:
      item.product_name ??
      item.name ??
      item.product ??
      `Inventory #${item.inventory_id ?? item.id ?? ""}`,

    sku: item.sku,

    current_stock: Number(
      item.current_stock ??
      item.quantity ??
      item.stock ??
      0
    ),

    recommended_quantity: Number(
      item.recommended_quantity ??
      item.recommended_purchase_quantity ??
      0
    ),

    storage_capacity:
      item.storage_capacity != null
        ? Number(item.storage_capacity)
        : undefined,

    reason:
      item.reason ??
      item.recommendation_reason ??
      undefined,
  };
}

/* -------------------------------------------------------------------------- */
/* Model                                                                      */
/* -------------------------------------------------------------------------- */

export async function getSelectedModel(): Promise<AIModel> {
  const response = await api.get<AIModel>("/model");

  return response.data;
}

/* -------------------------------------------------------------------------- */
/* Forecast                                                                   */
/* -------------------------------------------------------------------------- */

export async function getForecast(
  inventoryId: number,
  days = 14
): Promise<ForecastResult> {
  const response = await api.post<ForecastResult>(
    "/forecast",
    {
      inventory_id: inventoryId,

      // IMPORTANT:
      // Backend expects "horizon", not "days".
      horizon: days,
    }
  );

  return response.data;
}

export async function getWeeklyForecast(
  inventoryId: number
): Promise<WeeklyForecastResult> {
  const response = await api.post<WeeklyForecastResult>(
    "/forecast/weekly",
    {
      inventory_id: inventoryId,
    }
  );

  return response.data;
}

/* -------------------------------------------------------------------------- */
/* On-demand scoring                                                          */
/* -------------------------------------------------------------------------- */

export async function scoreWasteRisk(
  inventoryId: number
): Promise<WasteRisk> {
  const response = await api.post(
    "/waste-risk",
    {
      inventory_id: inventoryId,
    }
  );

  return normalizeWasteRisk(response.data);
}

export async function getReorderSuggestion(
  inventoryId: number
): Promise<ReorderRecommendation> {
  const response = await api.post(
    "/reorder",
    {
      inventory_id: inventoryId,
    }
  );

  return normalizeReorder(response.data);
}

/* -------------------------------------------------------------------------- */
/* Tenant-scoped inventory risk                                               */
/* -------------------------------------------------------------------------- */

export async function getInventoryRisk(): Promise<WasteRisk[]> {
  const response = await api.get(
    "/inventory-risk"
  );

  return extractArray<any>(
    response.data,
    [
      "inventory_risk",
      "risks",
    ]
  ).map(normalizeWasteRisk);
}

export async function getInventoryRiskById(
  inventoryId: number
): Promise<WasteRisk> {
  const response = await api.get(
    `/inventory-risk/${inventoryId}`
  );

  return normalizeWasteRisk(response.data);
}

/* -------------------------------------------------------------------------- */
/* Tenant-scoped reorder                                                      */
/* -------------------------------------------------------------------------- */

export async function getInventoryReorder(): Promise<
  ReorderRecommendation[]
> {
  const response = await api.get(
    "/inventory-reorder"
  );

  return extractArray<any>(
    response.data,
    [
      "inventory_reorder",
      "reorders",
    ]
  ).map(normalizeReorder);
}

export async function getInventoryReorderById(
  inventoryId: number
): Promise<ReorderRecommendation> {
  const response = await api.get(
    `/inventory-reorder/${inventoryId}`
  );

  return normalizeReorder(response.data);
}

/* -------------------------------------------------------------------------- */
/* Batch prediction                                                           */
/* -------------------------------------------------------------------------- */

export async function runBatchPrediction(): Promise<BatchPredictionRun> {
  const response = await api.post<BatchPredictionRun>(
    "/batch-prediction"
  );

  return response.data;
}

/* -------------------------------------------------------------------------- */
/* Predictions                                                                */
/* -------------------------------------------------------------------------- */

export async function getPredictions(): Promise<Prediction[]> {
  const response = await api.get(
    "/predictions"
  );

  return extractArray<any>(
    response.data,
    [
      "predictions",
    ]
  ).map(normalizePrediction);
}

/* -------------------------------------------------------------------------- */
/* High risk predictions                                                      */
/* -------------------------------------------------------------------------- */

export async function getHighRiskPredictions(): Promise<Prediction[]> {
  const response = await api.get(
    "/predictions/high-risk"
  );

  return extractArray<any>(
    response.data,
    [
      "predictions",
      "high_risk",
    ]
  ).map(normalizePrediction);
}

/* -------------------------------------------------------------------------- */
/* Single prediction                                                          */
/* -------------------------------------------------------------------------- */

export async function getPredictionById(
  inventoryId: number
): Promise<Prediction> {
  const response = await api.get(
    `/predictions/${inventoryId}`
  );

  return normalizePrediction(response.data);
}