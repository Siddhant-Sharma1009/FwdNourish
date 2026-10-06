import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import type { Category } from "../types/category";
import type { InventoryCreate } from "../types/inventory";

import { getCategories } from "../services/categoryApi";
import { createInventory } from "../services/inventoryApi";

function AddInventory() {
  const tenantId = 1;
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<InventoryCreate>({
    tenant_id: tenantId,
    sku: "",
    name: "",
    category_id: 0,
    quantity: 0,
    unit: "",
    batch_number: "",
    purchase_date: "",
    expiry_date: "",
    expiry_threshold_days: 3,
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCategories() {
      try {
        const data = await getCategories();
        setCategories(data);
      } catch (error) {
        console.error(error);
        setError("Failed to load categories");
      }
    }

    loadCategories();
  }, []);

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]:
        name === "category_id" ||
        name === "quantity" ||
        name === "expiry_threshold_days"
          ? Number(value)
          : value,
    }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      await createInventory(form);

      setMessage("Inventory item added successfully.");

      setForm({
        tenant_id: tenantId,
        sku: "",
        name: "",
        category_id: 0,
        quantity: 0,
        unit: "",
        batch_number: "",
        purchase_date: "",
        expiry_date: "",
        expiry_threshold_days: 3,
      });
    } catch (error) {
      console.error(error);
      setError("Failed to add inventory item.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        {/* ================= ALERTS ================= */}
        {message && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 shadow-sm">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <div>
              <p className="text-sm font-semibold text-emerald-900">
                Inventory added successfully
              </p>
              <p className="mt-0.5 text-xs text-emerald-700">{message}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 shadow-sm">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4M12 16h.01"
                />
                <circle cx="12" cy="12" r="9" />
              </svg>
            </div>

            <div>
              <p className="text-sm font-semibold text-rose-900">
                Something went wrong
              </p>
              <p className="mt-0.5 text-xs text-rose-700">{error}</p>
            </div>
          </div>
        )}

        {/* ================= MAIN FORM ================= */}
        <form
          onSubmit={handleSubmit}
          className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md"
        >
          {/* ================= FORM HEADER ================= */}
          <div className="border-b border-slate-100 bg-gradient-to-r from-white to-slate-50/70 px-5 py-5 sm:px-7">
            <div className="flex items-start gap-4">
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
                    d="M20 7.5L12 3 4 7.5v9L12 21l8-4.5v-9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 7.5l8 4.5 8-4.5M12 12v9"
                  />
                </svg>
              </div>

              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Product Information
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Enter the product details below to add an inventory item.
                </p>
              </div>
            </div>
          </div>

          {/* ================= FORM CONTENT ================= */}
          <div className="p-5 sm:p-7">
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">

              {/* ================= SKU ================= */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  SKU
                  <span className="ml-1 text-rose-500">*</span>
                </label>

                <input
                  name="sku"
                  value={form.sku}
                  onChange={handleChange}
                  placeholder="e.g. MILK001"
                  required
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50"
                />

                <p className="mt-1.5 text-xs text-slate-400">
                  Unique product identifier.
                </p>
              </div>

              {/* ================= PRODUCT NAME ================= */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Product Name
                  <span className="ml-1 text-rose-500">*</span>
                </label>

                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Fresh Milk"
                  required
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50"
                />
              </div>

              {/* ================= CATEGORY ================= */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Category
                  <span className="ml-1 text-rose-500">*</span>
                </label>

                <select
                  name="category_id"
                  value={form.category_id}
                  onChange={handleChange}
                  required
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 text-sm text-slate-800 outline-none transition-all hover:border-slate-300 hover:bg-white focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50"
                >
                  <option value={0}>Select category</option>

                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* ================= QUANTITY ================= */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Quantity
                  <span className="ml-1 text-rose-500">*</span>
                </label>

                <input
                  type="number"
                  name="quantity"
                  value={form.quantity}
                  onChange={handleChange}
                  min="0.01"
                  step="0.01"
                  required
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50"
                />
              </div>

              {/* ================= UNIT ================= */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Unit
                  <span className="ml-1 text-rose-500">*</span>
                </label>

                <select
                  name="unit"
                  value={form.unit}
                  onChange={handleChange}
                  required
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 text-sm text-slate-800 outline-none transition-all hover:border-slate-300 hover:bg-white focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50"
                >
                  <option value="">Select unit</option>
                  <option value="kg">Kilogram</option>
                  <option value="liter">Liter</option>
                  <option value="piece">Piece</option>
                  <option value="pack">Pack</option>
                </select>
              </div>

              {/* ================= BATCH NUMBER ================= */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Batch Number
                  <span className="ml-1 text-xs font-normal text-slate-400">
                    Optional
                  </span>
                </label>

                <input
                  name="batch_number"
                  value={form.batch_number ?? ""}
                  onChange={handleChange}
                  placeholder="e.g. BATCH001"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50"
                />
              </div>

              {/* ================= PURCHASE DATE ================= */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Purchase Date
                  <span className="ml-1 text-rose-500">*</span>
                </label>

                <input
                  type="date"
                  name="purchase_date"
                  value={form.purchase_date}
                  onChange={handleChange}
                  required
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 text-sm text-slate-800 outline-none transition-all hover:border-slate-300 hover:bg-white focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50"
                />
              </div>

              {/* ================= EXPIRY DATE ================= */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Expiry Date
                  <span className="ml-1 text-rose-500">*</span>
                </label>

                <input
                  type="date"
                  name="expiry_date"
                  value={form.expiry_date}
                  onChange={handleChange}
                  required
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 text-sm text-slate-800 outline-none transition-all hover:border-slate-300 hover:bg-white focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50"
                />
              </div>

              {/* ================= EXPIRY THRESHOLD ================= */}
              <div className="md:col-span-2">
                <div className="rounded-2xl border border-amber-200/70 bg-amber-50/50 p-4 sm:p-5">
                  <div className="mb-4 flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 9v4M12 17h.01"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M10.3 4.6L2.9 17a2 2 0 001.7 3h14.8a2 2 0 001.7-3L13.7 4.6a2 2 0 00-3.4 0z"
                        />
                      </svg>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        Expiry Alert Settings
                      </p>

                      <p className="mt-0.5 text-xs text-slate-500">
                        Configure when this product should appear in expiry
                        alerts.
                      </p>
                    </div>
                  </div>

                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Expiry Alert Threshold (days)
                    <span className="ml-1 text-rose-500">*</span>
                  </label>

                  <input
                    type="number"
                    name="expiry_threshold_days"
                    value={form.expiry_threshold_days}
                    onChange={handleChange}
                    min="0"
                    required
                    className="h-11 w-full rounded-xl border border-amber-200 bg-white px-3.5 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 hover:border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-100 sm:max-w-sm"
                  />

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Alert will appear when the item reaches this many days
                    before expiry.
                  </p>
                </div>
              </div>
            </div>

            {/* ================= SUBMIT ================= */}
            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => navigate("/inventory")}
                className="w-full rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {loading ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="9"
                        className="opacity-30"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <path
                        d="M21 12a9 9 0 00-9-9"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                    Adding...
                  </>
                ) : (
                  <>
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 5v14M5 12h14"
                      />
                    </svg>
                    Add Inventory
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddInventory;