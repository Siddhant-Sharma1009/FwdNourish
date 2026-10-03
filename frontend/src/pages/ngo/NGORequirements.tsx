import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  cancelNGORequirement,
  createNGORequirement,
  getNGORequirements,
} from "../../services/ngoRequirementApi";
import type {
  NGORequirement,
  NGORequirementCreate,
} from "../../types/ngoRequirement";

// ================================================================
// UI HELPERS (display only)
// ================================================================

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 disabled:bg-gray-50 disabled:text-gray-400";

const labelClass = "mb-1.5 block text-sm font-medium text-gray-700";

function getStatusClass(status: string) {
  switch (status) {
    case "ACTIVE":
      return "bg-green-50 text-green-700 ring-green-200";
    case "CANCELLED":
      return "bg-red-50 text-red-700 ring-red-200";
    default:
      return "bg-gray-50 text-gray-600 ring-gray-200";
  }
}

function getStatusDotClass(status: string) {
  switch (status) {
    case "ACTIVE":
      return "bg-green-500";
    case "CANCELLED":
      return "bg-red-500";
    default:
      return "bg-gray-400";
  }
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-2.5 text-center">
      <p className="text-[11px] font-medium text-gray-500">{label}</p>

      <p className="mt-0.5 text-sm font-bold text-gray-900">{value}</p>
    </div>
  );
}

export default function NGORequirements() {
  const [requirements, setRequirements] = useState<NGORequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState<NGORequirementCreate>({
    food_name: "",
    food_category: "",
    quantity_required: 1,
    unit: "kg",
    required_by: "",
    max_distance_km: 25,
    notes: "",
  });

  const loadRequirements = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getNGORequirements();
      setRequirements(data);
    } catch (err: any) {
      console.error("Failed to load NGO requirements:", err);

      setError(
        err?.response?.data?.detail ||
        "Failed to load NGO requirements."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequirements();
  }, []);

  const handleChange = (
    field: keyof NGORequirementCreate,
    value: string | number
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!form.food_name.trim()) {
      setError("Please enter the food name.");
      return;
    }

    if (form.quantity_required <= 0) {
      setError("Quantity must be greater than 0.");
      return;
    }

    if (!form.required_by) {
      setError("Please select a required-by date.");
      return;
    }

    if (form.max_distance_km <= 0) {
      setError("Maximum distance must be greater than 0.");
      return;
    }

    try {
      setSubmitting(true);

      const payload: NGORequirementCreate = {
        food_name: form.food_name.trim(),
        food_category: form.food_category?.trim() || undefined,
        quantity_required: Number(form.quantity_required),
        unit: form.unit.trim(),
        required_by: form.required_by,
        max_distance_km: Number(form.max_distance_km),
        notes: form.notes?.trim() || undefined,
      };

      await createNGORequirement(payload);

      setSuccess(
        "Food requirement created successfully."
      );

      setForm({
        food_name: "",
        food_category: "",
        quantity_required: 1,
        unit: "kg",
        required_by: "",
        max_distance_km: 25,
        notes: "",
      });

      await loadRequirements();
    } catch (err: any) {
      console.error("Failed to create requirement:", err);

      setError(
        err?.response?.data?.detail ||
        "Failed to create food requirement."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: number) => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this requirement?"
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      await cancelNGORequirement(id);

      setSuccess("Requirement cancelled successfully.");

      await loadRequirements();
    } catch (err: any) {
      console.error("Failed to cancel requirement:", err);

      setError(
        err?.response?.data?.detail ||
        "Failed to cancel requirement."
      );
    }
  };

  const activeCount = requirements.filter(
    (r) => r.status === "ACTIVE"
  ).length;

  return (
    <div className="min-h-full bg-slate-50 px-4  sm:px-1">
      <header className="px-1 pb-0 pt-3 sm:pt-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                Food{" "}
                <span className="bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
                  Requirenments
                </span>
              </h2>

              <p className="mt-1 max-w-xl text-sm text-slate-600 sm:text-base dark:text-slate-400">
                Tell businesses what surplus food your NGO currently needs.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 ring-1 ring-inset ring-gray-200">
              {requirements.length} total
            </span>

            <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 ring-1 ring-inset ring-green-200">
              {activeCount} active
            </span>
            </div>
          </div>

          {/* Styled divider */}
          <div className="relative mb-4 mt-4 sm:mb-6 sm:mt-5">
            <div className="h-px w-full bg-gradient-to-r from-slate-300 via-slate-200 to-transparent dark:from-slate-600 dark:via-slate-700" />
            <div className="absolute left-0 top-0 h-[2px] w-16 -translate-y-1/2 rounded-full bg-gradient-to-r from-amber-500 to-orange-600" />
          </div>
        </header>
     
      <div className="mx-auto max-w-6xl">

       



        {/* Messages */}
        {error && (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <span>⚠️</span>

            <p className="text-sm font-medium text-red-700">
              {error}
            </p>
          </div>
        )}

        {success && (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
            <span>✅</span>

            <p className="text-sm font-medium text-green-700">
              {success}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-5">
          {/* ====================================================
              CREATE REQUIREMENT
          ==================================================== */}

          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:sticky lg:top-6 lg:col-span-2">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="text-base font-bold text-gray-900">
                Create food requirement
              </h2>

              <p className="mt-0.5 text-sm text-gray-500">
                Add the food your organization currently needs.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-2 gap-4 p-5"
            >
              {/* Food Name */}
              <div className="col-span-2">
                <label className={labelClass}>
                  Food name <span className="text-red-500">*</span>
                </label>

                <input
                  type="text"
                  value={form.food_name}
                  onChange={(e) =>
                    handleChange("food_name", e.target.value)
                  }
                  placeholder="e.g. Whole Milk"
                  className={inputClass}
                />
              </div>

              {/* Food Category */}
              <div className="col-span-2">
                <label className={labelClass}>
                  Food category
                </label>

                <input
                  type="text"
                  value={form.food_category || ""}
                  onChange={(e) =>
                    handleChange("food_category", e.target.value)
                  }
                  placeholder="e.g. Dairy"
                  className={inputClass}
                />
              </div>

              {/* Quantity */}
              <div>
                <label className={labelClass}>
                  Quantity <span className="text-red-500">*</span>
                </label>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.quantity_required}
                  onChange={(e) =>
                    handleChange(
                      "quantity_required",
                      Number(e.target.value)
                    )
                  }
                  className={inputClass}
                />
              </div>

              {/* Unit */}
              <div>
                <label className={labelClass}>
                  Unit <span className="text-red-500">*</span>
                </label>

                <select
                  value={form.unit}
                  onChange={(e) =>
                    handleChange("unit", e.target.value)
                  }
                  className={inputClass}
                >
                  <option value="kg">Kilogram (kg)</option>
                  <option value="g">Gram (g)</option>
                  <option value="litre">Litre</option>
                  <option value="ml">Millilitre (ml)</option>
                  <option value="units">Units</option>
                  <option value="packets">Packets</option>
                  <option value="boxes">Boxes</option>
                </select>
              </div>

              {/* Required By */}
              <div>
                <label className={labelClass}>
                  Required by <span className="text-red-500">*</span>
                </label>

                <input
                  type="date"
                  value={form.required_by}
                  onChange={(e) =>
                    handleChange(
                      "required_by",
                      e.target.value
                    )
                  }
                  min={new Date().toISOString().split("T")[0]}
                  className={inputClass}
                />
              </div>

              {/* Maximum Distance */}
              <div>
                <label className={labelClass}>
                  Max distance (km){" "}
                  <span className="text-red-500">*</span>
                </label>

                <input
                  type="number"
                  min="1"
                  max="500"
                  step="0.1"
                  value={form.max_distance_km}
                  onChange={(e) =>
                    handleChange(
                      "max_distance_km",
                      Number(e.target.value)
                    )
                  }
                  className={inputClass}
                />
              </div>

              {/* Notes */}
              <div className="col-span-2">
                <label className={labelClass}>Notes</label>

                <textarea
                  rows={3}
                  value={form.notes || ""}
                  onChange={(e) =>
                    handleChange("notes", e.target.value)
                  }
                  placeholder="Additional information about this requirement..."
                  className={`${inputClass} resize-none`}
                />
              </div>

              {/* Submit */}
              <div className="col-span-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {submitting
                    ? "Creating..."
                    : "Create requirement"}
                </button>
              </div>
            </form>
          </section>

          {/* ====================================================
              EXISTING REQUIREMENTS
          ==================================================== */}

          <section className="lg:col-span-3">
            <div className="mb-3 flex items-end justify-between px-1">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  My requirements
                </h2>

                <p className="mt-0.5 text-sm text-gray-500">
                  Requirements submitted by your organization.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 animate-pulse rounded-xl bg-gray-200" />

                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-40 animate-pulse rounded bg-gray-200" />
                        <div className="h-3 w-24 animate-pulse rounded bg-gray-100" />
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <div className="h-12 animate-pulse rounded-xl bg-gray-100" />
                      <div className="h-12 animate-pulse rounded-xl bg-gray-100" />
                      <div className="h-12 animate-pulse rounded-xl bg-gray-100" />
                    </div>
                  </div>
                ))}

                <p className="pt-1 text-center text-sm text-gray-500">
                  Loading requirements...
                </p>
              </div>
            ) : requirements.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-2xl">
                  🍽️
                </div>

                <p className="mt-4 text-base font-bold text-gray-900">
                  No food requirements yet
                </p>

                <p className="mx-auto mt-1 max-w-xs text-sm text-gray-500">
                  Create your first requirement using the form
                  and matching donations will show up in NGO Matches.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {requirements.map((requirement) => (
                  <article
                    key={requirement.id}
                    className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                  >
                    <div className="flex items-center gap-3 px-5 py-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 text-xl ring-1 ring-inset ring-green-100">
                        🥗
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-bold text-gray-900">
                          {requirement.food_name}
                        </h3>

                        <p className="mt-0.5 truncate text-xs text-gray-500">
                          {requirement.food_category ||
                            "No category"}
                        </p>
                      </div>

                      <span
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusClass(
                          requirement.status
                        )}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${getStatusDotClass(
                            requirement.status
                          )}`}
                        />
                        {requirement.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 px-5 pb-4">
                      <Stat
                        label="Quantity"
                        value={`${requirement.quantity_required} ${requirement.unit}`}
                      />

                      <Stat
                        label="Required by"
                        value={new Date(
                          requirement.required_by
                        ).toLocaleDateString()}
                      />

                      <Stat
                        label="Within"
                        value={`${requirement.max_distance_km} km`}
                      />
                    </div>

                    {requirement.status === "ACTIVE" && (
                      <div className="flex justify-end border-t border-gray-100 bg-gray-50 px-5 py-3">
                        <button
                          type="button"
                          onClick={() =>
                            handleCancel(requirement.id)
                          }
                          className="rounded-lg border border-red-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                        >
                          Cancel requirement
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}