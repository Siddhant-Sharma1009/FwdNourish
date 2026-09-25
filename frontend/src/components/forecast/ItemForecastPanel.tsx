import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import type {
  ForecastResult,
  WeeklyForecastResult,
  ReorderRecommendation,
  WasteRisk,
} from "../../types/forecast";
import {
  getForecast,
  getWeeklyForecast,
  getReorderSuggestion,
} from "../../services/forecastApi";
import RiskBadge from "./RiskBadge";

interface Props {
  inventoryId: number;
  productName: string;
  wasteRisk?: WasteRisk;
  onClose: () => void;
}

function ItemForecastPanel({
  inventoryId,
  productName,
  wasteRisk,
  onClose,
}: Props) {
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [weekly, setWeekly] = useState<WeeklyForecastResult | null>(null);
  const [reorder, setReorder] = useState<ReorderRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.allSettled([
      getForecast(inventoryId, 14),
      getWeeklyForecast(inventoryId),
      getReorderSuggestion(inventoryId),
    ]).then(([forecastRes, weeklyRes, reorderRes]) => {
      if (cancelled) return;

      if (forecastRes.status === "fulfilled") setForecast(forecastRes.value);
      if (weeklyRes.status === "fulfilled") setWeekly(weeklyRes.value);
      if (reorderRes.status === "fulfilled") setReorder(reorderRes.value);

      if (
        forecastRes.status === "rejected" &&
        weeklyRes.status === "rejected" &&
        reorderRes.status === "rejected"
      ) {
        setError("Failed to load forecast data for this item.");
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [inventoryId]);

  const dailyChartData =
    forecast?.forecast.map((point) => ({
      date: point.date,
      demand: point.predicted_demand,
      lower: point.lower_bound ?? point.predicted_demand,
      upper: point.upper_bound ?? point.predicted_demand,
    })) ?? [];

  const weeklyChartData =
    weekly?.weekly_forecast.map((point) => ({
      week: point.week_start,
      demand: point.predicted_demand,
    })) ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-6">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{productName}</h2>
            <p className="mt-1 text-xs text-slate-500">
              Inventory ID: {inventoryId}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6 px-6 py-6">
          {wasteRisk && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-4">
              <RiskBadge level={wasteRisk.risk_level} />
              <span className="text-sm text-slate-600">
                Risk score{" "}
                <strong className="text-slate-800">
                  {wasteRisk.risk_score}
                </strong>
              </span>
              <span className="text-sm text-slate-600">
                {wasteRisk.days_to_expiry} days to expiry
              </span>
              <span className="text-sm text-slate-600">
                {wasteRisk.current_stock} units in stock
              </span>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-green-600" />
            </div>
          )}

          {error && !loading && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && dailyChartData.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-800">
                14-Day Demand Forecast
              </h3>
              <div className="mt-3 h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={dailyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      stroke="#94a3b8"
                    />
                    <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #e2e8f0",
                        fontSize: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="upper"
                      stroke="none"
                      fill="#bbf7d0"
                      fillOpacity={0.5}
                    />
                    <Area
                      type="monotone"
                      dataKey="lower"
                      stroke="none"
                      fill="#ffffff"
                      fillOpacity={1}
                    />
                    <Line
                      type="monotone"
                      dataKey="demand"
                      stroke="#16a34a"
                      strokeWidth={2}
                      dot={false}
                      name="Predicted demand"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Shaded band shows the model&apos;s upper/lower confidence
                range around the predicted line.
              </p>
            </div>
          )}

          {!loading && weeklyChartData.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-800">
                Weekly Demand Outlook
              </h3>
              <div className="mt-3 h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="week"
                      tick={{ fontSize: 11 }}
                      stroke="#94a3b8"
                    />
                    <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #e2e8f0",
                        fontSize: 12,
                      }}
                    />
                    <Bar
                      dataKey="demand"
                      fill="#3b82f6"
                      radius={[6, 6, 0, 0]}
                      name="Predicted demand"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {!loading && !dailyChartData.length && !weeklyChartData.length && (
            <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
              No forecast data available for this item yet.
            </div>
          )}

          {!loading && reorder && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <h3 className="text-sm font-semibold text-blue-900">
                Reorder Recommendation
              </h3>
              <p className="mt-2 text-2xl font-bold text-blue-900">
                {reorder.recommended_quantity} units
              </p>
              {reorder.reason && (
                <p className="mt-1 text-sm text-blue-700">{reorder.reason}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-blue-700">
                <span>Current stock: {reorder.current_stock}</span>
                {reorder.storage_capacity != null && (
                  <span>Storage capacity: {reorder.storage_capacity}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ItemForecastPanel;