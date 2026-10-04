import { useEffect, useMemo, useState } from "react";

import type { ExpiryStatus } from "../types/expiry";
import { getExpiryAlerts } from "../services/expiryApi";
import ExpiryBadge from "../components/inventory/ExpiryBadge";

function ExpiryAlerts() {

  const [alerts, setAlerts] = useState<ExpiryStatus[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("URGENT");

  useEffect(() => {
    async function loadAlerts() {
      try {
        const data = await getExpiryAlerts();
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

      <div className="space-y-6">
        <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600" />

            <p className="mt-3 text-sm font-medium text-slate-600">
              Loading expiry alerts...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>

      <header className="px-1 pb-0 pt-3 sm:pt-0">
        <div className="flex items-center gap-2.5">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-3xl ">
            Expiry{" "}
            <span className="bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
              Alerts
            </span>
          </h2>
        </div>

        <p className="mt-1 max-w-xl text-sm text-slate-600 sm:text-base dark:text-slate-400">
          Monitor inventory items that require attention before expiry.
        </p>

        {/* Styled divider */}
        <div className="relative mb-4 mt-4 sm:mb-6 sm:mt-5">
          <div className="h-px w-full bg-gradient-to-r from-slate-300 via-slate-200 to-transparent dark:from-slate-600 dark:via-slate-700" />
          <div className="absolute left-0 top-0 h-[2px] w-16 -translate-y-1/2 rounded-full bg-gradient-to-r from-amber-500 to-orange-600" />
        </div>
      </header>




      <div className="min-h-screen bg-slate-100 p-4 sm:p-2 lg:p-2">

        <div className="mx-auto w-full max-w-7xl space-y-6">
          {/* ================= SUMMARY ================= */}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

            {/* Expired */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Expired
                  </p>

                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {expiredCount}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Items already expired
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-5 w-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 8v5m0 3h.01M10.3 3.8 2.9 17a2 2 0 0 0 1.75 3h14.7a2 2 0 0 0 1.75-3L13.7 3.8a2 2 0 0 0-3.4 0Z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Critical */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Critical
                  </p>

                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {criticalCount}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Expiring within 3 days
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-5 w-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 8v4m0 4h.01M10.3 3.8 2.9 17a2 2 0 0 0 1.75 3h14.7a2 2 0 0 0 1.75-3L13.7 3.8a2 2 0 0 0-3.4 0Z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Warning */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Warning
                  </p>

                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {warningCount}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Items approaching expiry
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-5 w-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6v6l4 2m5-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* ================= FILTERS ================= */}

          <div className="mobile-app-card overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">

            <div className="grid gap-4 p-5 md:grid-cols-3">

              {/* Search */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Search
                </label>

                <div className="relative">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path
                      strokeLinecap="round"
                      d="m16.5 16.5 4 4"
                    />
                  </svg>

                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name or SKU..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3.5 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Status
                </label>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 text-sm text-slate-800 outline-none transition-all hover:border-slate-300 hover:bg-white focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50"
                >
                  <option value="ALL">All statuses</option>
                  <option value="EXPIRED">Expired</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="WARNING">Warning</option>
                </select>
              </div>

              {/* Sort */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Sort By
                </label>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 text-sm text-slate-800 outline-none transition-all hover:border-slate-300 hover:bg-white focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50"
                >
                  <option value="URGENT">Already Expired</option>
                  <option value="LATEST">Furthest Expiry</option>
                  <option value="QUANTITY">Highest Quantity</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
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
                  className="w-fit rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-200/70 hover:text-slate-900"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {/* ================= ALERT LIST ================= */}

          {alerts.length === 0 ? (

            /* No Alerts */
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              <div className="px-6 py-14 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-7 w-7"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m5 12 4 4L19 6"
                    />
                  </svg>
                </div>

                <h2 className="mt-4 text-base font-bold text-slate-900">
                  No expiry alerts
                </h2>

                <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                  Your inventory currently has no items requiring expiry
                  attention.
                </p>
              </div>
            </div>

          ) : filteredAlerts.length === 0 ? (

            /* No Filter Results */
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              <div className="px-6 py-14 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-6 w-6"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path
                      strokeLinecap="round"
                      d="m16.5 16.5 4 4"
                    />
                  </svg>
                </div>

                <h2 className="mt-4 text-base font-bold text-slate-900">
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
                  className="mt-5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Clear Filters
                </button>
              </div>
            </div>

          ) : (

            <>
              {/* ================= DESKTOP TABLE ================= */}

              <div className="hidden overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm md:block">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="border-b border-slate-200 bg-slate-50">
                      <tr>
                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          SKU
                        </th>

                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Product
                        </th>

                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Quantity
                        </th>

                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Expiry
                        </th>

                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Status
                        </th>

                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Remaining
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredAlerts.map((item) => {
                        const isExpired = item.days_remaining < 0;
                        const isCritical =
                          item.days_remaining >= 0 &&
                          item.days_remaining <= 3;

                        return (
                          <tr
                            key={item.inventory_id}
                            className="border-b border-slate-100 last:border-b-0 transition hover:bg-slate-50/70"
                          >
                            {/* SKU */}
                            <td className="px-6 py-4">
                              <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-medium text-slate-700">
                                {item.sku}
                              </span>
                            </td>

                            {/* Product */}
                            <td className="px-6 py-4">
                              <p className="font-medium text-slate-800">
                                {item.name}
                              </p>

                              <p className="mt-1 text-xs text-slate-400">
                                Inventory ID: {item.inventory_id}
                              </p>
                            </td>

                            {/* Quantity */}
                            <td className="px-6 py-4">
                              <p className="font-semibold text-slate-800">
                                {item.quantity}
                              </p>

                              <p className="text-xs text-slate-400">
                                {item.unit}
                              </p>
                            </td>

                            {/* Expiry */}
                            <td className="px-6 py-4">
                              <p className="text-sm text-slate-700">
                                {item.expiry_date}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {isExpired
                                  ? `${Math.abs(
                                    item.days_remaining
                                  )} days overdue`
                                  : `${item.days_remaining} days remaining`}
                              </p>
                            </td>

                            {/* Status */}
                            <td className="px-6 py-4">
                              <ExpiryBadge status={item.status} />
                            </td>

                            {/* Remaining */}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`h-9 w-1 rounded-full ${isExpired
                                    ? "bg-rose-500"
                                    : isCritical
                                      ? "bg-orange-500"
                                      : "bg-amber-500"
                                    }`}
                                />

                                <div>
                                  <p
                                    className={`text-sm font-bold ${isExpired
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

                                  <p className="text-xs text-slate-400">
                                    {isExpired
                                      ? "Action required"
                                      : "remaining"}
                                  </p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ================= MOBILE LIST ================= */}
              <div className="mobile-content-list md:hidden">
                {filteredAlerts.map((item) => {
                  const isExpired = item.days_remaining < 0;
                  const isCritical = item.days_remaining >= 0 && item.days_remaining <= 3;
                  const tone = isExpired ? "danger" : isCritical ? "warning" : "safe";

                  return (
                    <article key={item.inventory_id} className={`mobile-record mobile-alert-record mobile-alert-${tone}`}>
                      <div className="mobile-record-head">
                        <div className="mobile-record-title-wrap">
                          <div className={`mobile-alert-dot mobile-alert-dot-${tone}`} />
                          <div className="min-w-0">
                            <h3 className="mobile-record-title">{item.name}</h3>
                            <p className="mobile-record-subtitle">{item.sku} · Inventory #{item.inventory_id}</p>
                          </div>
                        </div>
                        <ExpiryBadge status={item.status} />
                      </div>

                      <div className="mobile-alert-hero">
                        <div>
                          <span className="mobile-metric-label">{isExpired ? "Overdue" : "Time remaining"}</span>
                          <strong className={`mobile-alert-days mobile-alert-days-${tone}`}>
                            {isExpired ? `${Math.abs(item.days_remaining)}d` : `${item.days_remaining}d`}
                          </strong>
                        </div>
                        <div className="text-right">
                          <span className="mobile-metric-label">Quantity</span>
                          <strong className="mobile-metric-value">{item.quantity} {item.unit}</strong>
                        </div>
                      </div>

                      <div className="mobile-record-meta">
                        <span>Expiry <b>{item.expiry_date}</b></span>
                        <span>Status <b>{isExpired ? "Expired" : item.status}</b></span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );

}

export default ExpiryAlerts;