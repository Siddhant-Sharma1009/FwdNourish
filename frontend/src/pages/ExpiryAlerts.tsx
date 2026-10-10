import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { ExpiryStatus } from "../types/expiry";
import { getExpiryAlerts } from "../services/expiryApi";
import ExpiryBadge from "../components/inventory/ExpiryBadge";

type StatusFilter = "ALL" | "EXPIRED" | "CRITICAL" | "WARNING" | "SAFE";
type SortOption = "URGENT" | "NEAREST" | "FURTHEST" | "QUANTITY";

type ExpiryItem = ExpiryStatus & {
  // Optional fields are supported in case the API includes soft-delete metadata.
  is_deleted?: boolean;
  deleted?: boolean;
  deleted_at?: string | null;
  is_active?: boolean;
};

const fieldClass =
  "h-12 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 text-base text-slate-800 outline-none transition hover:border-slate-300 hover:bg-white focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50 sm:h-11 sm:text-sm";

function getEffectiveStatus(item: ExpiryItem): StatusFilter {
  // Derive status from days_remaining so the filters and displayed urgency agree.
  if (item.days_remaining < 0) return "EXPIRED";
  if (item.days_remaining <= 3) return "CRITICAL";
  if (item.days_remaining <= 7) return "WARNING";
  return "SAFE";
}

function isSoftDeleted(item: ExpiryItem): boolean {
  return (
    item.is_deleted === true ||
    item.deleted === true ||
    item.is_active === false ||
    Boolean(item.deleted_at)
  );
}

function ExpiryAlerts() {
  const [alerts, setAlerts] = useState<ExpiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("URGENT");

  useEffect(() => {
    let cancelled = false;

    async function loadAlerts() {
      setLoading(true);
      setLoadError("");

      try {
        const data = await getExpiryAlerts();
        if (!cancelled) {
          // Defensive frontend filter. The API should also exclude soft-deleted rows.
          setAlerts((data as ExpiryItem[]).filter((item) => !isSoftDeleted(item)));
        }
      } catch (error) {
        console.error("Failed to load expiry alerts:", error);
        if (!cancelled) setLoadError("Unable to load expiry alerts. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadAlerts();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeAlerts = useMemo(
    () => alerts.filter((item) => !isSoftDeleted(item)),
    [alerts],
  );

  const filteredAlerts = useMemo(() => {
    const searchValue = search.trim().toLocaleLowerCase();

    const filtered = activeAlerts.filter((item) => {
      const name = String(item.name ?? "").toLocaleLowerCase();
      const sku = String(item.sku ?? "").toLocaleLowerCase();
      const matchesSearch =
        !searchValue || name.includes(searchValue) || sku.includes(searchValue);
      const matchesStatus =
        statusFilter === "ALL" || getEffectiveStatus(item) === statusFilter;

      return matchesSearch && matchesStatus;
    });

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "URGENT":
        case "NEAREST":
          return (
            a.days_remaining - b.days_remaining ||
            String(a.name).localeCompare(String(b.name))
          );
        case "FURTHEST":
          return (
            b.days_remaining - a.days_remaining ||
            String(a.name).localeCompare(String(b.name))
          );
        case "QUANTITY":
          return (
            b.quantity - a.quantity ||
            a.days_remaining - b.days_remaining
          );
        default:
          return 0;
      }
    });
  }, [activeAlerts, search, statusFilter, sortBy]);

  const expiredCount = activeAlerts.filter(
    (item) => item.days_remaining < 0,
  ).length;
  const expiringSoonCount = activeAlerts.filter(
    (item) => item.days_remaining >= 0 && item.days_remaining <= 3,
  ).length;
  const upcomingCount = activeAlerts.filter(
    (item) => item.days_remaining >= 4 && item.days_remaining <= 7,
  ).length;
  const unitsAtRisk = activeAlerts
    .filter((item) => item.days_remaining <= 7)
    .reduce((total, item) => total + (Number(item.quantity) || 0), 0);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setSortBy("URGENT");
  };

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600" />
          <p className="mt-3 text-sm font-medium text-slate-600">
            Loading expiry alerts...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="px-1 pt-2 sm:pt-0">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Expiry{" "}
          <span className="bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
            Alerts
          </span>
        </h2>
        <p className="mt-1 max-w-xl text-sm text-slate-600 sm:text-base">
          Monitor active inventory items that need attention before expiry.
        </p>
        <div className="relative mt-5">
          <div className="h-px w-full bg-gradient-to-r from-slate-300 via-slate-200 to-transparent" />
          <div className="absolute left-0 top-0 h-0.5 w-16 -translate-y-1/2 rounded-full bg-gradient-to-r from-amber-500 to-orange-600" />
        </div>
      </header>

      {loadError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          <span>{loadError}</span>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="font-semibold underline underline-offset-2"
          >
            Retry
          </button>
        </div>
      )}

      <section aria-label="Expiry summary" className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <SummaryCard
          label="Expired"
          value={expiredCount}
          description="Past expiry date"
          tone="rose"
        />
        <SummaryCard
          label="Expiring Soon"
          value={expiringSoonCount}
          description="Within 3 days"
          tone="orange"
        />
        <SummaryCard
          label="Upcoming"
          value={upcomingCount}
          description="In 4–7 days"
          tone="amber"
        />
        <SummaryCard
          label="Units at Risk"
          value={unitsAtRisk.toLocaleString()}
          description="Quantity expiring within 7 days"
          tone="emerald"
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 sm:p-5">
          <div className="col-span-2 sm:col-span-1">
            <label htmlFor="expiry-search" className="mb-1.5 block text-xs font-semibold text-slate-600">
              Search inventory
            </label>
            <input
              id="expiry-search"
              type="search"
              autoComplete="off"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search product name or SKU..."
              className={fieldClass}
            />
          </div>

          <div>
            <label htmlFor="expiry-status" className="mb-1.5 block text-xs font-semibold text-slate-600">
              Status
            </label>
            <select
              id="expiry-status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className={fieldClass}
            >
              <option value="ALL">All statuses</option>
              <option value="EXPIRED">Expired</option>
              <option value="CRITICAL">Expiring within 3 days</option>
              <option value="WARNING">Expiring in 4–7 days</option>
              <option value="SAFE">More than 7 days</option>
            </select>
          </div>

          <div>
            <label htmlFor="expiry-sort" className="mb-1.5 block text-xs font-semibold text-slate-600">
              Sort by
            </label>
            <select
              id="expiry-sort"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortOption)}
              className={fieldClass}
            >
              <option value="URGENT">Most urgent first</option>
              <option value="NEAREST">Nearest expiry</option>
              <option value="FURTHEST">Furthest expiry</option>
              <option value="QUANTITY">Highest quantity</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-5">
          <p className="text-xs text-slate-500">
            Showing <span className="font-semibold text-slate-800">{filteredAlerts.length}</span> of{" "}
            <span className="font-semibold text-slate-800">{activeAlerts.length}</span> active items
          </p>
          {(search || statusFilter !== "ALL" || sortBy !== "URGENT") && (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-200/70 hover:text-slate-900"
            >
              Reset filters
            </button>
          )}
        </div>
      </section>

      {activeAlerts.length === 0 ? (
        <EmptyState
          title="No expiry alerts"
          description="There are no active inventory items returned by the expiry alerts service."
        />
      ) : filteredAlerts.length === 0 ? (
        <EmptyState
          title="No matching items"
          description="Try another search term or change the status filter."
          action={
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Reset filters
            </button>
          }
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    {["SKU", "Product", "Quantity", "Expiry date", "Status", "Time remaining"].map((heading) => (
                      <th key={heading} className="whitespace-nowrap px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredAlerts.map((item) => {
                    const expired = item.days_remaining < 0;
                    return (
                      <tr key={item.inventory_id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                        <td className="px-5 py-4">
                          <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-medium text-slate-700">{item.sku}</span>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-800">{item.name}</p>
                          <p className="mt-1 text-xs text-slate-400">Inventory ID: {item.inventory_id}</p>
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-semibold text-slate-800">{item.quantity}</span>
                          <span className="ml-1 text-xs text-slate-500">{item.unit}</span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          <p className="text-sm text-slate-700">{item.expiry_date}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {expired
                              ? `${Math.abs(item.days_remaining)} ${Math.abs(item.days_remaining) === 1 ? "day" : "days"} overdue`
                              : `${item.days_remaining} ${item.days_remaining === 1 ? "day" : "days"} remaining`}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <ExpiryBadge status={getEffectiveStatus(item) as ExpiryStatus["status"]} />
                        </td>
                        <td className="px-5 py-4">
                          <span className={`text-sm font-semibold ${expired ? "text-rose-700" : item.days_remaining <= 3 ? "text-orange-700" : item.days_remaining <= 7 ? "text-amber-700" : "text-emerald-700"}`}>
                            {expired ? "Expired" : `${item.days_remaining} days`}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3 md:hidden">
            {filteredAlerts.map((item) => {
              const status = getEffectiveStatus(item);
              const expired = status === "EXPIRED";
              const tone =
                status === "EXPIRED"
                  ? { bar: "bg-rose-500", tint: "bg-rose-50", text: "text-rose-700", label: "text-rose-600" }
                  : status === "CRITICAL"
                    ? { bar: "bg-orange-500", tint: "bg-orange-50", text: "text-orange-700", label: "text-orange-600" }
                    : status === "WARNING"
                      ? { bar: "bg-amber-500", tint: "bg-amber-50", text: "text-amber-700", label: "text-amber-600" }
                      : { bar: "bg-emerald-500", tint: "bg-emerald-50", text: "text-emerald-700", label: "text-emerald-600" };

              return (
                <article key={item.inventory_id} className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                  <div className={`absolute inset-y-0 left-0 w-1.5 ${tone.bar}`} aria-hidden="true" />
                  <div className="py-4 pl-5 pr-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="break-words text-base font-semibold text-slate-900">{item.name}</h3>
                        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono font-medium text-slate-700">{item.sku}</span>
                          <span>#{item.inventory_id}</span>
                        </p>
                      </div>
                      <div className="shrink-0">
                        <ExpiryBadge status={status as ExpiryStatus["status"]} />
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2.5">
                      <div className={`rounded-xl px-3 py-2.5 ${tone.tint}`}>
                        <p className={`text-[11px] font-semibold ${tone.label}`}>{expired ? "Overdue" : "Time left"}</p>
                        <p className={`mt-0.5 text-xl font-bold leading-tight ${tone.text}`}>
                          {Math.abs(item.days_remaining)}
                          <span className="ml-1 text-xs font-semibold">{Math.abs(item.days_remaining) === 1 ? "day" : "days"}</span>
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                        <p className="text-[11px] font-semibold text-slate-500">Quantity</p>
                        <p className="mt-0.5 text-xl font-bold leading-tight text-slate-900">
                          {item.quantity}<span className="ml-1 text-xs font-semibold text-slate-500">{item.unit}</span>
                        </p>
                      </div>
                    </div>

                    <p className="mt-3 text-xs text-slate-500">
                      Expires <span className="font-semibold text-slate-700">{item.expiry_date}</span>
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  description,
  tone,
}: {
  label: string;
  value: string | number;
  description: string;
  tone: "rose" | "orange" | "amber" | "emerald";
}) {
  const tones = {
    rose: "text-rose-600 bg-rose-50",
    orange: "text-orange-600 bg-orange-50",
    amber: "text-amber-600 bg-amber-50",
    emerald: "text-emerald-600 bg-emerald-50",
  };

  return (
    <article className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">{label}</p>
          <p className="mt-1.5 break-words text-2xl font-bold tracking-tight text-slate-900 sm:mt-2 sm:text-3xl">{value}</p>
          <p className="mt-1 hidden text-xs text-slate-500 sm:block">{description}</p>
        </div>
        <span className={`hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:flex ${tones[tone]}`}>
          <span className="text-sm font-bold" aria-hidden="true">
            {tone === "rose" ? "!" : tone === "orange" ? "◷" : tone === "amber" ? "⌛" : "＋"}
          </span>
        </span>
      </div>
      <p className="mt-1 text-[10px] text-slate-500 sm:hidden">{description}</p>
    </article>
  );
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white px-6 py-12 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
        <span className="text-xl font-bold" aria-hidden="true">✓</span>
      </div>
      <h3 className="mt-4 text-base font-bold text-slate-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{description}</p>
      {action}
    </div>
  );
}

export default ExpiryAlerts;
