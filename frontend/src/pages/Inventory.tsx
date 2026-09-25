import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import type { Inventory as InventoryType } from "../types/inventory";
import type { Category } from "../types/category";
import type { ExpiryStatus } from "../types/expiry";

import { getInventory, deleteInventory } from "../services/inventoryApi";
import { getCategories } from "../services/categoryApi";
import { getExpiryStatuses } from "../services/expiryApi";

import ExpiryBadge from "../components/inventory/ExpiryBadge";
import { useAuth } from "../context/AuthContext";

function Inventory() {
  const { user, loading: authLoading } = useAuth();

  const [items, setItems] = useState<InventoryType[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expiryStatuses, setExpiryStatuses] = useState<ExpiryStatus[]>([]);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [expiryFilter, setExpiryFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  // Load core inventory items first to display table faster
  const loadInventoryData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    else setRefreshing(true);

    setError("");

    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const inventoryData = await getInventory();
      setItems(inventoryData);

      // Lazy load metadata (categories & expiry statuses) non-blockingly
      Promise.allSettled([
        getCategories(),
        getExpiryStatuses(),
      ]).then(([categoryResult, expiryResult]) => {
        if (categoryResult.status === "fulfilled") {
          setCategories(categoryResult.value);
        }
        if (expiryResult.status === "fulfilled") {
          setExpiryStatuses(expiryResult.value);
        }
      });
    } catch (err: any) {
      console.error("Failed to load inventory:", err);
      setError("Failed to load inventory data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setLoading(false);
      return;
    }

    const role = String(user.role).toUpperCase();
    const status = String(user.status).toUpperCase();

    if (role !== "TENANT" || status !== "ACTIVE") {
      setLoading(false);
      return;
    }

    void loadInventoryData(true);
  }, [authLoading, user, loadInventoryData]);

  // Fast O(1) Lookups for Category & Expiry
  const expiryMap = useMemo(() => {
    const map = new Map<number, ExpiryStatus>();
    expiryStatuses.forEach((item) => map.set(item.inventory_id, item));
    return map;
  }, [expiryStatuses]);

  const categoryMap = useMemo(() => {
    const map = new Map<number, string>();
    categories.forEach((cat) => map.set(cat.id, cat.name));
    return map;
  }, [categories]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query);

      const matchesCategory =
        categoryFilter === "" || String(item.category_id) === categoryFilter;

      const expiry = expiryMap.get(item.id);
      const matchesExpiry =
        expiryFilter === "" || expiry?.status === expiryFilter;

      return matchesSearch && matchesCategory && matchesExpiry;
    });
  }, [items, search, categoryFilter, expiryFilter, expiryMap]);

  async function handleDelete(inventoryId: number) {
    const item = items.find((currentItem) => currentItem.id === inventoryId);

    const isExpired =
      expiryMap.get(inventoryId)?.status === "EXPIRED" ||
      (item?.expiry_date
        ? new Date(item.expiry_date).getTime() < new Date().setHours(0, 0, 0, 0)
        : false);

    const confirmed = window.confirm(
      isExpired
        ? `Are you sure you want to delete "${item?.name ?? "this item"}"?`
        : `"${item?.name ?? "This item"}" is not expired. Are you sure you want to delete it?`
    );
    if (!confirmed) return;

    try {
      setDeletingId(inventoryId);
      setError("");

      await deleteInventory(inventoryId);

      setItems((previousItems) =>
        previousItems.filter((currentItem) => currentItem.id !== inventoryId)
      );
      setExpiryStatuses((previousStatuses) =>
        previousStatuses.filter((status) => status.inventory_id !== inventoryId)
      );
    } catch (err: any) {
      console.error("Delete inventory failed:", err);
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Failed to delete inventory item."
      );
    } finally {
      setDeletingId(null);
    }
  }

  function canSellOrDonate(item: InventoryType) {
    const expiry = expiryMap.get(item.id);

    const isExpired =
      expiry?.status === "EXPIRED" ||
      (item.expiry_date
        ? new Date(item.expiry_date).getTime() <
          new Date().setHours(0, 0, 0, 0)
        : false);

    return item.quantity > 0 && !isExpired;
  }

  function handleSale(item: InventoryType) {
    if (!canSellOrDonate(item)) return;

    navigate(`/pos?inventoryId=${item.id}&name=${encodeURIComponent(item.name)}`);
  }

  function handleDonate(item: InventoryType) {
    if (!canSellOrDonate(item)) return;

    navigate(
      `/surplus?inventoryId=${item.id}&name=${encodeURIComponent(item.name)}`
    );
  }

  function clearFilters() {
    setSearch("");
    setCategoryFilter("");
    setExpiryFilter("");
  }

  function toggleFilterDisplay() {
    setShowFilters((prev) => !prev);
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-100 p-6">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-green-600" />
          <p className="mt-4 text-sm text-slate-500">
            {authLoading ? "Loading account..." : "Loading inventory..."}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-100 p-6">
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <h2 className="font-semibold text-slate-800">Please log in</h2>
          <p className="mt-2 text-sm text-slate-500">
            You need to be logged in to view inventory.
          </p>
        </div>
      </div>
    );
  }

  if (
    String(user.role).toUpperCase() !== "TENANT" ||
    String(user.status).toUpperCase() !== "ACTIVE"
  ) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-100 p-6">
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <h2 className="font-semibold text-slate-800">
            Inventory unavailable
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            An active tenant account is required to access inventory.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 md:text-3xl">
              Inventory
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage and monitor your food inventory
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/inventory/add")}
            className="w-full rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 sm:w-auto"
          >
            + Add Inventory
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => loadInventoryData(true)}
              className="shrink-0 font-semibold underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Filters Panel */}
        <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm md:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Inventory Controls</h2>
              <p className="mt-1 text-xs text-slate-500">
                Search items or toggle parameters below.
              </p>
            </div>

            <div className="flex w-full gap-2 sm:w-auto">
              <button
                type="button"
                onClick={toggleFilterDisplay}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:flex-none"
              >
                {showFilters ? "Hide Filters" : "Show Filters"}
              </button>

              <button
                type="button"
                onClick={() => loadInventoryData(false)}
                disabled={refreshing}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 sm:flex-none"
              >
                {refreshing ? "Refreshing..." : "↻ Refresh"}
              </button>
            </div>
          </div>

          {/* Conditional Filter Panel */}
          {showFilters && (
            <div className="mt-4 border-t border-slate-100 pt-4 transition-all duration-200">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    🔍
                  </span>
                  <input
                    type="text"
                    placeholder="Search SKU or product..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-100"
                  />
                </div>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-100"
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>

                <select
                  value={expiryFilter}
                  onChange={(e) => setExpiryFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-100"
                >
                  <option value="">All Expiry Status</option>
                  <option value="SAFE">Safe</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="EXPIRED">Expired</option>
                </select>
              </div>

              <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  Showing{" "}
                  <span className="font-semibold text-slate-700">
                    {filteredItems.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-700">
                    {items.length}
                  </span>{" "}
                  items
                </p>

                {(search || categoryFilter || expiryFilter) && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="w-full rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 sm:w-auto"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>
          )}

          {!showFilters && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>
                Showing <strong className="text-slate-700">{filteredItems.length}</strong> of <strong className="text-slate-700">{items.length}</strong> items
              </span>

              {(search || categoryFilter || expiryFilter) && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-lg bg-slate-100 px-2.5 py-1.5 font-medium text-slate-600 hover:bg-slate-200"
                >
                  Clear active filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden overflow-hidden rounded-2xl bg-white shadow-sm md:block">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">SKU</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Product</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Category</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Quantity</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Expiry</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const expiry = expiryMap.get(item.id);
                  return (
                    <tr key={item.id} className="border-b last:border-b-0 hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-medium text-slate-700">
                          {item.sku}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-800">{item.name}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          Batch: {item.batch_number || "—"}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {categoryMap.get(item.category_id) ?? "Unknown"}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-800">{item.quantity}</p>
                        <p className="text-xs text-slate-400">{item.unit}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-700">{item.expiry_date}</p>
                        {expiry && (
                          <p className="mt-1 text-xs text-slate-500">
                            {expiry.days_remaining < 0
                              ? "Expired"
                              : `${expiry.days_remaining} days remaining`}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {expiry ? (
                          <ExpiryBadge status={expiry.status} />
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            title="Sell"
                            aria-label={`Sell ${item.name}`}
                            disabled={
                              deletingId === item.id || !canSellOrDonate(item)
                            }
                            onClick={() => handleSale(item)}
                            className="rounded-lg px-2.5 py-2 text-base font-semibold text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            💵
                          </button>

                          <button
                            type="button"
                            title="Donate"
                            aria-label={`Donate ${item.name}`}
                            disabled={
                              deletingId === item.id || !canSellOrDonate(item)
                            }
                            onClick={() => handleDonate(item)}
                            className="rounded-lg px-2.5 py-2 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            ˚.🎁⋆
                          </button>

                          <button
                            type="button"
                            title="Delete"
                            aria-label={`Delete ${item.name}`}
                            disabled={deletingId === item.id}
                            onClick={() => handleDelete(item.id)}
                            className="rounded-lg px-2.5 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                          >
                            ❌
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile View */}
        <div className="space-y-3 md:hidden">
          {filteredItems.map((item) => {
            const expiry = expiryMap.get(item.id);
            return (
              <div key={item.id} className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-slate-800">{item.name}</h3>
                    <p className="mt-1 font-mono text-xs text-slate-500">{item.sku}</p>
                  </div>
                  {expiry && <ExpiryBadge status={expiry.status} />}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-400">Category</p>
                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {categoryMap.get(item.category_id) ?? "Unknown"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Stock</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {item.quantity} {item.unit}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Expiry</p>
                    <p className="mt-1 text-sm font-medium text-slate-700">{item.expiry_date}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Remaining</p>
                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {expiry
                        ? expiry.days_remaining < 0
                          ? "Expired"
                          : `${expiry.days_remaining} days`
                        : "—"}
                    </p>
                  </div>
                </div>

                {item.batch_number && (
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <p className="text-xs text-slate-400">Batch Number</p>
                    <p className="mt-1 font-mono text-xs text-slate-600">{item.batch_number}</p>
                  </div>
                )}

                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    disabled={
                      deletingId === item.id || !canSellOrDonate(item)
                    }
                    onClick={() => handleSale(item)}
                    className="rounded-lg bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-600 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    💵 Sale
                  </button>

                  <button
                    type="button"
                    disabled={
                      deletingId === item.id || !canSellOrDonate(item)
                    }
                    onClick={() => handleDonate(item)}
                    className="rounded-lg bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    ˚.🎁⋆ Donate
                  </button>

                  <button
                    type="button"
                    disabled={deletingId === item.id}
                    onClick={() => handleDelete(item.id)}
                    className="rounded-lg bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Global Empty State */}
        {filteredItems.length === 0 && (
          <div className="mt-4 rounded-2xl bg-white px-6 py-12 text-center shadow-sm">
            <div className="text-4xl">📦</div>
            <h3 className="mt-4 font-semibold text-slate-800">No inventory found</h3>
            <p className="mt-1 text-sm text-slate-500">
              {items.length === 0
                ? "No inventory has been added for this tenant yet."
                : "Try changing your search or filters."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Inventory;