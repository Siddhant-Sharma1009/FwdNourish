
import { useEffect, useState } from "react";
import type{ FormEvent } from "react";
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
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement
    >
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
    <div className="min-h-screen bg-slate-100 p-1 sm:p-0.3">
      <div className="mx-auto w-full max-w-6xl">
        {/*ALERTS */}
        {message && (
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}


        {/*  MANUAL ENTRY CARD  */}

        <form
          onSubmit={handleSubmit}
          className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-base font-semibold text-slate-900">
              Manual Inventory Entry
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Enter the product details below to add an inventory item.
            </p>
          </div>

          {/* ================= FORM CONTENT ================= */}

          <div className="p-6">

            <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">


              {/* ================= SKU ================= */}

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  SKU
                </label>

                <input
                  name="sku"
                  value={form.sku}
                  onChange={handleChange}
                  placeholder="MILK001"
                  required
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>


              {/* ================= PRODUCT NAME ================= */}

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Product Name
                </label>

                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Fresh Milk"
                  required
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>


              {/* ================= CATEGORY ================= */}

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Category
                </label>

                <select
                  name="category_id"
                  value={form.category_id}
                  onChange={handleChange}
                  required
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value={0}>
                    Select category
                  </option>

                  {categories.map((category) => (
                    <option
                      key={category.id}
                      value={category.id}
                    >
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>


              {/* ================= QUANTITY ================= */}

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Quantity
                </label>

                <input
                  type="number"
                  name="quantity"
                  value={form.quantity}
                  onChange={handleChange}
                  min="0.01"
                  step="0.01"
                  required
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>


              {/* ================= UNIT ================= */}

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Unit
                </label>

                <select
                  name="unit"
                  value={form.unit}
                  onChange={handleChange}
                  required
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="">
                    Select unit
                  </option>
                  <option value="kg">
                    Kilogram
                  </option>
                  <option value="liter">
                    Liter
                  </option>
                  <option value="piece">
                    Piece
                  </option>
                  <option value="pack">
                    Pack
                  </option>
                </select>
              </div>


              {/* ================= BATCH NUMBER ================= */}

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Batch Number
                </label>

                <input
                  name="batch_number"
                  value={form.batch_number ?? ""}
                  onChange={handleChange}
                  placeholder="BATCH001"
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>


              {/* ================= PURCHASE DATE ================= */}

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Purchase Date
                </label>

                <input
                  type="date"
                  name="purchase_date"
                  value={form.purchase_date}
                  onChange={handleChange}
                  required
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>


              {/* ================= EXPIRY DATE ================= */}

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Expiry Date
                </label>

                <input
                  type="date"
                  name="expiry_date"
                  value={form.expiry_date}
                  onChange={handleChange}
                  required
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              {/* ================= EXPIRY THRESHOLD ================= */}

              <div className="md:col-span-2">

                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Expiry Alert Threshold (days)
                </label>

                <input
                  type="number"
                  name="expiry_threshold_days"
                  value={form.expiry_threshold_days}
                  onChange={handleChange}
                  min="0"
                  required
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />

                <p className="mt-1.5 text-xs text-slate-500">
                  Alert will appear when the item reaches this
                  many days before expiry.
                </p>

              </div>
            </div>


            {/* ================= SUBMIT ================= */}

            <div className="mt-7 flex justify-end border-t border-slate-100 pt-5">
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-emerald-600 px-7 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {loading ? "Adding..." : "Add Inventory"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddInventory;
