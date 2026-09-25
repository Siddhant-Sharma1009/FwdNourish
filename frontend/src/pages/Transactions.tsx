import { useEffect, useMemo, useState } from "react";

import type { Transaction } from "../types/transaction";
import { getTransactions } from "../services/transactionApi";
import { getExpiryStatuses } from "../services/expiryApi";

/**
 * The base Transaction type in the project contains the transaction fields.
 * The backend may additionally return related inventory and donation data.
 * Keeping these fields optional makes this page compatible with both shapes
 * and prevents the UI from breaking while the backend is being updated.
 */
interface InventoryDetails {
  id: number;
  tenant_id?: number;
  sku: string;
  name: string;
  category_id?: number;
  quantity?: number;
  unit: string;
  batch_number?: string | null;
  purchase_date?: string | null;
  expiry_date?: string | null;
  expiry_threshold_days?: number;
  is_deleted?: boolean;
}

interface DonationDetails {
  id: number;
  tenant_id?: number;
  inventory_id?: number;
  quantity?: number;
  committed_quantity?: number;
  remaining_quantity?: number;
  recipient_name?: string | null;
  pickup_location?: string | null;
  pickup_latitude?: number | null;
  pickup_longitude?: number | null;
  available_from?: string | null;
  available_until?: string | null;
  donation_status?: string | null;
  note?: string | null;
  donated_at?: string | null;
  created_at?: string | null;

  // Optional fields from future/extended donation responses.
  ngo_id?: number | null;
  ngo_name?: string | null;
  organization_name?: string | null;
  receiver_name?: string | null;
  receiver_contact?: string | null;
  pickup_contact?: string | null;
}

type TransactionWithDetails = Transaction & {
  inventory?: InventoryDetails | null;
  donation?: DonationDetails | null;
};

interface TransactionDisplayGroup {
  key: string;
  transactionType: string;
  saleId: string | null;
  transactions: TransactionWithDetails[];
  createdAt: string;
}

function Transactions() {
  const [transactions, setTransactions] = useState<
    TransactionWithDetails[]
  >([]);
  const [expiredCount, setExpiredCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState("NEWEST");

  const [selectedGroup, setSelectedGroup] =
    useState<TransactionDisplayGroup | null>(null);

  async function loadTransactions() {
    try {
      setLoading(true);
      setError("");

      const [transactionData, expiryData] = await Promise.all([
        getTransactions(),
        getExpiryStatuses(),
      ]);

      // The service still exposes Transaction[], while the backend can return
      // the optional nested inventory/donation objects.
      setTransactions(
        transactionData as TransactionWithDetails[]
      );

      const expiredItems = expiryData.filter(
        (item) => item.status === "EXPIRED"
      );

      setExpiredCount(expiredItems.length);
    } catch (err) {
      console.error("Failed to load transaction history:", err);
      setError("Failed to load transaction history.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedGroup(null);
      }
    }

    if (selectedGroup) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [selectedGroup]);

  function getTypeStyle(type: string) {
    switch (type.toUpperCase()) {
      case "SALE":
        return {
          badge: "bg-rose-50 text-rose-700 border-rose-200",
          quantity: "text-rose-700",
        };
      case "PURCHASE":
        return {
          badge: "bg-blue-50 text-blue-700 border-blue-200",
          quantity: "text-blue-700",
        };
      case "DONATION":
        return {
          badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
          quantity: "text-emerald-700",
        };
      case "WASTE":
        return {
          badge: "bg-orange-50 text-orange-700 border-orange-200",
          quantity: "text-orange-700",
        };
      case "ADJUSTMENT":
        return {
          badge: "bg-purple-50 text-purple-700 border-purple-200",
          quantity: "text-purple-700",
        };
      default:
        return {
          badge: "bg-slate-50 text-slate-700 border-slate-200",
          quantity: "text-slate-700",
        };
    }
  }

  function getDonationForTransaction(
    transaction: TransactionWithDetails
  ) {
    return transaction.donation ?? null;
  }

  function getItemName(transaction: TransactionWithDetails) {
    return (
      transaction.inventory?.name ||
      `Inventory #${transaction.inventory_id}`
    );
  }

  function getItemSku(transaction: TransactionWithDetails) {
    return transaction.inventory?.sku || "SKU not available";
  }

  function getItemUnit(transaction: TransactionWithDetails) {
    return transaction.inventory?.unit || "unit";
  }

  function getRecipientName(transaction: TransactionWithDetails) {
    const donation = getDonationForTransaction(transaction);

    return (
      donation?.organization_name ||
      donation?.ngo_name ||
      donation?.recipient_name ||
      donation?.receiver_name ||
      "Recipient not specified"
    );
  }

  function getDonationStatus(transaction: TransactionWithDetails) {
    return (
      getDonationForTransaction(transaction)?.donation_status ||
      "RECORDED"
    );
  }

  function formatNumber(value: number | null | undefined) {
    if (value === null || value === undefined) return "—";

    return new Intl.NumberFormat(undefined, {
      maximumFractionDigits: 2,
    }).format(value);
  }

  function formatDate(date?: string | null) {
    if (!date) return "—";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return date;
    }

    return parsed.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function formatDateTime(date?: string | null) {
    if (!date) return "—";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return date;
    }

    return parsed.toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatTime(date?: string | null) {
    if (!date) return "—";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return date;
    }

    return parsed.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function isStockOutTransaction(type: string) {
    return ["SALE", "WASTE", "DONATION"].includes(
      type.toUpperCase()
    );
  }

  function getQuantityPrefix(type: string) {
    return isStockOutTransaction(type) ? "−" : "+";
  }

  function getGroupQuantity(group: TransactionDisplayGroup) {
    return group.transactions.reduce(
      (sum, transaction) => sum + transaction.quantity,
      0
    );
  }

  function getGroupUnit(group: TransactionDisplayGroup) {
    const units = new Set(
      group.transactions
        .map((transaction) => transaction.inventory?.unit)
        .filter(Boolean)
    );

    if (units.size === 1) {
      return Array.from(units)[0];
    }

    return "units";
  }

  const filteredTransactions = useMemo(() => {
    const searchValue = search.toLowerCase().trim();

    const filtered = transactions.filter((transaction) => {
      const type = transaction.transaction_type.toUpperCase();
      const donation = getDonationForTransaction(transaction);

      const matchesType =
        typeFilter === "ALL" || type === typeFilter;

      const searchableValues = [
        transaction.id,
        transaction.inventory_id,
        transaction.sale_id,
        transaction.note,
        transaction.inventory?.name,
        transaction.inventory?.sku,
        transaction.inventory?.batch_number,
        transaction.inventory?.category_id,
        donation?.id,
        donation?.recipient_name,
        donation?.ngo_name,
        donation?.organization_name,
        donation?.receiver_name,
        donation?.pickup_location,
        donation?.donation_status,
      ];

      const matchesSearch =
        !searchValue ||
        searchableValues.some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(searchValue)
        );

      return matchesType && matchesSearch;
    });

    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();

      return sortOrder === "NEWEST"
        ? dateB - dateA
        : dateA - dateB;
    });
  }, [transactions, search, typeFilter, sortOrder]);

  const groupedTransactions = useMemo<TransactionDisplayGroup[]>(
    () => {
      const groups: TransactionDisplayGroup[] = [];
      const saleGroups = new Map<
        string,
        TransactionDisplayGroup
      >();

      filteredTransactions.forEach((transaction) => {
        const type = transaction.transaction_type.toUpperCase();

        if (type === "SALE" && transaction.sale_id) {
          const existingGroup = saleGroups.get(
            transaction.sale_id
          );

          if (existingGroup) {
            existingGroup.transactions.push(transaction);
          } else {
            const newGroup: TransactionDisplayGroup = {
              key: `SALE-${transaction.sale_id}`,
              transactionType: "SALE",
              saleId: transaction.sale_id,
              transactions: [transaction],
              createdAt: transaction.created_at,
            };

            saleGroups.set(transaction.sale_id, newGroup);
            groups.push(newGroup);
          }

          return;
        }

        groups.push({
          key: `TRANSACTION-${transaction.id}`,
          transactionType: type,
          saleId: null,
          transactions: [transaction],
          createdAt: transaction.created_at,
        });
      });

      groups.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();

        return sortOrder === "NEWEST"
          ? dateB - dateA
          : dateA - dateB;
      });

      return groups;
    },
    [filteredTransactions, sortOrder]
  );

  const saleCount = useMemo(() => {
    const saleIds = new Set<string>();
    let individualSales = 0;

    transactions.forEach((transaction) => {
      if (transaction.transaction_type.toUpperCase() !== "SALE") {
        return;
      }

      if (transaction.sale_id) {
        saleIds.add(transaction.sale_id);
      } else {
        individualSales++;
      }
    });

    return saleIds.size + individualSales;
  }, [transactions]);

  const purchaseCount = transactions.filter(
    (transaction) =>
      transaction.transaction_type.toUpperCase() === "PURCHASE"
  ).length;

  const donationCount = transactions.filter(
    (transaction) =>
      transaction.transaction_type.toUpperCase() === "DONATION"
  ).length;

  const donatedQuantity = transactions
    .filter(
      (transaction) =>
        transaction.transaction_type.toUpperCase() === "DONATION"
    )
    .reduce((sum, transaction) => sum + transaction.quantity, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
        <div className="mx-auto flex min-h-[300px] w-full max-w-7xl items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600" />
            <p className="mt-3 text-sm font-medium text-slate-600">
              Loading transactions...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="mx-auto w-full max-w-7xl">
        {/* HEADER */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Transaction History
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Track sales, purchases, donations, waste, and other inventory movements.
            </p>
          </div>

          <button
            type="button"
            onClick={loadTransactions}
            className="w-fit rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
            <p className="text-sm font-medium text-rose-700">{error}</p>
            <button
              type="button"
              onClick={loadTransactions}
              className="shrink-0 text-xs font-bold text-rose-700 hover:text-rose-900"
            >
              Retry
            </button>
          </div>
        )}

        {/* SUMMARY CARDS */}
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Total
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {transactions.length}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Transaction records
            </p>
          </div>

          <div className="rounded-2xl border border-rose-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-500">
              Sales
            </p>
            <p className="mt-2 text-2xl font-bold text-rose-700">
              {saleCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">POS sales</p>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500">
              Purchases
            </p>
            <p className="mt-2 text-2xl font-bold text-blue-700">
              {purchaseCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">Stock received</p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">
              Donations
            </p>
            <p className="mt-2 text-2xl font-bold text-emerald-700">
              {donationCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {formatNumber(donatedQuantity)} units donated
            </p>
          </div>

          <div className="rounded-2xl border border-orange-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-orange-500">
              Waste
            </p>
            <p className="mt-2 text-2xl font-bold text-orange-700">
              {expiredCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">Expired items</p>
          </div>
        </div>

        {/* FILTERS */}
        <div className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-4 p-5 md:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Search
              </label>
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Item, SKU, transaction, donation, NGO, note..."
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Transaction Type
              </label>
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="ALL">All Transactions</option>
                <option value="SALE">Sales</option>
                <option value="PURCHASE">Purchases</option>
                <option value="DONATION">Donations</option>
                <option value="WASTE">Waste</option>
                <option value="ADJUSTMENT">Adjustments</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Sort
              </label>
              <select
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="NEWEST">Newest First</option>
                <option value="OLDEST">Oldest First</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1 border-t border-slate-100 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing {groupedTransactions.length} transaction group
              {groupedTransactions.length === 1 ? "" : "s"}
            </span>
            <span>
              {filteredTransactions.length} record
              {filteredTransactions.length === 1 ? "" : "s"} matched
            </span>
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {groupedTransactions.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-400">
                ↔
              </div>
              <h3 className="mt-4 text-sm font-bold text-slate-800">
                No transactions found
              </h3>
              <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">
                No transaction matches the selected filters. If you expect a
                donation here, make sure the donation completion flow creates a
                DONATION transaction for the completed donation.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Transaction
                    </th>
                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Item
                    </th>
                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Type
                    </th>
                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Quantity
                    </th>
                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Donation / Note
                    </th>
                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Date
                    </th>
                    <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {groupedTransactions.map((group) => {
                    const firstTransaction = group.transactions[0];
                    const type = group.transactionType;
                    const styles = getTypeStyle(type);
                    const quantity = getGroupQuantity(group);
                    const unit = getGroupUnit(group);
                    const donation = getDonationForTransaction(
                      firstTransaction
                    );

                    return (
                      <tr
                        key={group.key}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-4 align-top">
                          <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-600">
                              {type === "DONATION"
                                ? "🎁"
                                : type === "SALE"
                                  ? "₹"
                                  : type === "PURCHASE"
                                    ? "+"
                                    : "↔"}
                            </div>
                            <div>
                              <p className="font-mono text-xs font-bold text-slate-800">
                                {group.saleId
                                  ? `Sale ${group.saleId}`
                                  : `TXN ${firstTransaction.id}`}
                              </p>
                              {group.transactions.length > 1 && (
                                <p className="mt-1 text-[11px] text-slate-400">
                                  {group.transactions.length} records in this sale
                                </p>
                              )}
                              {type === "DONATION" && donation?.id && (
                                <p className="mt-1 text-[11px] text-emerald-600">
                                  Donation {donation.id}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 align-top">
                          <p className="max-w-[230px] truncate text-sm font-bold text-slate-800">
                            {getItemName(firstTransaction)}
                          </p>
                          <p className="mt-1 font-mono text-[11px] text-slate-500">
                            SKU: {getItemSku(firstTransaction)}
                          </p>
                          
                        </td>

                        <td className="px-5 py-4 align-top">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${styles.badge}`}
                          >
                            {type}
                          </span>
                          {type === "DONATION" && donation?.donation_status && (
                            <p className="mt-2 text-[10px] font-semibold uppercase text-emerald-600">
                              {donation.donation_status}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4 align-top">
                          <p
                            className={`text-sm font-bold ${styles.quantity}`}
                          >
                            {getQuantityPrefix(type)}
                            {formatNumber(quantity)}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-400">
                            {unit}
                          </p>
                        </td>

                        <td className="max-w-[300px] px-5 py-4 align-top">
                          {type === "DONATION" && donation ? (
                            <>
                              <p className="text-xs font-semibold text-slate-800">
                                Recipient: {getRecipientName(firstTransaction)}
                              </p>
                              {donation.pickup_location && (
                                <p className="mt-1 truncate text-[11px] text-slate-500">
                                  Pickup: {donation.pickup_location}
                                </p>
                              )}
                              {donation.available_until && (
                                <p className="mt-1 text-[11px] text-slate-400">
                                  Available until {formatDateTime(donation.available_until)}
                                </p>
                              )}
                              {(donation.note || firstTransaction.note) && (
                                <p className="mt-1 line-clamp-2 text-[11px] text-slate-500">
                                  {donation.note || firstTransaction.note}
                                </p>
                              )}
                            </>
                          ) : (
                            <p className="line-clamp-2 text-xs text-slate-600">
                              {firstTransaction.note || "No note provided"}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4 align-top">
                          <p className="text-xs font-semibold text-slate-700">
                            {formatDate(group.createdAt)}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-400">
                            {formatTime(group.createdAt)}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-right align-top">
                          <button
                            type="button"
                            onClick={() => setSelectedGroup(group)}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* DETAILS MODAL */}
      {selectedGroup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedGroup(null);
            }
          }}
        >
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* MODAL HEADER */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">
                    Transaction Details
                  </h2>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${getTypeStyle(selectedGroup.transactionType).badge}`}
                  >
                    {selectedGroup.transactionType}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedGroup.saleId
                    ? `Sale ID: ${selectedGroup.saleId}`
                    : `${selectedGroup.transactions.length} transaction record${selectedGroup.transactions.length === 1 ? "" : "s"}`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedGroup(null)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
                aria-label="Close transaction details"
              >
                ×
              </button>
            </div>

            {/* MODAL BODY */}
            <div className="overflow-y-auto px-5 py-5 sm:px-6">
              <div className="space-y-4">
                {selectedGroup.transactions.map((transaction) => {
                  const type = transaction.transaction_type.toUpperCase();
                  const styles = getTypeStyle(type);
                  const donation = getDonationForTransaction(transaction);
                  const inventory = transaction.inventory;

                  return (
                    <div
                      key={transaction.id}
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      {/* RECORD HEADER */}
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Transaction ID
                          </p>
                          <p className="mt-1 font-mono text-sm font-bold text-slate-800">
                            {transaction.id}
                          </p>
                        </div>

                        <span
                          className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${styles.badge}`}
                        >
                          {type}
                        </span>
                      </div>

                      {/* TRANSACTION DETAILS */}
                      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="rounded-lg bg-slate-50 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Quantity
                          </p>
                          <p className={`mt-1 text-sm font-bold ${styles.quantity}`}>
                            {getQuantityPrefix(type)}
                            {formatNumber(transaction.quantity)} {getItemUnit(transaction)}
                          </p>
                        </div>

                        <div className="rounded-lg bg-slate-50 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Inventory ID
                          </p>
                          <p className="mt-1 font-mono text-sm font-semibold text-slate-700">
                            {transaction.inventory_id}
                          </p>
                        </div>

                        <div className="rounded-lg bg-slate-50 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Created At
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-700">
                            {formatDateTime(transaction.created_at)}
                          </p>
                        </div>

                        {transaction.sale_id && (
                          <div className="rounded-lg bg-slate-50 p-3 sm:col-span-2 lg:col-span-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Sale ID
                            </p>
                            <p className="mt-1 break-all font-mono text-sm font-semibold text-slate-700">
                              {transaction.sale_id}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* ITEM INFORMATION */}
                      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Item Information
                            </p>
                            <h3 className="mt-1 text-base font-bold text-slate-900">
                              {getItemName(transaction)}
                            </h3>
                          </div>
                          <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-500 ring-1 ring-slate-200">
                            Inventory {transaction.inventory_id}
                          </span>
                        </div>

                        {inventory ? (
                          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Product
                              </p>
                              <p className="mt-1 text-sm font-bold text-slate-800">
                                {inventory.name}
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                SKU
                              </p>
                              <p className="mt-1 font-mono text-sm font-semibold text-slate-700">
                                {inventory.sku || "—"}
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Unit
                              </p>
                              <p className="mt-1 text-sm font-semibold text-slate-700">
                                {inventory.unit || "—"}
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Category ID
                              </p>
                              <p className="mt-1 text-sm font-semibold text-slate-700">
                                {inventory.category_id ?? "—"}
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Batch Number
                              </p>
                              <p className="mt-1 text-sm font-semibold text-slate-700">
                                {inventory.batch_number || "—"}
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Current Stock
                              </p>
                              <p className="mt-1 text-sm font-semibold text-slate-700">
                                {inventory.quantity !== undefined
                                  ? `${formatNumber(inventory.quantity)} ${inventory.unit}`
                                  : "—"}
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Purchase Date
                              </p>
                              <p className="mt-1 text-sm font-semibold text-slate-700">
                                {formatDate(inventory.purchase_date)}
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Expiry Date
                              </p>
                              <p className="mt-1 text-sm font-semibold text-slate-700">
                                {formatDate(inventory.expiry_date)}
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Inventory Status
                              </p>
                              <p className="mt-1 text-sm font-semibold text-slate-700">
                                {inventory.is_deleted ? "Deleted" : "Active"}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                            <p className="text-xs font-semibold text-amber-800">
                              Detailed inventory information was not returned by the API.
                            </p>
                            <p className="mt-1 text-[11px] leading-5 text-amber-700">
                              Inventory ID: #{transaction.inventory_id}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* DONATION INFORMATION */}
                      {type === "DONATION" && (
                        <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                              ✓
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                  <p className="text-sm font-bold text-emerald-900">
                                    Donation Information
                                  </p>
                                  {donation?.id && (
                                    <p className="mt-1 text-[11px] text-emerald-700">
                                      Donation #{donation.id}
                                    </p>
                                  )}
                                </div>

                                <span className="w-fit rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-700 ring-1 ring-emerald-200">
                                  {getDonationStatus(transaction)}
                                </span>
                              </div>

                              {donation ? (
                                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                  <div className="rounded-lg bg-white/70 p-3">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                                      Recipient / NGO
                                    </p>
                                    <p className="mt-1 text-sm font-bold text-slate-800">
                                      {getRecipientName(transaction)}
                                    </p>
                                  </div>

                                  <div className="rounded-lg bg-white/70 p-3">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                                      Donation Quantity
                                    </p>
                                    <p className="mt-1 text-sm font-bold text-slate-800">
                                      {formatNumber(
                                        donation.quantity ?? transaction.quantity
                                      )}{" "}
                                      {getItemUnit(transaction)}
                                    </p>
                                  </div>

                                  <div className="rounded-lg bg-white/70 p-3">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                                      Committed Quantity
                                    </p>
                                    <p className="mt-1 text-sm font-semibold text-slate-700">
                                      {formatNumber(donation.committed_quantity)} {getItemUnit(transaction)}
                                    </p>
                                  </div>

                                  <div className="rounded-lg bg-white/70 p-3">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                                      Remaining Quantity
                                    </p>
                                    <p className="mt-1 text-sm font-semibold text-slate-700">
                                      {formatNumber(donation.remaining_quantity)} {getItemUnit(transaction)}
                                    </p>
                                  </div>

                                  <div className="rounded-lg bg-white/70 p-3 sm:col-span-2">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                                      Pickup Location
                                    </p>
                                    <p className="mt-1 text-sm font-semibold text-slate-700">
                                      {donation.pickup_location || "Not specified"}
                                    </p>
                                    {(donation.pickup_latitude !== null &&
                                      donation.pickup_latitude !== undefined) &&
                                      (donation.pickup_longitude !== null &&
                                        donation.pickup_longitude !== undefined) && (
                                        <p className="mt-1 font-mono text-[10px] text-slate-400">
                                          {donation.pickup_latitude}, {donation.pickup_longitude}
                                        </p>
                                      )}
                                  </div>

                                  <div className="rounded-lg bg-white/70 p-3">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                                      Available From
                                    </p>
                                    <p className="mt-1 text-sm font-semibold text-slate-700">
                                      {formatDateTime(donation.available_from)}
                                    </p>
                                  </div>

                                  <div className="rounded-lg bg-white/70 p-3">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                                      Available Until
                                    </p>
                                    <p className="mt-1 text-sm font-semibold text-slate-700">
                                      {formatDateTime(donation.available_until)}
                                    </p>
                                  </div>

                                  {donation.receiver_name && (
                                    <div className="rounded-lg bg-white/70 p-3">
                                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                                        Receiver
                                      </p>
                                      <p className="mt-1 text-sm font-semibold text-slate-700">
                                        {donation.receiver_name}
                                      </p>
                                    </div>
                                  )}

                                  {(donation.receiver_contact || donation.pickup_contact) && (
                                    <div className="rounded-lg bg-white/70 p-3">
                                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                                        Pickup Contact
                                      </p>
                                      <p className="mt-1 text-sm font-semibold text-slate-700">
                                        {donation.receiver_contact || donation.pickup_contact}
                                      </p>
                                    </div>
                                  )}

                                  {donation.donated_at && (
                                    <div className="rounded-lg bg-white/70 p-3">
                                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                                        Donated At
                                      </p>
                                      <p className="mt-1 text-sm font-semibold text-slate-700">
                                        {formatDateTime(donation.donated_at)}
                                      </p>
                                    </div>
                                  )}

                                  {donation.note && (
                                    <div className="rounded-lg bg-white/70 p-3 sm:col-span-2">
                                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                                        Donation Note
                                      </p>
                                      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                        {donation.note}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                                  <p className="text-xs font-semibold text-amber-800">
                                    This transaction is marked as a donation, but detailed donation data was not returned by the API.
                                  </p>
                                  <p className="mt-1 text-[11px] leading-5 text-amber-700">
                                    The page can show the donation details automatically once the transaction response contains the related donation object.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* NOTE */}
                      <div className="mt-5 border-t border-slate-100 pt-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Transaction Note
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                          {transaction.note || "No note provided"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-5 py-3 sm:px-6">
              <button
                type="button"
                onClick={() => setSelectedGroup(null)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Transactions;
