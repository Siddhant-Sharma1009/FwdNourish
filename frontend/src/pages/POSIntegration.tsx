import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import QRBarcodeScanner from "../components/common/QRBarcodeScanner";
import { useAuth } from "../context/AuthContext";

import type { Inventory } from "../types/inventory";
import { getInventoryBySku, getInventory } from "../services/inventoryApi";
import { createTransaction } from "../services/transactionApi";

interface CartItem {
  item: Inventory;
  quantity: number;
}

/** true when viewport >= lg (1024px) */
function useIsDesktop() {
  const query = "(min-width: 1024px)";
  const [matches, setMatches] = useState(
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return matches;
}

export default function PosTerminal() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id;
  const isDesktop = useIsDesktop();

  const [inventoryList, setInventoryList] = useState<Inventory[]>([]);
  const [itemSearch, setItemSearch] = useState("");
  const [checkingSku, setCheckingSku] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [searchParams] = useSearchParams();

  useEffect(() => {
    async function loadInventory() {
      if (!tenantId) {
        setInventoryList([]);
        return;
      }
      try {
        const items = await getInventory();
        setInventoryList(items);
      } catch (err) {
        console.error("Failed to fetch inventory", err);
        setError("Failed to load inventory.");
      }
    }
    loadInventory();
  }, [tenantId]);

  useEffect(() => {
    const inventoryIdParam = searchParams.get("inventoryId");
    const nameParam = searchParams.get("name");

    if (!inventoryIdParam && !nameParam) return;
    if (inventoryList.length === 0) return;

    const requestedId = inventoryIdParam ? Number(inventoryIdParam) : NaN;

    const selected =
      (!Number.isNaN(requestedId)
        ? inventoryList.find((item) => item.id === requestedId)
        : undefined) ??
      (nameParam
        ? inventoryList.find(
            (item) =>
              item.name.toLowerCase() === nameParam.trim().toLowerCase()
          )
        : undefined);

    if (!selected) {
      setError(`The selected inventory item could not be found.`);
      return;
    }
    if (Number(selected.quantity) <= 0) {
      setError(`"${selected.name}" has no available stock.`);
      return;
    }

    setItemSearch(selected.name);
    setCart((previousCart) => {
      if (previousCart.some((c) => c.item.id === selected.id)) {
        return previousCart;
      }
      return [...previousCart, { item: selected, quantity: 1 }];
    });
  }, [inventoryList, searchParams]);

  function addItemToCart(inventory: Inventory, defaultQty = 1) {
    setError("");
    setMessage("");

    setCart((previousCart) => {
      const existingIndex = previousCart.findIndex(
        (c) => c.item.id === inventory.id
      );

      if (existingIndex !== -1) {
        const existing = previousCart[existingIndex];
        const newQty = existing.quantity + defaultQty;

        if (newQty > inventory.quantity) {
          setError(
            `Cannot add more than available stock (${inventory.quantity} ${inventory.unit}).`
          );
          return previousCart;
        }
        const updatedCart = [...previousCart];
        updatedCart[existingIndex] = { ...existing, quantity: newQty };
        return updatedCart;
      }

      if (defaultQty > inventory.quantity) {
        setError(`Item "${inventory.name}" is out of stock.`);
        return previousCart;
      }
      return [...previousCart, { item: inventory, quantity: defaultQty }];
    });
  }

  async function handleItemSearch(searchValue: string) {
    const query = searchValue.trim();
    if (!query) return;

    if (!tenantId) {
      setError("Tenant information is not available. Please log in again.");
      return;
    }

    setError("");

    try {
      setCheckingSku(true);
      const inventory = await getInventoryBySku(query);
      addItemToCart(inventory, 1);
      setItemSearch("");
      return;
    } catch {
      // Not an exact SKU — fall back to local search.
    } finally {
      setCheckingSku(false);
    }

    const normalizedQuery = query.toLowerCase();
    const matches = inventoryList.filter(
      (item) =>
        item.name.toLowerCase().includes(normalizedQuery) ||
        item.sku.toLowerCase().includes(normalizedQuery)
    );

    if (matches.length === 1) {
      addItemToCart(matches[0], 1);
      setItemSearch("");
    } else if (matches.length === 0) {
      setError(`No item found for "${query}".`);
    }
  }

  function handleScanSuccess(decodedText: string) {
    handleItemSearch(decodedText);
  }

  function handleSearchSelect(inventory: Inventory) {
    addItemToCart(inventory, 1);
    setItemSearch("");
  }

  const searchResults = itemSearch.trim()
    ? inventoryList
        .filter((item) => {
          const q = itemSearch.trim().toLowerCase();
          return (
            item.name.toLowerCase().includes(q) ||
            item.sku.toLowerCase().includes(q)
          );
        })
        .slice(0, 8)
    : [];

  function updateCartQuantity(inventoryId: number, newQuantity: number) {
    if (newQuantity <= 0) {
      removeFromCart(inventoryId);
      return;
    }
    setCart((previousCart) =>
      previousCart.map((cartItem) => {
        if (cartItem.item.id !== inventoryId) return cartItem;
        if (newQuantity > cartItem.item.quantity) {
          setError(
            `Stock limit reached for ${cartItem.item.name} (${cartItem.item.quantity} available).`
          );
          return cartItem;
        }
        return { ...cartItem, quantity: newQuantity };
      })
    );
    setError("");
  }

  function removeFromCart(inventoryId: number) {
    setCart((previousCart) =>
      previousCart.filter((c) => c.item.id !== inventoryId)
    );
  }

  function clearCart() {
    setCart([]);
  }

  async function handleCompleteSale() {
    if (cart.length === 0) {
      setError("Sale list is empty. Add items first.");
      return;
    }
    if (!tenantId) {
      setError("Tenant information is not available. Please log in again.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");

      await Promise.all(
        cart.map((c) =>
          createTransaction({
            tenant_id: tenantId,
            inventory_id: c.item.id,
            transaction_type: "SALE",
            quantity: c.quantity,
            note: "POS Checkout Batch Sale",
          })
        )
      );

      const totalUnits = cart.reduce((sum, i) => sum + i.quantity, 0);
      setMessage(
        `Sale completed! ${totalUnits} unit(s) across ${cart.length} item line(s).`
      );
      clearCart();
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.detail ||
          "Failed to process sale transaction. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const totalItemsCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="min-h-full bg-slate-100">
      {/* ===== APP BAR (mobile: sticky, compact) ===== */}
      <header
        className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 pb-3 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:px-2 lg:pb-0 lg:pt-0 lg:backdrop-blur-none"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight text-slate-900 lg:text-3xl">
              Sale{" "}
              <span className="bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
                Terminal
              </span>
            </h1>
            <p className="mt-0.5 hidden text-sm text-slate-600 sm:block lg:text-base">
              Scan or search items and complete the sale.
            </p>
          </div>

          {/* Scan toggle (mobile / tablet only) */}
          <button
            type="button"
            onClick={() => setShowScanner((s) => !s)}
            aria-pressed={showScanner}
            className={`flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold transition active:scale-95 lg:hidden ${
              showScanner
                ? "bg-slate-900 text-white"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            <span aria-hidden>{showScanner ? "✕" : "▦"}</span>
            {showScanner ? "Close" : "Scan"}
          </button>
        </div>

        <div className="relative mt-5 hidden lg:block">
          <div className="h-px w-full bg-gradient-to-r from-slate-300 via-slate-200 to-transparent" />
          <div className="absolute left-0 top-0 h-[2px] w-16 -translate-y-1/2 rounded-full bg-gradient-to-r from-amber-500 to-orange-600" />
        </div>
      </header>

      {/* ===== TOASTS ===== */}
      {(message || error) && (
        <div
          className="sticky top-[calc(env(safe-area-inset-top)+4.25rem)] z-20 space-y-2 px-3 pt-3 lg:static lg:px-2 lg:pt-4"
          role="status"
        >
          {message && (
            <div className="flex items-start justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm font-semibold text-emerald-800 shadow-sm lg:rounded-xl">
              <span>✓ {message}</span>
              <button
                onClick={() => setMessage("")}
                className="-m-2 shrink-0 p-2 text-xs text-emerald-600"
              >
                Dismiss
              </button>
            </div>
          )}
          {error && (
            <div className="flex items-start justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-sm font-medium text-rose-700 shadow-sm lg:rounded-xl">
              <span>⚠️ {error}</span>
              <button
                onClick={() => setError("")}
                className="-m-2 shrink-0 p-2 text-xs text-rose-500"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===== CONTENT ===== */}
      <main
        className="mx-auto max-w-7xl px-3 pt-3 lg:px-2 lg:pt-4"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 7.5rem)" }}
      >
        <div className="grid gap-3 lg:grid-cols-12 lg:gap-6">
          {/* LEFT: search + scanner */}
          <div className="flex flex-col gap-3 lg:col-span-7 lg:gap-5">
            {/* SEARCH */}
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:rounded-2xl lg:p-5">
              <h2 className="text-sm font-bold text-slate-900">Add items</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Search by name, SKU or barcode.
              </p>

              <div className="mt-3 flex gap-2">
                <input
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleItemSearch(itemSearch);
                    }
                  }}
                  type="search"
                  enterKeyHint="search"
                  autoComplete="off"
                  autoCapitalize="none"
                  placeholder="Search item, SKU or barcode"
                  aria-label="Search item"
                  className="h-12 min-w-0 flex-1 rounded-2xl border border-slate-300 bg-slate-50 px-4 text-base outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 lg:h-10 lg:rounded-xl lg:px-3 lg:text-sm"
                />
                <button
                  type="button"
                  onClick={() => handleItemSearch(itemSearch)}
                  disabled={checkingSku || !itemSearch.trim()}
                  className="h-12 shrink-0 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white transition active:scale-95 disabled:opacity-40 lg:h-10 lg:rounded-xl lg:px-4 lg:text-xs lg:active:scale-100"
                >
                  {checkingSku ? "…" : "Add"}
                </button>
              </div>

              {/* Results: inline list (never clipped by the screen edge) */}
              {searchResults.length > 0 && (
                <ul className="mt-3 max-h-72 overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white lg:rounded-xl">
                  {searchResults.map((item) => (
                    <li key={item.id} className="border-b border-slate-100 last:border-b-0">
                      <button
                        type="button"
                        onClick={() => handleSearchSelect(item)}
                        disabled={item.quantity <= 0}
                        className="flex min-h-[60px] w-full items-center justify-between gap-3 px-4 py-3 text-left active:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 lg:hover:bg-slate-50"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {item.name}
                          </p>
                          <p className="truncate font-mono text-xs text-slate-400">
                            SKU: {item.sku}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            item.quantity <= 0
                              ? "bg-rose-50 text-rose-600"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {item.quantity <= 0
                            ? "Out of stock"
                            : `${item.quantity} ${item.unit}`}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* SCANNER: collapsible on mobile, always on desktop */}
            {(isDesktop || showScanner) && (
              <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:rounded-2xl lg:p-5">
                <h2 className="mb-1 text-sm font-bold text-slate-900">
                  Barcode scanner
                </h2>
                <p className="mb-3 text-xs text-slate-500">
                  Point the camera at a QR code or barcode.
                </p>
                <div className="overflow-hidden rounded-2xl [&_video]:w-full [&_video]:object-cover">
                  <QRBarcodeScanner onScan={handleScanSuccess} />
                </div>
              </section>
            )}
          </div>

          {/* RIGHT: cart */}
          <div className="lg:col-span-5">
            <section className="rounded-3xl border border-slate-200 bg-white shadow-sm lg:sticky lg:top-6 lg:rounded-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 lg:px-5 lg:py-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Sale checkout
                  </h2>
                  <p className="text-xs text-slate-500">
                    {totalItemsCount} unit(s) · {cart.length} line(s)
                  </p>
                </div>
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCart}
                    className="-m-2 p-2 text-sm font-semibold text-rose-600 active:text-rose-800 lg:text-xs"
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-100 px-4 lg:max-h-[380px] lg:overflow-y-auto lg:px-5">
                {cart.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="mb-2 text-3xl" aria-hidden>🛒</div>
                    <p className="text-sm font-semibold text-slate-500">
                      Sale list is empty
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Scan a barcode or search to add items.
                    </p>
                  </div>
                ) : (
                  cart.map(({ item, quantity }) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-800">
                          {item.name}
                        </p>
                        <p className="truncate font-mono text-xs text-slate-400">
                          {item.sku} · {item.quantity} {item.unit} in stock
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        <div className="flex items-center rounded-full border border-slate-200 bg-slate-50">
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.id, quantity - 1)}
                            aria-label={`Decrease ${item.name}`}
                            className="flex h-11 w-11 items-center justify-center rounded-full text-xl font-bold text-slate-600 active:bg-slate-200 lg:h-9 lg:w-9"
                          >
                            −
                          </button>
                          <span className="min-w-[1.75rem] text-center text-base font-bold text-slate-900">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.id, quantity + 1)}
                            aria-label={`Increase ${item.name}`}
                            className="flex h-11 w-11 items-center justify-center rounded-full text-xl font-bold text-slate-600 active:bg-slate-200 lg:h-9 lg:w-9"
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          aria-label={`Remove ${item.name}`}
                          className="flex h-11 w-9 items-center justify-center rounded-full text-slate-400 active:bg-rose-50 active:text-rose-600 lg:h-9"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop footer button */}
              <div className="hidden rounded-b-2xl border-t border-slate-100 bg-slate-50 p-4 lg:block">
                <button
                  type="button"
                  onClick={handleCompleteSale}
                  disabled={cart.length === 0 || loading}
                  className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {loading ? "Processing sale…" : "Complete sale"}
                </button>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* ===== MOBILE STICKY CHECKOUT BAR ===== */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 pt-3 shadow-[0_-4px_16px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="min-w-[4.5rem]">
            <p className="text-xs text-slate-500">Units</p>
            <p className="text-xl font-bold leading-tight text-slate-900">
              {totalItemsCount}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCompleteSale}
            disabled={cart.length === 0 || loading}
            className="h-14 flex-1 rounded-2xl bg-emerald-600 text-base font-semibold text-white shadow-sm transition active:scale-[0.98] disabled:bg-slate-300"
          >
            {loading ? "Processing sale…" : "Complete sale"}
          </button>
        </div>
      </div>
    </div>
  );
}
