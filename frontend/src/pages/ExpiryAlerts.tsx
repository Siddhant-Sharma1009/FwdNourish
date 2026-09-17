import { useEffect, useMemo, useState } from "react";

import type { ExpiryStatus } from "../types/expiry";
import { getExpiryAlerts } from "../services/expiryApi";
import ExpiryBadge from "../components/inventory/ExpiryBadge";

function ExpiryAlerts() {
  const tenantId = 1;

  const [alerts, setAlerts] = useState<ExpiryStatus[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("URGENT");

  useEffect(() => {
    async function loadAlerts() {
      try {
        const data = await getExpiryAlerts(tenantId);
        setAlerts(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    loadAlerts();
  }, []);

  // ================= FILTER + SORT =================

  const filteredAlerts = useMemo(() => {
    const filtered = alerts.filter((item) => {
      const searchValue = search.toLowerCase().trim();

      const matchesSearch =
        !searchValue ||
        item.name.toLowerCase().includes(searchValue) ||
        item.sku.toLowerCase().includes(searchValue);

      const matchesStatus =
        statusFilter === "ALL" ||
        item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "URGENT") {
        return a.days_remaining - b.days_remaining;
      }

      if (sortBy === "LATEST") {
        return b.days_remaining - a.days_remaining;
      }

      if (sortBy === "QUANTITY") {
        return b.quantity - a.quantity;
      }

      return 0;
    });
  }, [alerts, search, statusFilter, sortBy]);


  // ================= SUMMARY =================

  const expiredCount = alerts.filter(
    (item) => item.days_remaining < 0
  ).length;

  const criticalCount = alerts.filter(
    (item) =>
      item.days_remaining >= 0 &&
      item.days_remaining <= 3
  ).length;

  const warningCount = alerts.filter(
    (item) => item.days_remaining > 3
  ).length;


  // ================= LOADING =================

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
        <div className="mx-auto w-full max-w-6xl">

          <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="text-center">

              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600" />

              <p className="mt-3 text-sm font-medium text-slate-600">
                Loading expiry alerts...
              </p>

            </div>

          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">

      <div className="mx-auto w-full max-w-6xl">

        {/* ================= HEADER ================= */}

        <div className="mb-6">

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Expiry Alerts
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Monitor inventory items that require attention.
          </p>

        </div>


        {/* ================= SUMMARY CARDS ================= */}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">

          {/* Expired */}
          <div className="rounded-2xl border border-rose-200 bg-white p-5 shadow-sm">

            <div className="flex items-start justify-between">

              <div>

                <p className="text-xs font-semibold uppercase tracking-wider text-rose-600">
                  Expired
                </p>

                <p className="mt-2 text-3xl font-bold text-rose-700">
                  {expiredCount}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Items already expired
                </p>

              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-lg text-rose-600">
                !
              </div>

            </div>

          </div>


          {/* Critical */}
          <div className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm">

            <div className="flex items-start justify-between">

              <div>

                <p className="text-xs font-semibold uppercase tracking-wider text-orange-600">
                  Critical
                </p>

                <p className="mt-2 text-3xl font-bold text-orange-700">
                  {criticalCount}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Expiring within 3 days
                </p>

              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-lg text-orange-600">
                ⚠
              </div>

            </div>

          </div>


          {/* Warning */}
          <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">

            <div className="flex items-start justify-between">

              <div>

                <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">
                  Warning
                </p>

                <p className="mt-2 text-3xl font-bold text-amber-700">
                  {warningCount}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Items approaching expiry
                </p>

              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-lg text-amber-600">
                ⏱
              </div>

            </div>

          </div>

        </div>


        {/* ================= FILTER CARD ================= */}

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">

         


          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">

            {/* Search */}
            <div className="md:col-span-1">

              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Search
              </label>

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or SKU..."
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />

            </div>


            {/* Status */}
            <div>

              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Status
              </label>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="ALL">
                  All statuses
                </option>

                <option value="EXPIRED">
                  Expired
                </option>

                <option value="CRITICAL">
                  Critical
                </option>

                <option value="WARNING">
                  Warning
                </option>
              </select>

            </div>


            {/* Sort */}
            <div>

              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Sort By
              </label>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="URGENT">
                  Most Urgent
                </option>

                <option value="LATEST">
                  Furthest Expiry
                </option>

                <option value="QUANTITY">
                  Highest Quantity
                </option>
              </select>

            </div>

          </div>


          {/* Filter Footer */}
          <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">

            <p className="text-xs text-slate-500">

              Showing{" "}
              <span className="font-semibold text-slate-700">
                {filteredAlerts.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-700">
                {alerts.length}
              </span>{" "}
              alerts

            </p>


            {(search || statusFilter !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("ALL");
                }}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
              >
                Clear filters
              </button>
            )}

          </div>

        </div>


        {/* ================= ALERT LIST ================= */}

        {alerts.length === 0 ? (

          /* No Alerts */
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-2xl font-bold text-emerald-600">
              ✓
            </div>

            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              No expiry alerts
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              Your inventory currently has no items requiring expiry attention.
            </p>

          </div>

        ) : filteredAlerts.length === 0 ? (

          /* No Filter Results */
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-500">
              🔍
            </div>

            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              No matching alerts
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Try changing your search or status filter.
            </p>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("ALL");
              }}
              className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              Clear Filters
            </button>

          </div>

        ) : (

          <div className="space-y-3">

            {filteredAlerts.map((item) => {

              const isExpired = item.days_remaining < 0;
              const isCritical =
                item.days_remaining >= 0 &&
                item.days_remaining <= 3;

              return (
                <div
                  key={item.inventory_id}
                  className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md ${
                    isExpired
                      ? "border-rose-200"
                      : isCritical
                        ? "border-orange-200"
                        : "border-slate-200"
                  }`}
                >

                  <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">

                    {/* Product Information */}
                    <div className="min-w-0">

                      <div className="flex flex-wrap items-center gap-2">

                        <h3 className="truncate text-base font-bold text-slate-900">
                          {item.name}
                        </h3>

                        <ExpiryBadge status={item.status} />

                      </div>

                      <p className="mt-1 font-mono text-xs text-slate-500">
                        SKU: {item.sku}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-600">

                        <div>
                          <span className="text-slate-400">
                            Expiry:
                          </span>{" "}
                          <span className="font-medium">
                            {item.expiry_date}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400">
                            Quantity:
                          </span>{" "}
                          <span className="font-medium">
                            {item.quantity} {item.unit}
                          </span>
                        </div>

                      </div>

                    </div>


                    {/* Right Side */}
                    <div className="flex items-center justify-between gap-5 border-t border-slate-100 pt-4 lg:border-t-0 lg:pt-0">

                      <div className="text-left lg:text-right">

                        <p
                          className={`text-lg font-bold ${
                            isExpired
                              ? "text-rose-700"
                              : isCritical
                                ? "text-orange-700"
                                : "text-amber-700"
                          }`}
                        >
                          {isExpired
                            ? "Expired"
                            : `${item.days_remaining} days`}
                        </p>

                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {isExpired
                            ? `${Math.abs(item.days_remaining)} days overdue`
                            : "remaining"}
                        </p>

                      </div>


                      {/* Status Indicator */}
                      <div
                        className={`h-10 w-1 rounded-full ${
                          isExpired
                            ? "bg-rose-500"
                            : isCritical
                              ? "bg-orange-500"
                              : "bg-amber-500"
                        }`}
                      />

                    </div>

                  </div>

                </div>
              );
            })}

          </div>

        )}

      </div>

    </div>
  );
}

export default ExpiryAlerts;

