import { useEffect, useMemo, useState } from "react";

import type { Transaction } from "../types/transaction";
import { getTransactions } from "../services/transactionApi";
import { getExpiryStatuses } from "../services/expiryApi";

interface TransactionDisplayGroup {
  key: string;
  transactionType: string;
  saleId: string | null;
  transactions: Transaction[];
  createdAt: string;
}


// --------------------------------------------------
// COMPONENT
// --------------------------------------------------

function Transactions() {
  const tenantId = 1;

  // --------------------------------------------------
  // STATE
  // --------------------------------------------------

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expiredCount, setExpiredCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState("NEWEST");


  // --------------------------------------------------
  // LOAD TRANSACTIONS + EXPIRY
  // --------------------------------------------------

  async function loadTransactions() {
    try {
      setLoading(true);
      setError("");

      const [transactionData, expiryData] = await Promise.all([
        getTransactions(tenantId),
        getExpiryStatuses(tenantId),
      ]);

      setTransactions(transactionData);

      // Count currently expired inventory items.
      const expiredItems = expiryData.filter(
        (item) => item.status === "EXPIRED"
      );

      setExpiredCount(expiredItems.length);

    } catch (error) {
      console.error(error);
      setError("Failed to load transaction history.");
    } finally {
      setLoading(false);
    }
  }


  useEffect(() => {
    loadTransactions();
  }, []);


  // --------------------------------------------------
  // TYPE STYLE
  // --------------------------------------------------

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


  // --------------------------------------------------
  // FILTER + SORT
  // --------------------------------------------------

  const filteredTransactions = useMemo(() => {
    const searchValue = search.toLowerCase().trim();

    const filtered = transactions.filter((transaction) => {
      const type = transaction.transaction_type.toUpperCase();

      const matchesType =
        typeFilter === "ALL" || type === typeFilter;

      const matchesSearch =
        !searchValue ||
        String(transaction.id)
          .toLowerCase()
          .includes(searchValue) ||
        String(transaction.inventory_id)
          .toLowerCase()
          .includes(searchValue) ||
        (transaction.sale_id || "")
          .toLowerCase()
          .includes(searchValue) ||
        (transaction.note || "")
          .toLowerCase()
          .includes(searchValue);

      return matchesType && matchesSearch;
    });

    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();

      return sortOrder === "NEWEST"
        ? dateB - dateA
        : dateA - dateB;
    });
  }, [
    transactions,
    search,
    typeFilter,
    sortOrder,
  ]);


  // --------------------------------------------------
  // GROUP TRANSACTIONS
  // --------------------------------------------------

  const groupedTransactions = useMemo<TransactionDisplayGroup[]>(() => {
    const groups: TransactionDisplayGroup[] = [];

    const saleGroups = new Map<string, TransactionDisplayGroup>();

    filteredTransactions.forEach((transaction) => {
      const type = transaction.transaction_type.toUpperCase();

      // ------------------------------------------------
      // POS SALES
      // ------------------------------------------------
      //
      // Transactions having the same sale_id belong
      // to one POS checkout.
      //
      // ------------------------------------------------

      if (type === "SALE" && transaction.sale_id) {
        const existingGroup = saleGroups.get(transaction.sale_id);

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

    // Make sure grouped sales follow the selected sort
    // order based on their checkout time.
    groups.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();

      return sortOrder === "NEWEST"
        ? dateB - dateA
        : dateA - dateB;
    });

    return groups;
  }, [filteredTransactions, sortOrder]);


  // --------------------------------------------------
  // SUMMARY
  // --------------------------------------------------

  const saleCount = useMemo(() => {
    const saleIds = new Set<string>();
    let individualSales = 0;

    transactions.forEach((transaction) => {
      if (
        transaction.transaction_type.toUpperCase() === "SALE"
      ) {
        if (transaction.sale_id) {
          saleIds.add(transaction.sale_id);
        } else {
          individualSales++;
        }
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


  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

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


  // --------------------------------------------------
  // UI
  // --------------------------------------------------

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
              Track all inventory stock movements.
            </p>

          </div>

        </div>


        {/* ERROR */}

        {error && (
          <div className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">

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


        {/* SUMMARY CARDS */}

        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">

          {/* TOTAL */}

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


          {/* SALES */}

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


          {/* PURCHASES */}

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


          {/* DONATIONS */}

          <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">

            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">
              Donations
            </p>

            <p className="mt-2 text-2xl font-bold text-emerald-700">
              {donationCount}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Items donated
            </p>

          </div>


          {/* WASTE / EXPIRED */}

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


        {/* FILTERS */}

        <div className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="grid gap-4 p-5 md:grid-cols-3">

            {/* SEARCH */}

            <div>

              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Search
              </label>

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Transaction ID, inventory ID, sale ID, note..."
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />

            </div>


            {/* TYPE */}

            <div>

              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Transaction Type
              </label>

              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >

                <option value="ALL">
                  All Transactions
                </option>

                <option value="SALE">
                  Sales
                </option>

                <option value="PURCHASE">
                  Purchases
                </option>

                <option value="DONATION">
                  Donations
                </option>

              </select>

            </div>


            {/* SORT */}

            <div>

              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Sort By
              </label>

              <select
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >

                <option value="NEWEST">
                  Newest First
                </option>

                <option value="OLDEST">
                  Oldest First
                </option>

              </select>

            </div>

          </div>


          {/* FILTER FOOTER */}

          <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">

            <p className="text-xs text-slate-500">

              Showing{" "}

              <span className="font-semibold text-slate-700">
                {groupedTransactions.length}
              </span>{" "}

              of{" "}

              <span className="font-semibold text-slate-700">
                {transactions.length}
              </span>{" "}

              transaction groups

            </p>


            {(search || typeFilter !== "ALL") && (

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setTypeFilter("ALL");
                }}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
              >
                Clear Filters
              </button>

            )}

          </div>

        </div>


        {/* TABLE */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          {transactions.length === 0 ? (

            /* EMPTY */

            <div className="p-14 text-center">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl text-slate-400">
                ↔
              </div>

              <h2 className="mt-4 text-base font-semibold text-slate-900">
                No transactions found
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Inventory transactions will appear here once they are created.
              </p>

            </div>

          ) : groupedTransactions.length === 0 ? (

            /* NO FILTER RESULTS */

            <div className="p-14 text-center">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-400">
                🔍
              </div>

              <h2 className="mt-4 text-base font-semibold text-slate-900">
                No matching transactions
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Try changing your search or transaction type.
              </p>

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setTypeFilter("ALL");
                }}
                className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Clear Filters
              </button>

            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full min-w-[1000px] text-left">

                {/* TABLE HEADER */}

                <thead className="border-b border-slate-200 bg-slate-50">

                  <tr>

                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Transaction
                    </th>

                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Inventory
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

                  </tr>

                </thead>


                {/* TABLE BODY */}

                <tbody className="divide-y divide-slate-100">

                  {groupedTransactions.map((group) => {

                    const styles = getTypeStyle(
                      group.transactionType
                    );

                    const isSale =
                      group.transactionType === "SALE" &&
                      group.saleId !== null;


                    // ------------------------------------------------
                    // POS SALE GROUP
                    // ------------------------------------------------

                    if (isSale) {

                      const firstTransaction =
                        group.transactions[0];

                      const totalQuantity =
                        group.transactions.reduce(
                          (sum, transaction) =>
                            sum + transaction.quantity,
                          0
                        );

                      return (
                        <tr
                          key={group.key}
                          className="transition hover:bg-slate-50"
                        >

                          {/* Transaction */}

                          <td className="px-5 py-4">

                            <p className="font-mono text-sm font-bold text-slate-800">
                              {group.saleId}
                            </p>

                            <p className="mt-0.5 text-[10px] text-slate-400">
                              {group.transactions.length} item{" "}
                              {group.transactions.length === 1
                                ? "line"
                                : "lines"}
                            </p>

                          </td>


                          {/* Inventory */}

                          <td className="px-5 py-4">

                            <div className="space-y-1.5">

                              {group.transactions.map(
                                (transaction) => (
                                  <div
                                    key={transaction.id}
                                    className="flex items-center justify-between gap-4"
                                  >

                                    <span className="text-sm font-semibold text-slate-700">
                                      {transaction.inventory_id}
                                    </span>

                                    <span className="text-xs text-slate-400">
                                      Inventory ID
                                    </span>

                                  </div>
                                )
                              )}

                            </div>

                          </td>


                          {/* Type */}

                          <td className="px-5 py-4">

                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${styles.badge}`}
                            >
                              SALE
                            </span>

                          </td>


                          {/* Quantity */}

                          <td className="px-5 py-4">

                            <div className="space-y-1.5">

                              {group.transactions.map(
                                (transaction) => (
                                  <div
                                    key={transaction.id}
                                    className={`text-sm font-bold ${styles.quantity}`}
                                  >
                                    −{transaction.quantity}
                                  </div>
                                )
                              )}

                              <p className="border-t border-slate-100 pt-1 text-[10px] font-semibold text-slate-400">
                                Total: −{totalQuantity}
                              </p>

                            </div>

                          </td>


                          {/* Note */}

                          <td className="max-w-sm px-5 py-4">

                            <p className="truncate text-xs text-slate-600">
                              {firstTransaction.note ||
                                "POS Checkout Batch Sale"}
                            </p>

                          </td>


                          {/* Date */}

                          <td className="whitespace-nowrap px-5 py-4">

                            <p className="text-xs font-medium text-slate-700">
                              {new Date(
                                group.createdAt
                              ).toLocaleDateString(undefined, {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </p>

                            <p className="mt-0.5 text-[10px] text-slate-400">
                              {new Date(
                                group.createdAt
                              ).toLocaleTimeString(undefined, {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>

                          </td>

                        </tr>
                      );
                    }


                    // ------------------------------------------------
                    // NORMAL INDIVIDUAL TRANSACTION
                    // ------------------------------------------------

                    const transaction =
                      group.transactions[0];

                    return (
                      <tr
                        key={group.key}
                        className="transition hover:bg-slate-50"
                      >

                        {/* Transaction */}

                        <td className="px-5 py-4">

                          <p className="font-mono text-sm font-bold text-slate-800">
                            {transaction.id}
                          </p>

                          <p className="mt-0.5 text-[10px] text-slate-400">
                            Transaction
                          </p>

                        </td>


                        {/* Inventory */}

                        <td className="px-5 py-4">

                          <p className="font-mono text-sm font-semibold text-slate-700">
                            {transaction.inventory_id}
                          </p>

                          <p className="mt-0.5 text-[10px] text-slate-400">
                            Inventory ID
                          </p>

                        </td>


                        {/* Type */}

                        <td className="px-5 py-4">

                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${styles.badge}`}
                          >
                            {transaction.transaction_type}
                          </span>

                        </td>


                        {/* Quantity */}

                        <td className="px-5 py-4">

                          <span
                            className={`text-sm font-bold ${styles.quantity}`}
                          >

                            {transaction.transaction_type.toUpperCase() ===
                              "SALE" ||
                            transaction.transaction_type.toUpperCase() ===
                              "WASTE"
                              ? "−"
                              : "+"}

                            {transaction.quantity}

                          </span>

                        </td>


                        {/* Note */}

                        <td className="max-w-sm px-5 py-4">

                          <p className="truncate text-xs text-slate-600">
                            {transaction.note ||
                              "No note provided"}
                          </p>

                        </td>


                        {/* Date */}

                        <td className="whitespace-nowrap px-5 py-4">

                          <p className="text-xs font-medium text-slate-700">
                            {new Date(
                              transaction.created_at
                            ).toLocaleDateString(undefined, {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>

                          <p className="mt-0.5 text-[10px] text-slate-400">
                            {new Date(
                              transaction.created_at
                            ).toLocaleTimeString(undefined, {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>

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

    </div>
  );
}


export default Transactions;
