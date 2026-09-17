import { useEffect, useMemo, useState } from "react";
import type { Inventory } from "../types/inventory";
import type { Donation } from "../types/donation";
import { getInventory } from "../services/inventoryApi";
import { createDonation, getDonations } from "../services/donationApi";

function Donations() {
  const tenantId = 1;

  // STATE
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [inventoryId, setInventoryId] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [recipient, setRecipient] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Filters & Search for History
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState("NEWEST");

  // LOAD DATA
  async function loadData() {
    try {
      setError("");
      const [inventoryData, donationData] = await Promise.all([
        getInventory(tenantId),
        getDonations(tenantId),
      ]);

      setInventory(inventoryData);
      setDonations(donationData);
    } catch (err) {
      console.error(err);
      setError("Failed to load donation data.");
    } finally {
      setInitialLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // SELECTED ITEM
  const selectedItem = inventory.find((item) => item.id === inventoryId);

  // SUBMIT
  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!inventoryId) {
      setError("Please select an inventory item.");
      return;
    }

    if (quantity <= 0) {
      setError("Quantity must be greater than zero.");
      return;
    }

    if (selectedItem && quantity > selectedItem.quantity) {
      setError("Donation quantity cannot exceed available stock.");
      return;
    }

    try {
      setLoading(true);

      await createDonation({
        tenant_id: tenantId,
        inventory_id: inventoryId,
        quantity,
        recipient_name: recipient.trim() || undefined,
        note: note.trim() || undefined,
      });

      setMessage("Donation created successfully.");
      setInventoryId(0);
      setQuantity(1);
      setRecipient("");
      setNote("");

      await loadData();
    } catch (err: any) {
      console.error(err);
      const detail = err?.response?.data?.detail;
      setError(
        typeof detail === "string" ? detail : "Failed to create donation."
      );
    } finally {
      setLoading(false);
    }
  }

  // FILTER + SORT HISTORY
  const filteredDonations = useMemo(() => {
    const searchValue = search.toLowerCase().trim();

    const filtered = donations.filter((donation) => {
      const status = (donation.donation_status || "").toUpperCase();
      const matchesStatus = statusFilter === "ALL" || status === statusFilter;
      const matchesSearch =
        !searchValue ||
        String(donation.id).toLowerCase().includes(searchValue) ||
        String(donation.inventory_id).toLowerCase().includes(searchValue) ||
        (donation.recipient_name || "").toLowerCase().includes(searchValue) ||
        (donation.note || "").toLowerCase().includes(searchValue);

      return matchesStatus && matchesSearch;
    });

    return [...filtered].sort((a, b) => {
      const dateA = a.donated_at ? new Date(a.donated_at).getTime() : 0;
      const dateB = b.donated_at ? new Date(b.donated_at).getTime() : 0;

      return sortOrder === "NEWEST" ? dateB - dateA : dateA - dateB;
    });
  }, [donations, search, statusFilter, sortOrder]);

  // STATUS STYLE MAPPER
  function getStatusStyle(status?: string) {
    switch ((status || "").toUpperCase()) {
      case "COMPLETED":
      case "DELIVERED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "PENDING":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "CANCELLED":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  }

  // INITIAL LOADING
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
        <div className="mx-auto flex min-h-[300px] w-full max-w-6xl items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600" />
            <p className="mt-3 text-sm font-medium text-slate-600">
              Loading donations...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // UI
  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="mx-auto w-full max-w-6xl">
        {/* HEADER */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Donations
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Record surplus food donations and track redistribution.
            </p>
          </div>
        </div>

        {/* NOTIFICATIONS */}
        {message && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
              ✓
            </div>
            <p className="text-sm font-semibold text-emerald-800">{message}</p>
          </div>
        )}

        {error && (
          <div className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-100 text-sm font-bold text-rose-700">
                !
              </div>
              <p className="text-sm font-medium text-rose-700">{error}</p>
            </div>
            <button
              type="button"
              onClick={loadData}
              className="shrink-0 text-xs font-bold text-rose-700 hover:text-rose-900"
            >
              Retry
            </button>
          </div>
        )}

        {/* CREATE DONATION FORM CARD */}
        <form
          onSubmit={handleSubmit}
          className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          {/* Form Header */}
          <div className="border-b border-slate-100 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-lg text-emerald-600">
                ♻
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Create Donation
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Select surplus inventory and record the donation details.
                </p>
              </div>
            </div>
          </div>

          {/* Form Body */}
          <div className="p-6">
            <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
              {/* Inventory Selection */}
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Inventory Item
                </label>
                <select
                  value={inventoryId}
                  onChange={(event) =>
                    setInventoryId(Number(event.target.value))
                  }
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition hover:border-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  required
                >
                  <option value={0}>Select inventory item</option>
                  {inventory.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} — {item.sku} ({item.quantity} {item.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Available Stock Indicator */}
              {selectedItem && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 md:col-span-2">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                        Available Stock
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {selectedItem.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-emerald-700">
                        {selectedItem.quantity}
                      </p>
                      <p className="text-[10px] font-medium uppercase text-slate-500">
                        {selectedItem.unit}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Donation Quantity */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Quantity to Donate
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={selectedItem?.quantity}
                  value={quantity}
                  onChange={(event) => setQuantity(Number(event.target.value))}
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition hover:border-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  required
                />
                {selectedItem && (
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    Maximum available:{" "}
                    <span className="font-semibold text-slate-700">
                      {selectedItem.quantity} {selectedItem.unit}
                    </span>
                  </p>
                )}
              </div>

              {/* Recipient */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Recipient / NGO
                  <span className="ml-1 font-normal text-slate-400">
                    (optional)
                  </span>
                </label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(event) => setRecipient(event.target.value)}
                  placeholder="Helping Hands NGO"
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition hover:border-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              {/* Note */}
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Note
                  <span className="ml-1 font-normal text-slate-400">
                    (optional)
                  </span>
                </label>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={3}
                  placeholder="Surplus food donation"
                  className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition hover:border-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>

            {/* Submit Action */}
            <div className="mt-7 flex justify-end border-t border-slate-100 pt-5">
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-emerald-600 px-7 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 active:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {loading ? "Creating Donation..." : "Create Donation"}
              </button>
            </div>
          </div>
        </form>

        {/* DONATION HISTORY LIST */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* History Header & Controls */}
          <div className="border-b border-slate-100 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Donation History
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Previously recorded surplus food donations.
                </p>
              </div>
              <div className="inline-flex self-start rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600 sm:self-auto">
                {donations.length} total donation
                {donations.length !== 1 ? "s" : ""}
              </div>
            </div>

            {/* Filter Bar */}
            {donations.length > 0 && (
              <div className="mt-5 grid gap-4 border-t border-slate-100 pt-4 md:grid-cols-3">
                {/* Search */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Search
                  </label>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Recipient, inventory ID, note..."
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                {/* Status Filter */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="PENDING">Pending</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>

                {/* Sort */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Sort By
                  </label>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  >
                    <option value="NEWEST">Newest First</option>
                    <option value="OLDEST">Oldest First</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* History Data Table */}
          {donations.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-400">
                ♻
              </div>
              <h3 className="mt-4 text-sm font-semibold text-slate-800">
                No donations recorded
              </h3>
              <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
                Donations created from the form above will appear here.
              </p>
            </div>
          ) : filteredDonations.length === 0 ? (
            <div className="p-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-400">
                🔍
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-900">
                No matching donations
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Try clearing search or changing status filters.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("ALL");
                }}
                className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[750px] text-left">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Recipient
                    </th>
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Inventory
                    </th>
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Status
                    </th>
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDonations.map((donation) => (
                    <tr
                      key={donation.id}
                      className="transition hover:bg-slate-50"
                    >
                      {/* Recipient */}
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-slate-800">
                          {donation.recipient_name || "Not specified"}
                        </p>
                        {donation.note && (
                          <p className="mt-0.5 max-w-xs truncate text-xs text-slate-400">
                            {donation.note}
                          </p>
                        )}
                      </td>

                      {/* Inventory */}
                      <td className="px-6 py-4">
                        <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-medium text-slate-600">
                          #{donation.inventory_id}
                        </span>
                      </td>

                      {/* Quantity */}
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-slate-800">
                          {donation.quantity}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${getStatusStyle(
                            donation.donation_status
                          )}`}
                        >
                          {donation.donation_status || "Completed"}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="whitespace-nowrap px-6 py-4">
                        {donation.donated_at ? (
                          <>
                            <p className="text-xs font-medium text-slate-700">
                              {new Date(
                                donation.donated_at
                              ).toLocaleDateString(undefined, {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </p>
                            <p className="mt-0.5 text-[10px] text-slate-400">
                              {new Date(
                                donation.donated_at
                              ).toLocaleTimeString(undefined, {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Donations;