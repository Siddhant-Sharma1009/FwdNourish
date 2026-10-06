import { useEffect, useState } from "react";

import QRBarcodeScanner from "../components/common/QRBarcodeScanner";
import { useAuth } from "../context/AuthContext";

import type { Inventory } from "../types/inventory";
import type { Category } from "../types/category";

import { getInventoryBySku } from "../services/inventoryApi";
import { createTransaction } from "../services/transactionApi";
import { getCategories } from "../services/categoryApi";

interface ScannerCartItem {
  item: Inventory;
  quantity: number;
  sku: string;
  name: string;
  category_id: number;
  unit: string;
  batch_number: string;
  purchase_date: string;
  expiry_date: string;
  expiry_threshold_days: number;
}

interface ItemForm {
  sku: string;
  name: string;
  category_id: number;
  quantity: number;
  unit: string;
  batch_number: string;
  purchase_date: string;
  expiry_date: string;
  expiry_threshold_days: number;
}

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function emptyForm(): ItemForm {
  return {
    sku: "",
    name: "",
    category_id: 0,
    quantity: 1,
    unit: "pcs",
    batch_number: "",
    purchase_date: getToday(),
    expiry_date: "",
    expiry_threshold_days: 3,
  };
}

export default function Scanner() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id;

  const [categories, setCategories] = useState<Category[]>([]);

  // Currently scanned/found item
  const [currentItem, setCurrentItem] =
    useState<Inventory | null>(null);

  // Form for the currently scanned inventory item
  const [form, setForm] = useState<ItemForm>(
    emptyForm()
  );

  // Items waiting to be added to inventory
  const [cart, setCart] = useState<ScannerCartItem[]>(
    []
  );

  const [checkingSku, setCheckingSku] =
    useState(false);

  const [addingToInventory, setAddingToInventory] =
    useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  
  useEffect(() => {
    async function loadCategories() {
      try {
        const data = await getCategories();
        setCategories(data);
      } catch (err) {
        console.error(err);
        setError("Failed to load categories.");
      }
    }

    loadCategories();
  }, []);

  
  function updateForm(
    field: keyof ItemForm,
    value: string | number
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }


  async function handleScan(code: string) {
    const scannedSku = code.trim();

    if (!scannedSku) return;

    if (!tenantId) {
      setError(
        "Tenant information is not available. Please log in again."
      );
      return;
    }

    setCheckingSku(true);
    setError("");
    setMessage("");

    try {
      const inventory = await getInventoryBySku(scannedSku);

      setCurrentItem(inventory);

      setForm({
        sku: inventory.sku ?? scannedSku,
        name: inventory.name ?? "",
        category_id:
          inventory.category_id ?? 0,
        quantity: 1,
        unit: inventory.unit ?? "pcs",
        batch_number:
          inventory.batch_number ?? "",
        purchase_date:
          inventory.purchase_date
            ?.toString()
            .slice(0, 10) ??
          getToday(),
        expiry_date:
          inventory.expiry_date
            ?.toString()
            .slice(0, 10) ??
          "",
        expiry_threshold_days:
          inventory.expiry_threshold_days ?? 3,
      });

      setMessage(
        `"${inventory.name}" found in inventory. Review the details and add it to the list.`
      );
    } catch (err) {

      console.error(err);

      setCurrentItem(null);

      setForm({
        ...emptyForm(),
        sku: scannedSku,
      });

      setMessage(
        `Item "${scannedSku}" is not in the inventory list. Please use manual entry or CSV entry to add it.`
      );
    } finally {
      setCheckingSku(false);
    }
  }


  function validateForm() {
    if (!currentItem) {
      setError(
        "No inventory item is selected."
      );
      return false;
    }

    if (!form.sku.trim()) {
      setError("SKU is required.");
      return false;
    }

    if (!form.name.trim()) {
      setError("Product name is required.");
      return false;
    }

    if (!form.category_id) {
      setError(
        "Please select a category."
      );
      return false;
    }

    if (!form.unit.trim()) {
      setError("Unit is required.");
      return false;
    }

    if (form.quantity <= 0) {
      setError(
        "Quantity must be greater than zero."
      );
      return false;
    }

    if (!form.purchase_date) {
      setError(
        "Purchase date is required."
      );
      return false;
    }

    if (!form.expiry_date) {
      setError(
        "Expiry date is required."
      );
      return false;
    }

    if (form.expiry_threshold_days < 0) {
      setError(
        "Expiry threshold cannot be negative."
      );
      return false;
    }

    return true;
  }


  function addToCart() {
    if (!validateForm() || !currentItem) {
      return;
    }

    setCart((previousCart) => {
      const existingIndex =
        previousCart.findIndex(
          (cartItem) =>
            cartItem.item.id === currentItem.id
        );


      if (existingIndex !== -1) {
        const updatedCart = [...previousCart];

        const existing =
          updatedCart[existingIndex];

        updatedCart[existingIndex] = {
          ...existing,
          quantity: existing.quantity + form.quantity,
          sku: form.sku,
          name: form.name,
          category_id: form.category_id,
          unit: form.unit,
          batch_number: form.batch_number,
          purchase_date: form.purchase_date,
          expiry_date: form.expiry_date,
          expiry_threshold_days:
            form.expiry_threshold_days,
        };

        return updatedCart;
      }


      return [
        ...previousCart,
        {
          item: currentItem,
          quantity: form.quantity,

          sku: form.sku,
          name: form.name,
          category_id: form.category_id,
          unit: form.unit,
          batch_number: form.batch_number,
          purchase_date: form.purchase_date,
          expiry_date: form.expiry_date,
          expiry_threshold_days:
            form.expiry_threshold_days,
        },
      ];
    });

    setMessage(
      `"${form.name}" added to the inventory list. You can scan another item.`
    );

    setError("");
    setCurrentItem(null);
    setForm(emptyForm());
  }


  function removeFromCart(inventoryId: number) {
    setCart((previousCart) =>
      previousCart.filter(
        (cartItem) =>
          cartItem.item.id !== inventoryId
      )
    );
  }


  function updateCartQuantity(
    inventoryId: number,
    quantity: number
  ) {
    if (quantity <= 0) {
      removeFromCart(inventoryId);
      return;
    }

    setCart((previousCart) =>
      previousCart.map((cartItem) =>
        cartItem.item.id === inventoryId
          ? {
            ...cartItem,
            quantity,
          }
          : cartItem
      )
    );
  }


  function clearCart() {
    setCart([]);
    setCurrentItem(null);
    setForm(emptyForm());
    setMessage("");
    setError("");
  }


  async function addAllToInventory() {
    if (cart.length === 0) {
      setError(
        "The inventory list is empty."
      );
      return;
    }

    if (!tenantId) {
      setError(
        "Tenant information is not available. Please log in again."
      );
      return;
    }

    setAddingToInventory(true);
    setError("");
    setMessage("");

    try {
      for (const cartItem of cart) {
        await createTransaction({
          tenant_id: tenantId,
          inventory_id: cartItem.item.id,
          transaction_type: "PURCHASE",
          quantity: cartItem.quantity,
          note: `Scanner inventory addition | Batch: ${cartItem.batch_number || "N/A"
            } | Purchase Date: ${cartItem.purchase_date
            } | Expiry Date: ${cartItem.expiry_date
            }`,
        });
      }

      setMessage(
        `${cart.length} inventory item(s) added successfully.`
      );

      setCart([]);
      setCurrentItem(null);
      setForm(emptyForm());
    } catch (err: any) {
      console.error(err);

      setError(
        err?.response?.data?.detail ||
        "Failed to add items to inventory."
      );
    } finally {
      setAddingToInventory(false);
    }
  }


  const totalQuantity = cart.reduce(
    (total, cartItem) =>
      total + cartItem.quantity,
    0
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">

        {/* PAGE HEADER */}
        {/* PAGE HEADER */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-r from-white to-slate-50/70 px-5 py-5 sm:px-7">
            <div className="flex items-start gap-4">

              {/* Scanner Icon */}
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 7.5A2.5 2.5 0 016.5 5h11A2.5 2.5 0 0120 7.5v9a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 014 16.5v-9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 9h8M8 13h8M8 17h4"
                  />
                </svg>
              </div>

              {/* Header Content */}
              <div>
                <h1 className="text-base font-bold text-slate-900">
                  Inventory Scanner
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Scan products continuously, review their inventory details, and add
                  them to inventory in one operation.
                </p>
              </div>

            </div>
          </div>
        </div>
        {/* SUCCESS MESSAGE */}
        {message && (
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
            ✓ {message}
          </div>
        )}

        {/* ERROR MESSAGE */}
        {error && (
          <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
            ⚠ {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-12">

          {/* LEFT SIDE */}
          <div className="space-y-6 lg:col-span-7">

            {/* SCANNER */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">


              <div className="p-5">
                <QRBarcodeScanner
                  onScan={handleScan}
                />
              </div>
            </div>

            {/* LOOKUP STATUS */}
            {checkingSku && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
                Checking scanned item in inventory...
              </div>
            )}

            {/* EXISTING INVENTORY ITEM FORM */}
            {currentItem && (
              <div className="rounded-2xl border border-emerald-200 bg-white shadow-sm">

                <div className="border-b border-emerald-100 bg-emerald-50 px-5 py-4">
                  <div className="flex items-center justify-between gap-3">

                    <div>
                      <span className="rounded-md bg-emerald-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                        Item Found
                      </span>

                      <h2 className="mt-2 text-lg font-bold text-slate-900">
                        {currentItem.name}
                      </h2>

                      <p className="font-mono text-xs text-slate-500">
                        SKU: {currentItem.sku}
                      </p>
                    </div>

                    <div className="rounded-xl border border-emerald-200 bg-white px-4 py-3 text-right">
                      <p className="text-[10px] font-bold uppercase text-slate-400">
                        Current Stock
                      </p>

                      <p className="text-lg font-bold text-emerald-700">
                        {currentItem.quantity}

                        <span className="ml-1 text-xs font-normal">
                          {currentItem.unit}
                        </span>
                      </p>
                    </div>

                  </div>
                </div>

                <div className="p-5">
                  <div className="grid gap-4 sm:grid-cols-2">

                    {/* SKU */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        SKU
                      </label>

                      <input
                        type="text"
                        value={form.sku}
                        onChange={(e) =>
                          updateForm(
                            "sku",
                            e.target.value
                          )
                        }
                        className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm font-mono outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* NAME */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Name
                      </label>

                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) =>
                          updateForm(
                            "name",
                            e.target.value
                          )
                        }
                        className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* CATEGORY */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Category
                      </label>

                      <select
                        value={form.category_id}
                        onChange={(e) =>
                          updateForm(
                            "category_id",
                            Number(e.target.value)
                          )
                        }
                        className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-500"
                      >
                        <option value={0}>
                          Select Category
                        </option>

                        {categories.map(
                          (category) => (
                            <option
                              key={category.id}
                              value={category.id}
                            >
                              {category.name}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    {/* QUANTITY */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Quantity to Add
                      </label>

                      <input
                        type="number"
                        min="1"
                        value={form.quantity}
                        onChange={(e) =>
                          updateForm(
                            "quantity",
                            Math.max(
                              1,
                              Number(
                                e.target.value
                              ) || 1
                            )
                          )
                        }
                        className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* UNIT */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Unit
                      </label>

                      <input
                        type="text"
                        value={form.unit}
                        onChange={(e) =>
                          updateForm(
                            "unit",
                            e.target.value
                          )
                        }
                        placeholder="pcs, kg, box"
                        className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* BATCH */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Batch Number
                      </label>

                      <input
                        type="text"
                        value={form.batch_number}
                        onChange={(e) =>
                          updateForm(
                            "batch_number",
                            e.target.value
                          )
                        }
                        placeholder="Batch number"
                        className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* PURCHASE DATE */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Purchase Date
                      </label>

                      <input
                        type="date"
                        value={form.purchase_date}
                        onChange={(e) =>
                          updateForm(
                            "purchase_date",
                            e.target.value
                          )
                        }
                        className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* EXPIRY DATE */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Expiry Date
                      </label>

                      <input
                        type="date"
                        value={form.expiry_date}
                        onChange={(e) =>
                          updateForm(
                            "expiry_date",
                            e.target.value
                          )
                        }
                        className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* EXPIRY THRESHOLD */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Expiry Threshold Days
                      </label>

                      <input
                        type="number"
                        min="0"
                        value={
                          form.expiry_threshold_days
                        }
                        onChange={(e) =>
                          updateForm(
                            "expiry_threshold_days",
                            Math.max(
                              0,
                              Number(
                                e.target.value
                              ) || 0
                            )
                          )
                        }
                        className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500"
                      />
                    </div>

                  </div>

                  {/* ADD TO CART */}
                  <div className="mt-5">
                    <button
                      type="button"
                      onClick={addToCart}
                      disabled={checkingSku}
                      className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Add to Inventory List
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* NOT FOUND MESSAGE */}
            {!checkingSku &&
              !currentItem &&
              form.sku &&
              message.includes(
                "not in the inventory"
              ) && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <div className="flex gap-3">

                    <div className="text-xl">
                      ⚠️
                    </div>

                    <div>
                      <h3 className="font-bold text-amber-900">
                        Item Not in Inventory
                      </h3>

                      <p className="mt-1 text-sm text-amber-800">
                        SKU{" "}
                        <span className="font-mono font-semibold">
                          {form.sku}
                        </span>{" "}
                        is not present in your inventory list.
                      </p>

                      <p className="mt-2 text-sm text-amber-700">
                        Please use{" "}
                        <strong>
                          manual entry
                        </strong>{" "}
                        or{" "}
                        <strong>
                          CSV entry
                        </strong>{" "}
                        to add this product.
                      </p>
                    </div>

                  </div>
                </div>
              )}

          </div>

          {/* RIGHT SIDE — CART */}
          <div className="lg:col-span-5">
            <div className="sticky top-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              {/* CART HEADER */}
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">

                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Inventory List
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    {cart.length} product(s) •{" "}
                    {totalQuantity} total unit(s)
                  </p>
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

              {/* CART ITEMS */}
              <div className="max-h-[520px] divide-y divide-slate-100 overflow-y-auto">

                {cart.length === 0 ? (
                  <div className="px-5 py-16 text-center">

                    <div className="text-3xl">
                      📦
                    </div>

                    <p className="mt-3 text-sm font-semibold text-slate-400">
                      No items selected
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Scan an inventory item to add it here.
                    </p>

                  </div>
                ) : (
                  cart.map((cartItem) => (
                    <div
                      key={cartItem.item.id}
                      className="p-4"
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-bold text-slate-800">
                            {cartItem.name}
                          </h3>

                          <p className="mt-1 font-mono text-xs text-slate-400">
                            SKU: {cartItem.sku}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Batch:{" "}
                            {cartItem.batch_number ||
                              "N/A"}
                          </p>

                          <p className="text-xs text-slate-500">
                            Expiry:{" "}
                            {cartItem.expiry_date ||
                              "N/A"}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            removeFromCart(
                              cartItem.item.id
                            )
                          }
                          className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          ✕
                        </button>

                      </div>

                      {/* QUANTITY */}
                      <div className="mt-3 flex items-center justify-between">

                        <span className="text-xs font-semibold text-slate-500">
                          Quantity
                        </span>

                        <div className="flex items-center rounded-lg border border-slate-200">

                          <button
                            type="button"
                            onClick={() =>
                              updateCartQuantity(
                                cartItem.item.id,
                                cartItem.quantity - 1
                              )
                            }
                            className="px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-100"
                          >
                            −
                          </button>

                          <span className="min-w-[40px] text-center text-sm font-bold text-slate-800">
                            {cartItem.quantity}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              updateCartQuantity(
                                cartItem.item.id,
                                cartItem.quantity + 1
                              )
                            }
                            className="px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-100"
                          >
                            +
                          </button>

                        </div>
                      </div>

                    </div>
                  ))
                )}

              </div>

              {/* FINAL ACTION */}
              <div className="border-t border-slate-100 bg-slate-50 p-4">

                <button
                  type="button"
                  onClick={addAllToInventory}
                  disabled={
                    cart.length === 0 ||
                    addingToInventory
                  }
                  className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {addingToInventory
                    ? "Adding to Inventory..."
                    : `Add All to Inventory (${cart.length})`}
                </button>

                <p className="mt-2 text-center text-[11px] text-slate-400">
                  All selected products will be added in one
                  inventory operation.
                </p>

              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

