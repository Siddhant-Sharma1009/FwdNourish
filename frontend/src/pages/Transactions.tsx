import { useEffect, useMemo, useState } from "react";
import type { Transaction } from "../types/transaction";
import { getTransactions } from "../services/transactionApi";
import { getExpiryStatuses } from "../services/expiryApi";

// Transaction already includes the nested `inventory` and `donation` objects.
type TransactionWithDetails = Transaction;

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

      setTransactions(transactionData);

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
      donation?.ngo_name ||
      donation?.recipient_name ||
      (donation?.ngo_id ? `NGO #${donation.ngo_id}` : "Recipient not specified")
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

  function getDayLabel(date?: string | null) {
    if (!date) return "Unknown date";

    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return "Unknown date";

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (parsed.toDateString() === today.toDateString()) return "Today";
    if (parsed.toDateString() === yesterday.toDateString()) return "Yesterday";

    return formatDate(date);
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
        transaction.donation_id,
        transaction.note,
        transaction.inventory?.name,
        transaction.inventory?.sku,
        transaction.inventory?.batch_number,
        transaction.inventory?.category_id,
        donation?.id,
        donation?.recipient_name,
        donation?.ngo_id,
        donation?.ngo_name,
        donation?.ngo_contact_name,
        donation?.ngo_contact_phone,
        donation?.ngo_contact_email,
        donation?.pickup_location,
        donation?.donation_status,
        donation?.pickup_notes,
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

  // Mobile list: group display groups under day headings
  const mobileSections: { label: string; groups: TransactionDisplayGroup[] }[] = [];
  groupedTransactions.forEach((group) => {
    const label = getDayLabel(group.createdAt);
    const last = mobileSections[mobileSections.length - 1];
    if (last && last.label === label) {
      last.groups.push(group);
    } else {
      mobileSections.push({ label, groups: [group] });
    }
  });

  return (
    <div className="min-h-screen bg-slate-100 p-4 pb-28 sm:p-2">
      <div className="mx-auto w-full max-w-7xl">

        <header className="mb-3 px-1 pb-0 pt-3 sm:pt-0 md:mb-0">
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl ">
              Transaction{" "}
              <span className="bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
                History
              </span>
            </h2>
          </div>

          <p className="mt-1 max-w-xxl text-sm text-slate-600 sm:text-base dark:text-slate-400">
            Track sales, purchases, donations, waste, and other inventory movements.
          </p>

          {/* Styled divider */}
          <div className="relative mb-4 mt-4 hidden sm:mb-6 sm:mt-5 md:block">
            <div className="h-px w-full bg-gradient-to-r from-slate-300 via-slate-200 to-transparent dark:from-slate-600 dark:via-slate-700" />
            <div className="absolute left-0 top-0 h-[2px] w-16 -translate-y-1/2 rounded-full bg-gradient-to-r from-amber-500 to-orange-600" />
          </div>
        </header>



        {/* ERROR */}
        {error && (
          <div className="mb-5 flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 md:rounded-xl">
            <p className="text-sm font-medium text-rose-700">
              {error}
            </p>

            <button
              type="button"
              onClick={loadTransactions}
              className="shrink-0 text-xs font-bold text-rose-700 hover:text-rose-900"
            >
              Retry
            </button>
          </div>
        )}

        {/* SUMMARY (mobile hero card) */}
        <div className="mb-4 rounded-3xl bg-gradient-to-br from-emerald-600 to-emerald-800 p-5 text-white shadow-lg md:hidden">
          <p className="text-xs font-medium text-emerald-100">Total transactions</p>
          <p className="mt-1 text-4xl font-bold tracking-tight">
            {transactions.length}
          </p>
          <p className="text-xs text-emerald-100">Transaction records</p>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {[
              { label: "Sales", value: saleCount, dot: "bg-rose-300" },
              { label: "Purchases", value: purchaseCount, dot: "bg-blue-300" },
              { label: "Donations", value: donationCount, dot: "bg-emerald-300" },
              { label: "Waste", value: expiredCount, dot: "bg-orange-300" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl bg-white/10 px-2 py-3 text-center"
              >
                <span className={`mx-auto mb-1.5 block h-1.5 w-1.5 rounded-full ${item.dot}`} />
                <p className="text-lg font-bold leading-none">{item.value}</p>
                <p className="mt-1 text-[10px] text-emerald-100">{item.label}</p>
              </div>
            ))}
          </div>

          <p className="mt-3 text-[11px] text-emerald-100">
            {formatNumber(donatedQuantity)} units donated · {expiredCount} expired items
          </p>
        </div>

        {/* SUMMARY CARDS (desktop) */}
        <div className="mb-6 hidden grid-cols-2 gap-3 md:grid lg:grid-cols-5">
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

            <p className="mt-1 text-xs text-slate-500">
              POS sales
            </p>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500">
              Purchases
            </p>

            <p className="mt-2 text-2xl font-bold text-blue-700">
              {purchaseCount}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Stock received
            </p>
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

            <p className="mt-1 text-xs text-slate-500">
              Expired items
            </p>
          </div>
        </div>

        {/* MOBILE FILTERS: search + type chips + sort */}
        <div className="sticky top-0 z-20 -mx-4 mb-3 bg-slate-100/90 px-4 pb-2 pt-1 backdrop-blur md:hidden">
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              🔍
            </span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search item, SKU, NGO, note..."
              className="h-12 w-full rounded-2xl border-0 bg-white pl-11 pr-4 text-base text-slate-800 shadow-sm outline-none ring-1 ring-slate-200 transition placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="mt-2 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[
              { value: "ALL", label: "All" },
              { value: "SALE", label: "Sales" },
              { value: "PURCHASE", label: "Purchases" },
              { value: "DONATION", label: "Donations" },
              { value: "WASTE", label: "Waste" },
              { value: "ADJUSTMENT", label: "Adjustments" },
            ].map((chip) => (
              <button
                key={chip.value}
                type="button"
                onClick={() => setTypeFilter(chip.value)}
                className={`min-h-[38px] shrink-0 rounded-full px-4 text-sm font-semibold transition active:scale-95 ${
                  typeFilter === chip.value
                    ? "bg-slate-900 text-white shadow"
                    : "bg-white text-slate-600 ring-1 ring-slate-200"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>
               
              {filteredTransactions.length} record
              {filteredTransactions.length === 1 ? "" : "s"}
            </span>

            <button
              type="button"
              onClick={() =>
                setSortOrder(sortOrder === "NEWEST" ? "OLDEST" : "NEWEST")
              }
              className="rounded-full bg-white px-3 py-1.5 font-semibold text-slate-600 ring-1 ring-slate-200 active:bg-slate-100"
            >
              {sortOrder === "NEWEST" ? "Newest first ↓" : "Oldest first ↑"}
            </button>
          </div>
        </div>

        {/* FILTERS (desktop) */}
        <div className="mb-5 hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
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

        {/* MOBILE TRANSACTION LIST (grouped by day, tap a row for details) */}
        <div className="space-y-5 md:hidden">
          {groupedTransactions.length === 0 && (
            <div className="rounded-3xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-slate-200/70">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-400">
                ↔
              </div>
              <h3 className="mt-4 text-sm font-bold text-slate-800">
                No transactions found
              </h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                No transaction matches the selected filters.
              </p>
            </div>
          )}

          {mobileSections.map((section) => (
            <section key={section.label}>
              <h3 className="mb-2 px-2 text-xs font-semibold text-slate-500">
                {section.label}
              </h3>

              <div className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/70">
                {section.groups.map((group) => {
                  const firstTransaction = group.transactions[0];
                  const type = group.transactionType;
                  const styles = getTypeStyle(type);
                  const donation = getDonationForTransaction(firstTransaction);
                  const typeLabel =
                    type.charAt(0) + type.slice(1).toLowerCase();

                  const subtitle =
                    type === "DONATION" && donation
                      ? `Donation to ${getRecipientName(firstTransaction)}`
                      : group.saleId
                        ? `Sale #${group.saleId}${
                            group.transactions.length > 1
                              ? ` · ${group.transactions.length} records`
                              : ""
                          }`
                        : `${typeLabel} · ${
                            firstTransaction.note || getItemSku(firstTransaction)
                          }`;

                  return (
                    <button
                      key={group.key}
                      type="button"
                      onClick={() => setSelectedGroup(group)}
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition active:bg-slate-50"
                    >
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-lg font-bold ${styles.badge}`}
                      >
                        {type === "DONATION"
                          ? "🎁"
                          : type === "SALE"
                            ? "₹"
                            : type === "PURCHASE"
                              ? "+"
                              : "↔"}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-semibold text-slate-900">
                          {getItemName(firstTransaction)}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {subtitle}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className={`text-[15px] font-bold ${styles.quantity}`}>
                          {getQuantityPrefix(type)}
                          {formatNumber(getGroupQuantity(group))}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {getGroupUnit(group)} · {formatTime(group.createdAt)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {/* TABLE */}
        <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
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
                      Note
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
                    const donation =
                      getDonationForTransaction(firstTransaction);

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

                              {type === "DONATION" &&
                                (donation?.id ||
                                  firstTransaction.donation_id) && (
                                  <p className="mt-1 text-[11px] text-emerald-600">
                                    Donation #
                                    {donation?.id ??
                                      firstTransaction.donation_id}
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
                          {type === "DONATION" ? (
                            donation ? (
                              <>
                                <p className="text-xs font-semibold text-slate-800">
                                  NGO: {getRecipientName(firstTransaction)}
                                </p>

                                {donation.ngo_contact_name && (
                                  <p className="mt-1 truncate text-[11px] text-slate-500">
                                    Contact: {donation.ngo_contact_name}
                                  </p>
                                )}

                                {donation.ngo_contact_phone && (
                                  <p className="mt-1 truncate text-[11px] text-slate-500">
                                    Phone: {donation.ngo_contact_phone}
                                  </p>
                                )}

                                {donation.pickup_location && (
                                  <p className="mt-1 truncate text-[11px] text-slate-500">
                                    Pickup: {donation.pickup_location}
                                  </p>
                                )}
                              </>
                            ) : (
                              <div>
                                <p className="text-xs font-semibold text-amber-700">
                                  Donation recorded
                                </p>

                                <p className="mt-1 text-[11px] text-slate-500">
                                  Donation ID:{" "}
                                  {firstTransaction.donation_id ?? "—"}
                                </p>

                                <p className="mt-1 text-[10px] text-amber-600">
                                  NGO details were not returned by the API.
                                </p>
                              </div>
                            )
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

      {/* DETAILS MODAL (mobile: bottom sheet · desktop: centered dialog) */}
      {selectedGroup && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 md:items-center md:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedGroup(null);
            }
          }}
        >
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl md:rounded-2xl">

            {/* Mobile sheet handle */}
            <div className="flex justify-center pt-2 md:hidden">
              <span className="h-1.5 w-10 rounded-full bg-slate-300" />
            </div>

            {/* MODAL HEADER */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">
                    Transaction Details
                  </h2>

                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${getTypeStyle(
                      selectedGroup.transactionType
                    ).badge}`}
                  >
                    {selectedGroup.transactionType}
                  </span>
                </div>

              </div>

              <button
                type="button"
                onClick={() => setSelectedGroup(null)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800 md:h-8 md:w-8 md:rounded-lg"
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

                          <p
                            className={`mt-1 text-sm font-bold ${styles.quantity}`}
                          >
                            {getQuantityPrefix(type)}
                            {formatNumber(transaction.quantity)}{" "}
                            {getItemUnit(transaction)}
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



                        {transaction.donation_id && (
                          <div className="rounded-lg bg-emerald-50 p-3 sm:col-span-2 lg:col-span-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                              Donation ID
                            </p>

                            <p className="mt-1 font-mono text-sm font-semibold text-emerald-800">
                              {transaction.donation_id}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* ITEM INFORMATION */}
                      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>


                            <h2 className="mt-1 text-base font-bold text-slate-900">
                              Item Information
                            </h2>
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
                                {inventory.quantity !== undefined &&
                                  inventory.quantity !== null
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
                              Inventory ID: {transaction.inventory_id}
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

                                  <p className="mt-1 text-[11px] text-emerald-700">
                                    Donation
                                    {donation?.id ??
                                      transaction.donation_id ??
                                      "—"}
                                  </p>
                                </div>

                                <span className="w-fit rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-700 ring-1 ring-emerald-200">
                                  {getDonationStatus(transaction)}
                                </span>
                              </div>

                              {/* IMPORTANT:
                                  Always show NGO section for DONATION.
                                  Previously this was hidden when all NGO fields
                                  were empty. */}
                              <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-4">
                                <div className="flex items-start gap-3">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-lg">
                                    🏢
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                                      Recipient NGo
                                    </p>

                                    <p className="mt-1 text-base font-bold text-slate-900">
                                      {donation?.ngo_name}
                                    </p>
                                  </div>
                                </div>

                                {donation && (
                                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div className="rounded-lg bg-slate-50 p-3">
                                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Contact Person
                                      </p>

                                      <p className="mt-1 text-sm font-semibold text-slate-800">
                                        {donation.ngo_contact_name || "Not available"}
                                      </p>
                                    </div>

                                    {/* PHONE */}
                                    <div className="rounded-lg bg-slate-50 p-3">
                                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Phone
                                      </p>

                                      {donation.ngo_contact_phone ? (
                                        <a
                                          href={`tel:${donation.ngo_contact_phone}`}
                                          className="mt-1 block text-sm font-semibold text-emerald-700 hover:underline"
                                        >
                                          {donation.ngo_contact_phone}
                                        </a>
                                      ) : (
                                        <p className="mt-1 text-sm font-semibold text-slate-800">
                                          Not available
                                        </p>
                                      )}
                                    </div>

                                    {/* EMAIL */}
                                    <div className="rounded-lg bg-slate-50 p-3 sm:col-span-2">
                                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Email
                                      </p>

                                      {donation.ngo_contact_email ? (
                                        <a
                                          href={`mailto:${donation.ngo_contact_email}`}
                                          className="mt-1 block break-all text-sm font-semibold text-emerald-700 hover:underline"
                                        >
                                          {donation.ngo_contact_email}
                                        </a>
                                      ) : (
                                        <p className="mt-1 text-sm font-semibold text-slate-800">
                                          Not available
                                        </p>
                                      )}
                                    </div>

                                    {/* NGO NOTES */}
                                    <div className="rounded-lg bg-slate-50 p-3 sm:col-span-2">
                                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        NGO Notes
                                      </p>

                                      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800">
                                        {donation.pickup_notes ||
                                          "No notes from the NGO"}
                                      </p>
                                    </div>

                                    {/* SCHEDULED PICKUP */}
                                    {(donation.pickup_scheduled_start ||
                                      donation.pickup_scheduled_end) && (
                                        <div className="rounded-lg bg-slate-50 p-3 sm:col-span-2">
                                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            Scheduled Pickup
                                          </p>

                                          <p className="mt-1 text-sm font-semibold text-slate-800">
                                            {formatDateTime(
                                              donation.pickup_scheduled_start
                                            )}{" "}
                                            –{" "}
                                            {formatDateTime(
                                              donation.pickup_scheduled_end
                                            )}
                                          </p>
                                        </div>
                                      )}
                                  </div>
                                )}
                              </div>

                              {/* DONATION DETAILS */}
                              {donation ? (
                                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                  <div className="rounded-lg bg-white/70 p-3">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                                      Donation Quantity
                                    </p>

                                    <p className="mt-1 text-sm font-bold text-slate-800">
                                      {formatNumber(
                                        donation.quantity ??
                                        transaction.quantity
                                      )}{" "}
                                      {getItemUnit(transaction)}
                                    </p>
                                  </div>

                                  <div className="rounded-lg bg-white/70 p-3">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                                      Committed Quantity
                                    </p>

                                    <p className="mt-1 text-sm font-semibold text-slate-700">
                                      {formatNumber(
                                        donation.committed_quantity
                                      )}{" "}
                                      {getItemUnit(transaction)}
                                    </p>
                                  </div>

                                  <div className="rounded-lg bg-white/70 p-3">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                                      Remaining Quantity
                                    </p>

                                    <p className="mt-1 text-sm font-semibold text-slate-700">
                                      {formatNumber(
                                        donation.remaining_quantity
                                      )}{" "}
                                      {getItemUnit(transaction)}
                                    </p>
                                  </div>

                                  {donation.donated_at && (
                                    <div className="rounded-lg bg-white/70 p-3">
                                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                                        Donated At
                                      </p>

                                      <p className="mt-1 text-sm font-semibold text-slate-700">
                                        {formatDateTime(
                                          donation.donated_at
                                        )}
                                      </p>
                                    </div>
                                  )}

                                  <div className="rounded-lg bg-white/70 p-3 sm:col-span-2">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                                      Pickup Location
                                    </p>

                                    <p className="mt-1 text-sm font-semibold text-slate-700">
                                      {donation.pickup_location ||
                                        "Not specified"}
                                    </p>

                                    {donation.pickup_latitude !== null &&
                                      donation.pickup_latitude !== undefined &&
                                      donation.pickup_longitude !== null &&
                                      donation.pickup_longitude !== undefined && (
                                        <p className="mt-1 font-mono text-[10px] text-slate-400">
                                          {donation.pickup_latitude},{" "}
                                          {donation.pickup_longitude}
                                        </p>
                                      )}
                                  </div>




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
                                    This transaction is marked as a donation,
                                    but detailed donation data was not returned
                                    by the API.
                                  </p>

                                  <p className="mt-1 text-[11px] leading-5 text-amber-700">
                                    Donation ID:{" "}
                                    {transaction.donation_id ?? "Not available"}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}


                    </div>
                  );
                })}
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 md:pb-3">
              <button
                type="button"
                onClick={() => setSelectedGroup(null)}
                className="min-h-[44px] w-full rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 md:min-h-0 md:w-auto"
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