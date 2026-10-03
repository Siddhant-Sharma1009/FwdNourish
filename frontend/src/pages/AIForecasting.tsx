import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type {
  AIModel,
  Prediction,
  WasteRisk,
  ReorderRecommendation,
  BatchPredictionRun,
} from "../types/forecast";

import {
  getSelectedModel,
  getPredictions,
  getInventoryRisk,
  getInventoryReorder,
  getHighRiskPredictions,
  runBatchPrediction,
} from "../services/forecastApi";

import RiskBadge from "../components/forecast/RiskBadge";
import ItemForecastPanel from "../components/forecast/ItemForecastPanel";
import { useAuth } from "../context/AuthContext";

type TabKey =
  | "predictions"
  | "waste-risk"
  | "reorder"
  | "high-risk";

const TABS: { key: TabKey; label: string }[] = [
  {
    key: "predictions",
    label: "Predictions",
  },
  {
    key: "waste-risk",
    label: "Waste Risk",
  },
  {
    key: "reorder",
    label: "Reorder Suggestions",
  },
  {
    key: "high-risk",
    label: "High Risk",
  },
];

function AIForecasting() {
  const { user, loading: authLoading } = useAuth();

  const [model, setModel] = useState<AIModel | null>(null);

  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [wasteRisks, setWasteRisks] = useState<WasteRisk[]>([]);
  const [reorders, setReorders] = useState<
    ReorderRecommendation[]
  >([]);
  const [highRisk, setHighRisk] = useState<Prediction[]>([]);

  const [activeTab, setActiveTab] =
    useState<TabKey>("predictions");

  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("");

  const [selectedItem, setSelectedItem] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [batchRunning, setBatchRunning] = useState(false);
  const [batchStatus, setBatchStatus] =
    useState<BatchPredictionRun | null>(null);

  /* ---------------------------------------------------------------------- */
  /* Load data                                                               */
  /* ---------------------------------------------------------------------- */

  const loadData = useCallback(
    async (showLoading = true) => {
      if (showLoading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError("");

      try {
        const results = await Promise.allSettled([
          getSelectedModel(),
          getPredictions(),
          getInventoryRisk(),
          getInventoryReorder(),
          getHighRiskPredictions(),
        ]);

        const [
          modelRes,
          predictionsRes,
          riskRes,
          reorderRes,
          highRiskRes,
        ] = results;

        /* Model */

        if (modelRes.status === "fulfilled") {
          setModel(modelRes.value);
        }

        /* Predictions */

        if (predictionsRes.status === "fulfilled") {
          setPredictions(
            Array.isArray(predictionsRes.value)
              ? predictionsRes.value
              : []
          );
        }

        /* Waste Risk */

        if (riskRes.status === "fulfilled") {
          setWasteRisks(
            Array.isArray(riskRes.value)
              ? riskRes.value
              : []
          );
        }

        /* Reorders */

        if (reorderRes.status === "fulfilled") {
          setReorders(
            Array.isArray(reorderRes.value)
              ? reorderRes.value
              : []
          );
        }

        /* High Risk */

        if (highRiskRes.status === "fulfilled") {
          setHighRisk(
            Array.isArray(highRiskRes.value)
              ? highRiskRes.value
              : []
          );
        }

        const allFailed = results.every(
          (result) => result.status === "rejected"
        );

        if (allFailed) {
          setError(
            "Failed to load AI forecasting data."
          );
        }
      } catch (err) {
        console.error(
          "Failed to load forecasting data:",
          err
        );

        setError(
          "Failed to load AI forecasting data."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  /* ---------------------------------------------------------------------- */
  /* Initial load                                                            */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setLoading(false);
      return;
    }

    void loadData(true);
  }, [authLoading, user, loadData]);

  /* ---------------------------------------------------------------------- */
  /* Batch prediction                                                        */
  /* ---------------------------------------------------------------------- */

  async function handleRunBatchPrediction() {
    setBatchRunning(true);
    setError("");

    try {
      const result = await runBatchPrediction();

      setBatchStatus(result);

      /*
       * The batch job may need some time to create the
       * AIPrediction records.
       */
      await new Promise((resolve) =>
        setTimeout(resolve, 3000)
      );

      await loadData(false);
    } catch (err: any) {
      console.error(
        "Batch prediction failed:",
        err
      );

      setError(
        err?.response?.data?.detail ||
        err?.message ||
        "Failed to start batch prediction run."
      );
    } finally {
      setBatchRunning(false);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Filters                                                                 */
  /* ---------------------------------------------------------------------- */

  function clearFilters() {
    setSearch("");
    setRiskFilter("");
  }

  const normalizedSearch = search
    .trim()
    .toLowerCase();

  /* ---------------------------------------------------------------------- */
  /* Filtered Predictions                                                    */
  /* ---------------------------------------------------------------------- */

  const filteredPredictions = useMemo(() => {
    return predictions.filter((item) => {
      const matchesSearch =
        !normalizedSearch ||
        item.product_name
          .toLowerCase()
          .includes(normalizedSearch) ||
        item.sku
          ?.toLowerCase()
          .includes(normalizedSearch);

      const matchesRisk =
        !riskFilter ||
        item.risk_level === riskFilter;

      return matchesSearch && matchesRisk;
    });
  }, [
    predictions,
    normalizedSearch,
    riskFilter,
  ]);

  /* ---------------------------------------------------------------------- */
  /* Filtered Waste Risk                                                     */
  /* ---------------------------------------------------------------------- */

  const filteredWasteRisks = useMemo(() => {
    return wasteRisks.filter((item) => {
      const matchesSearch =
        !normalizedSearch ||
        item.product_name
          .toLowerCase()
          .includes(normalizedSearch) ||
        item.sku
          ?.toLowerCase()
          .includes(normalizedSearch);

      const matchesRisk =
        !riskFilter ||
        item.risk_level === riskFilter;

      return matchesSearch && matchesRisk;
    });
  }, [
    wasteRisks,
    normalizedSearch,
    riskFilter,
  ]);

  /* ---------------------------------------------------------------------- */
  /* Filtered Reorders                                                       */
  /* ---------------------------------------------------------------------- */

  const filteredReorders = useMemo(() => {
    return reorders.filter((item) => {
      return (
        !normalizedSearch ||
        item.product_name
          .toLowerCase()
          .includes(normalizedSearch) ||
        item.sku
          ?.toLowerCase()
          .includes(normalizedSearch)
      );
    });
  }, [reorders, normalizedSearch]);

  /* ---------------------------------------------------------------------- */
  /* High Risk                                                               */
  /* ---------------------------------------------------------------------- */

  const filteredHighRisk = useMemo(() => {
    return highRisk.filter((item) => {
      const matchesSearch =
        !normalizedSearch ||
        item.product_name
          .toLowerCase()
          .includes(normalizedSearch) ||
        item.sku
          ?.toLowerCase()
          .includes(normalizedSearch);

      const matchesRisk =
        !riskFilter ||
        item.risk_level === riskFilter;

      return matchesSearch && matchesRisk;
    });
  }, [
    highRisk,
    normalizedSearch,
    riskFilter,
  ]);

  /* ---------------------------------------------------------------------- */
  /* Waste risk lookup                                                       */
  /* ---------------------------------------------------------------------- */

  const wasteRiskByItemId = useMemo(() => {
    const map = new Map<number, WasteRisk>();

    wasteRisks.forEach((item) => {
      map.set(item.inventory_id, item);
    });

    return map;
  }, [wasteRisks]);

  /* ---------------------------------------------------------------------- */
  /* Summary cards                                                           */
  /* ---------------------------------------------------------------------- */

  const summaryCounts = useMemo(() => {
    const highRiskCount = predictions.filter(
      (item) =>
        item.risk_level === "HIGH" ||
        item.risk_level === "CRITICAL"
    ).length;

    const mediumRiskCount = predictions.filter(
      (item) =>
        item.risk_level === "MEDIUM"
    ).length;

    const totalRecommendedPurchase =
      predictions.reduce(
        (total, item) =>
          total +
          Number(
            item.recommended_purchase_quantity ?? 0
          ),
        0
      );

    return {
      total: predictions.length,
      highRisk: highRiskCount,
      mediumRisk: mediumRiskCount,
      totalRecommendedPurchase,
    };
  }, [predictions]);

  /* ---------------------------------------------------------------------- */
  /* Initial loading                                                         */
  /* ---------------------------------------------------------------------- */

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-100 p-6">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-green-600" />

          <p className="mt-4 text-sm font-medium text-slate-600">
            {authLoading
              ? "Loading account..."
              : "Loading AI forecasting..."}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Fetching predictions and inventory insights
          </p>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Not logged in                                                           */
  /* ---------------------------------------------------------------------- */

  if (!user) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-100 p-6">
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <h2 className="font-semibold text-slate-800">
            Please log in
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            You need to be logged in to view AI
            forecasting.
          </p>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Page                                                                     */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="min-h-full bg-slate-100 p-2 md:p-2">
      <div className="mx-auto max-w-7xl">

        <header className="px-1 pb-0 pt-3 sm:pt-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                AI{" "}
                <span className="bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
                  Forecasting
                </span>
              </h2>

              <p className="mt-1 max-w-xl text-sm text-slate-600 sm:text-base dark:text-slate-400">
                Demand predictions, waste risk scoring, and reorder guidance
              </p>
            </div>
            <button
              type="button"
              onClick={handleRunBatchPrediction}
              disabled={batchRunning}
              className="w-full rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {batchRunning ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-green-200 border-t-white" />
                  Running prediction...
                </span>
              ) : (
                "⚡ Run Batch Prediction"
              )}
            </button>

          </div>

          {/* Styled divider */}
          <div className="relative mb-4 mt-4 sm:mb-6 sm:mt-5">
            <div className="h-px w-full bg-gradient-to-r from-slate-300 via-slate-200 to-transparent dark:from-slate-600 dark:via-slate-700" />
            <div className="absolute left-0 top-0 h-[2px] w-16 -translate-y-1/2 rounded-full bg-gradient-to-r from-amber-500 to-orange-600" />
          </div>
        </header>


        {/* Error */}

        {error && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <span>{error}</span>

            <button
              type="button"
              onClick={() => loadData(true)}
              className="shrink-0 font-semibold underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Batch status */}

        {batchStatus && (
          <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
            <span className="font-semibold">
              Batch job {batchStatus.job_id}:
            </span>

            <span>{batchStatus.status}</span>

            {batchStatus.items_processed != null && (
              <span>
                · {batchStatus.items_processed} items
                processed
              </span>
            )}
          </div>
        )}

        {/* Summary cards */}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          {/* Items */}

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Items Analyzed
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-800">
              {summaryCounts.total}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              AI predictions generated
            </p>
          </div>

          {/* High Risk */}

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              High / Critical Risk
            </p>

            <p className="mt-2 text-2xl font-bold text-red-600">
              {summaryCounts.highRisk}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Items requiring attention
            </p>
          </div>

          {/* Medium Risk */}

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Medium Risk
            </p>

            <p className="mt-2 text-2xl font-bold text-orange-600">
              {summaryCounts.mediumRisk}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Items worth monitoring
            </p>
          </div>

          {/* Recommended Purchase */}

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Recommended Purchase
            </p>

            <p className="mt-2 text-2xl font-bold text-blue-600">
              {summaryCounts.totalRecommendedPurchase.toFixed(
                0
              )}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Total units recommended
            </p>
          </div>
        </div>

        {/* Model information */}

        <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Active AI Model
              </p>

              <p className="mt-1 text-lg font-bold text-slate-800">
                {model?.name ?? "Prophet"}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {model?.algorithm ?? "Prophet forecasting model"}

                {model?.version
                  ? ` · v${model.version}`
                  : ""}
              </p>
            </div>

            <div className="rounded-xl bg-green-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-green-600">
                Model Status
              </p>

              <p className="mt-1 font-semibold text-green-700">
                {model?.status ?? "ACTIVE"}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs + Controls */}

        <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm md:p-5">

          {/* Tabs */}

          <div className="flex flex-wrap gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition ${activeTab === tab.key
                    ? "bg-green-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                  }`}
              >
                {tab.label}
              </button>
            ))}

            {/* Refresh */}

            <button
              type="button"
              onClick={() => loadData(false)}
              disabled={refreshing}
              className="ml-auto rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {refreshing ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-green-600" />
                  Updating...
                </span>
              ) : (
                "↻ Refresh"
              )}
            </button>
          </div>

          {/* Search + filter */}

          <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 md:grid-cols-3">

            <div className="relative md:col-span-2">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                🔍
              </span>

              <input
                type="text"
                placeholder="Search product name or SKU..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-100"
              />
            </div>

            {activeTab !== "reorder" && (
              <select
                value={riskFilter}
                onChange={(e) =>
                  setRiskFilter(e.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-100"
              >
                <option value="">
                  All Risk Levels
                </option>

                <option value="LOW">Low</option>

                <option value="MEDIUM">
                  Medium
                </option>

                <option value="HIGH">High</option>

                <option value="CRITICAL">
                  Critical
                </option>
              </select>
            )}
          </div>

          {/* Active filters */}

          {(search || riskFilter) && (
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <span>Filters active</span>

              <button
                type="button"
                onClick={clearFilters}
                className="rounded-lg bg-slate-100 px-2.5 py-1.5 font-medium text-slate-600 hover:bg-slate-200"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>



        {activeTab === "predictions" && (
          <DataTable
            emptyIcon="📈"
            emptyTitle="No predictions found"
            emptyMessage={
              predictions.length === 0
                ? "Run a batch prediction to generate demand forecasts."
                : "Try changing your search or filters."
            }
            columns={[
              "Product",
              "SKU",
              "Current Stock",
              "Daily Demand",
              "Risk",
              "Recommended Purchase",
              "Forecast Date",
            ]}
            rows={filteredPredictions.map((item) => ({
              key: item.inventory_id,

              onClick: () =>
                setSelectedItem({
                  id: item.inventory_id,
                  name: item.product_name,
                }),

              cells: [
                <div>
                  <span className="font-medium text-slate-800">
                    {item.product_name}
                  </span>

                </div>,

                <span className="text-slate-500">
                  {item.sku ?? "—"}
                </span>,

                <span>
                  {wasteRiskByItemId.get(item.inventory_id)?.current_stock ?? 0} units
                </span>,

                <span>
                  {Number(
                    item.predicted_demand ?? 0
                  ).toFixed(1)}{" "}
                  units/day
                </span>,

                <RiskBadge
                  level={item.risk_level}
                />,

                <span className="font-semibold text-blue-600">
                  {Number(
                    item.recommended_purchase_quantity ??
                    0
                  ).toFixed(0)}{" "}
                  units
                </span>,

                <span className="text-slate-500">
                  {new Date(
                    item.forecast_date
                  ).toLocaleDateString()}
                </span>,
              ],
            }))}
          />
        )}



        {activeTab === "waste-risk" && (
          <DataTable
            emptyIcon="🗑️"
            emptyTitle="No waste risk data"
            emptyMessage="No items have been scored for waste risk yet."
            columns={[
              "Product",
              "SKU",
              "Risk Score",
              "Risk Level",
              "Days to Expiry",
              "Current Stock",
              "Predicted Demand",
            ]}
            rows={filteredWasteRisks.map((item) => ({
              key: item.inventory_id,

              onClick: () =>
                setSelectedItem({
                  id: item.inventory_id,
                  name: item.product_name,
                }),

              cells: [
                <span className="font-medium text-slate-800">
                  {item.product_name}
                </span>,

                <span className="text-slate-500">
                  {item.sku ?? "—"}
                </span>,

                <span className="font-semibold">
                  {Number(
                    item.risk_score ?? 0
                  ).toFixed(1)}
                  /100
                </span>,

                <RiskBadge
                  level={item.risk_level}
                />,

                <span
                  className={
                    item.days_to_expiry <= 2
                      ? "font-semibold text-red-600"
                      : item.days_to_expiry <= 5
                        ? "font-semibold text-orange-600"
                        : "text-slate-600"
                  }
                >
                  {item.days_to_expiry} days
                </span>,

                <span>
                  {item.current_stock} units
                </span>,

                <span>
                  {item.predicted_demand != null
                    ? `${Number(
                      item.predicted_demand
                    ).toFixed(1)} units/day`
                    : "—"}
                </span>,
              ],
            }))}
          />
        )}


        {activeTab === "reorder" && (
          <DataTable
            emptyIcon="📦"
            emptyTitle="No reorder suggestions"
            emptyMessage="All stock levels currently look sufficient."
            columns={[
              "Product",
              "SKU",
              "Current Stock",
              "Recommended Order",
              "Reason",
            ]}
            rows={filteredReorders.map((item) => ({
              key: item.inventory_id,

              onClick: () =>
                setSelectedItem({
                  id: item.inventory_id,
                  name: item.product_name,
                }),

              cells: [
                <span className="font-medium text-slate-800">
                  {item.product_name}
                </span>,

                <span className="text-slate-500">
                  {item.sku ?? "—"}
                </span>,

                <span>
                  {item.current_stock} units
                </span>,

                <span className="font-semibold text-blue-600">
                  {Number(
                    item.recommended_quantity ?? 0
                  ).toFixed(0)}{" "}
                  units
                </span>,

                <span className="text-slate-500">
                  {item.reason ?? "Based on forecasted demand"}
                </span>,
              ],
            }))}
          />
        )}


        {activeTab === "high-risk" && (
          <DataTable
            emptyIcon="🚨"
            emptyTitle="No high-risk items"
            emptyMessage="Nothing is currently flagged as high or critical waste risk."
            columns={[
              "Product",
              "SKU",
              "Current Stock",
              "Predicted Demand",
              "Risk",
              "Risk Score",
              "Forecast Date",
            ]}
            rows={filteredHighRisk.map((item) => ({
              key: item.inventory_id,

              onClick: () =>
                setSelectedItem({
                  id: item.inventory_id,
                  name: item.product_name,
                }),

              cells: [
                <span className="font-medium text-slate-800">
                  {item.product_name}
                </span>,

                <span className="text-slate-500">
                  {item.sku ?? "—"}
                </span>,

                <span>
                  {wasteRiskByItemId.get(item.inventory_id)?.current_stock ??
                    reorders.find(
                      (reorder) =>
                        reorder.inventory_id === item.inventory_id
                    )?.current_stock ??
                    0} units
                </span>,

                <span>
                  {Number(
                    item.predicted_demand ?? 0
                  ).toFixed(1)}{" "}
                  units/day
                </span>,

                <RiskBadge
                  level={item.risk_level}
                />,

                <span className="font-semibold text-red-600">
                  {Number(
                    item.risk_score ?? 0
                  ).toFixed(1)}
                  /100
                </span>,

                <span className="text-slate-500">
                  {new Date(
                    item.forecast_date
                  ).toLocaleDateString()}
                </span>,
              ],
            }))}
          />
        )}

      </div>



      {selectedItem && (
        <ItemForecastPanel
          inventoryId={selectedItem.id}
          productName={selectedItem.name}
          wasteRisk={wasteRiskByItemId.get(
            selectedItem.id
          )}
          onClose={() =>
            setSelectedItem(null)
          }
        />
      )}
    </div>
  );
}



interface DataTableRow {
  key: number | string;
  onClick?: () => void;
  cells: ReactNode[];
}

interface DataTableProps {
  columns: string[];
  rows: DataTableRow[];
  emptyIcon: string;
  emptyTitle: string;
  emptyMessage: string;
}

function DataTable({
  columns,
  rows,
  emptyIcon,
  emptyTitle,
  emptyMessage,
}: DataTableProps) {


  if (rows.length === 0) {
    return (
      <div className="rounded-2xl bg-white px-6 py-12 text-center shadow-sm">
        <div className="text-4xl">
          {emptyIcon}
        </div>

        <h3 className="mt-4 font-semibold text-slate-800">
          {emptyTitle}
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          {emptyMessage}
        </p>
      </div>
    );
  }


  return (
    <>
      {/* Desktop */}

      <div className="hidden overflow-hidden rounded-2xl bg-white shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left">
            <thead className="border-b bg-slate-50">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column}
                    className="whitespace-nowrap px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.key}
                  onClick={row.onClick}
                  className="cursor-pointer border-b last:border-b-0 transition hover:bg-slate-50"
                >
                  {row.cells.map(
                    (cell, index) => (
                      <td
                        key={index}
                        className="px-5 py-4 text-sm"
                      >
                        {cell}
                      </td>
                    )
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile */}

      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <button
            key={row.key}
            type="button"
            onClick={row.onClick}
            className="block w-full rounded-2xl bg-white p-4 text-left shadow-sm transition hover:shadow-md sm:p-5"
          >
            {/* Product + risk */}

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {row.cells[0]}
              </div>

              {row.cells.length > 4 && (
                <div className="shrink-0">
                  {row.cells[
                    row.cells.length >= 5
                      ? 4
                      : 2
                  ]}
                </div>
              )}
            </div>

            {/* Other fields */}

            <div className="mt-4 grid grid-cols-2 gap-3">
              {row.cells
                .slice(1)
                .map((cell, index) => {
                  if (
                    row.cells.length > 4 &&
                    index === 3
                  ) {
                    return null;
                  }

                  return (
                    <div
                      key={index}
                      className="min-w-0"
                    >
                      {cell}
                    </div>
                  );
                })}
            </div>

            <div className="mt-4 text-right text-xs font-medium text-green-600">
              View details →
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

export default AIForecasting;