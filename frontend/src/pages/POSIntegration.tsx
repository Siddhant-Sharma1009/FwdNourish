
import { useEffect, useState } from "react";
import QRBarcodeScanner from "../components/common/QRBarcodeScanner";

import type { Inventory } from "../types/inventory";
import { getInventoryBySku, getInventory } from "../services/inventoryApi";
import { createTransaction } from "../services/transactionApi";

interface CartItem {
  item: Inventory;
  quantity: number;
}

export default function PosTerminal() {
  const tenantId = 1;

  const [inventoryList, setInventoryList] = useState<Inventory[]>([]);
  const [skuSearch, setSkuSearch] = useState("");
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>("");
  const [checkingSku, setCheckingSku] = useState(false);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadInventory() {
      try {
        const items = await getInventory(tenantId);
        setInventoryList(items);
      } catch (err) {
        console.error("Failed to fetch inventory", err);
      }
    }
    loadInventory();
  }, [tenantId]);

  function addItemToCart(inventory: Inventory, defaultQty = 1) {
    setError("");
    setMessage("");

    setCart((previousCart) => {
      const existingIndex = previousCart.findIndex(
        (cartItem) => cartItem.item.id === inventory.id
      );

      if (existingIndex !== -1) {
        const existing = previousCart[existingIndex];
        const newQty = existing.quantity + defaultQty;

        if (newQty > inventory.quantity) {
          setError(`Cannot add more than available stock (${inventory.quantity} ${inventory.unit}).`);
          return previousCart;
        }

        const updatedCart = [...previousCart];
        updatedCart[existingIndex] = {
          ...existing,
          quantity: newQty,
        };
        return updatedCart;
      }

      if (defaultQty > inventory.quantity) {
        setError(`Item "${inventory.name}" is out of stock.`);
        return previousCart;
      }

      return [...previousCart, { item: inventory, quantity: defaultQty }];
    });
  }


  async function handleSkuLookup(scannedSku: string) {
    const cleanSku = scannedSku.trim();
    if (!cleanSku) return;

    try {
      setCheckingSku(true);
      setError("");

      const inventory = await getInventoryBySku(cleanSku, tenantId);
      addItemToCart(inventory, 1);
      setSkuSearch("");
    } catch {
      setError(`Item with SKU "${cleanSku}" was not found.`);
    } finally {
      setCheckingSku(false);
    }
  }

  function handleScanSuccess(decodedText: string) {
    handleSkuLookup(decodedText);
  }


  function handleManualSelect(inventoryId: number) {
    const selected = inventoryList.find((i) => i.id === inventoryId);
    if (selected) {
      addItemToCart(selected, 1);
      setSelectedInventoryId("");
    }
  }


  function updateCartQuantity(inventoryId: number, newQuantity: number) {
    if (newQuantity <= 0) {
      removeFromCart(inventoryId);
      return;
    }

    setCart((previousCart) =>
      previousCart.map((cartItem) => {
        if (cartItem.item.id !== inventoryId) return cartItem;

        if (newQuantity > cartItem.item.quantity) {
          setError(`Stock limit reached for ${cartItem.item.name} (${cartItem.item.quantity} available).`);
          return cartItem;
        }

        return { ...cartItem, quantity: newQuantity };
      })
    );
    setError("");
  }

  function removeFromCart(inventoryId: number) {
    setCart((previousCart) => previousCart.filter((cartItem) => cartItem.item.id !== inventoryId));
  }

  function clearCart() {
    setCart([]);
  }

  async function handleCompleteSale() {
    if (cart.length === 0) {
      setError("Sale list is empty. Add items first.");
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

      const totalUnits = cart.reduce((sum, item) => sum + item.quantity, 0);
      setMessage(`Sale completed successfully! Processed ${totalUnits} unit(s) across ${cart.length} item line(s).`);

      clearCart();
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.detail || "Failed to process sale transaction. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const totalItemsCount = cart.reduce((sum, i) => sum + i.quantity, 0);


  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              POS Terminal
            </h1>
            <p className="text-xs text-slate-500 sm:text-sm">
              Scan barcodes or choose items from inventory to execute sales.
            </p>
          </div>          
        </div>

        {/* MESSAGES */}
        {message && (
          <div className="mb-4 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
            <div className="flex items-center gap-2">
              <span>✓</span>
              <span>{message}</span>
            </div>
            <button onClick={() => setMessage("")} className="text-xs text-emerald-600 hover:text-emerald-900">
              Dismiss
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
            <button onClick={() => setError("")} className="text-xs text-rose-500 hover:text-rose-800">
              Dismiss
            </button>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-12">
          {/* LEFT: SCANNER & MANUAL SELECTION */}
          <div className="space-y-5 lg:col-span-7">
            {/* REUSABLE SCANNER COMPONENT */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-1 text-sm font-bold text-slate-900">Barcode Scanner</h2>
              <p className="mb-4 text-xs text-slate-500">Scan QR codes or standard barcodes to list items.</p>
              
              <QRBarcodeScanner onScan={handleScanSuccess} />
            </div>

            {/* MANUAL QUICK-ADD CONTROLS */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900">Manual Quick-Add</h2>
              <p className="mt-0.5 text-xs text-slate-500">Lookup items manually without scanning.</p>

              <div className="mt-4 space-y-4">
                {/* SKU LOOKUP */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Option 1: Search by Barcode / SKU</label>
                  <div className="flex gap-2">
                    <input
                      value={skuSearch}
                      onChange={(e) => setSkuSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSkuLookup(skuSearch);
                        }
                      }}
                      placeholder="Enter SKU..."
                      className="h-10 flex-1 rounded-xl border border-slate-300 px-3 font-mono text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                    <button
                      type="button"
                      onClick={() => handleSkuLookup(skuSearch)}
                      disabled={checkingSku || !skuSearch.trim()}
                      className="h-10 rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      {checkingSku ? "Adding..." : "Add Item"}
                    </button>
                  </div>
                </div>

                {/* INVENTORY DROPDOWN */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Option 2: Select Available Stock Item</label>
                  <select
                    value={selectedInventoryId}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      if (id) {
                        setSelectedInventoryId(e.target.value);
                        handleManualSelect(id);
                      }
                    }}
                    className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-indigo-500"
                  >
                    <option value="">Choose item from stock list...</option>
                    {inventoryList.map((item) => (
                      <option key={item.id} value={item.id} disabled={item.quantity <= 0}>
                        {item.name} — ({item.quantity} {item.unit} available)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: CHECKOUT CART */}
          <div className="lg:col-span-5">
            <div className="sticky top-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Sale Checkout</h2>
                  <p className="text-xs text-slate-500">{totalItemsCount} total unit(s) selected</p>
                </div>
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* CART ITEM LIST */}
              <div className="max-h-[380px] divide-y divide-slate-100 overflow-y-auto p-4">
                {cart.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-sm font-semibold text-slate-400">Sale list is empty</p>
                    <p className="mt-1 text-xs text-slate-400">Scan barcodes or choose items from inventory</p>
                  </div>
                ) : (
                  cart.map(({ item, quantity }) => (
                    <div key={item.id} className="flex items-center justify-between py-3">
                      <div className="pr-2">
                        <p className="text-sm font-bold text-slate-800">{item.name}</p>
                        <p className="font-mono text-xs text-slate-400">
                          SKU: {item.sku} | Stock: {item.quantity} {item.unit}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50">
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.id, quantity - 1)}
                            className="px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200"
                          >
                            -
                          </button>
                          <span className="px-2 text-xs font-bold text-slate-900">{quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.id, quantity + 1)}
                            className="px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200"
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* ACTION FOOTER */}
              <div className="rounded-b-2xl border-t border-slate-100 bg-slate-50 p-4">
                <button
                  type="button"
                  onClick={handleCompleteSale}
                  disabled={cart.length === 0 || loading}
                  className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {loading ? "Processing Sale..." : "Complete Sale"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
