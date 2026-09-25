import { useEffect, useState } from "react";
import {
  getBusinessPickups,
  confirmBusinessPickup,
  cancelBusinessPickup,
  completePickup,
  type Pickup,
} from "../services/pickupApi";

export default function BusinessPickups() {
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadPickups = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getBusinessPickups();
      setPickups(data);
    } catch (err: any) {
      console.error("Failed to load business pickups:", err);

      setError(
        err?.response?.data?.detail ||
          "Failed to load pickup schedules."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPickups();
  }, []);

  const handleConfirm = async (pickupId: number) => {
    try {
      setActionLoading(pickupId);
      setError("");
      setSuccess("");

      await confirmBusinessPickup(pickupId);

      setSuccess("Pickup confirmed successfully.");
      await loadPickups();
    } catch (err: any) {
      console.error("Failed to confirm pickup:", err);

      setError(
        err?.response?.data?.detail ||
          "Failed to confirm pickup."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (pickupId: number) => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this pickup?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(pickupId);
      setError("");
      setSuccess("");

      await cancelBusinessPickup(pickupId);

      setSuccess("Pickup cancelled successfully.");
      await loadPickups();
    } catch (err: any) {
      console.error("Failed to cancel pickup:", err);

      setError(
        err?.response?.data?.detail ||
          "Failed to cancel pickup."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async (pickupId: number) => {
    const confirmed = window.confirm(
      "Confirm that the food has been physically handed over to the NGO. This will mark the donation as Donated."
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(pickupId);
      setError("");
      setSuccess("");

      await completePickup(pickupId);

      setSuccess("Donation marked as Donated successfully.");
      await loadPickups();
    } catch (err: any) {
      console.error("Failed to complete donation:", err);

      setError(
        err?.response?.data?.detail ||
          "Failed to mark donation as Donated."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const formatDateTime = (value: string | null) => {
    if (!value) {
      return "—";
    }

    return new Date(value).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "SCHEDULED":
        return "bg-blue-100 text-blue-700";

      case "READY_FOR_PICKUP":
        return "bg-green-100 text-green-700";

      case "COMPLETED":
        return "bg-emerald-100 text-emerald-700";

      case "CANCELLED":
        return "bg-red-100 text-red-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getConfirmationClass = (confirmation: string) => {
    switch (confirmation) {
      case "CONFIRMED":
        return "text-green-600";

      case "REJECTED":
        return "text-red-600";

      default:
        return "text-yellow-600";
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Pickup Schedule
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Manage NGO pickup schedules for your surplus food donations.
        </p>
      </div>

      {/* Success */}
      {success && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">
            Loading pickup schedules...
          </p>
        </div>
      ) : pickups.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
            <span className="text-2xl">📦</span>
          </div>

          <h2 className="text-lg font-semibold text-gray-800">
            No pickup schedules
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Pickup schedules created by NGOs will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {pickups.map((pickup) => (
            <div
              key={pickup.id}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              {/* Top section */}
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Pickup #{pickup.id}
                    </h2>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
                        pickup.status
                      )}`}
                    >
                      {pickup.status.replaceAll("_", " ")}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-gray-500">
                    Donation #{pickup.donation_id} · Match #
                    {pickup.match_id}
                  </p>
                </div>
              </div>

              {/* Details */}
              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    NGO
                  </p>

                  <p className="mt-1 font-medium text-gray-900">
                    NGO #{pickup.ngo_id}
                  </p>
                </div>

                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Pickup Location
                  </p>

                  <p className="mt-1 font-medium text-gray-900">
                    {pickup.pickup_location || "Not specified"}
                  </p>
                </div>

                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Scheduled Start
                  </p>

                  <p className="mt-1 font-medium text-gray-900">
                    {formatDateTime(pickup.scheduled_start)}
                  </p>
                </div>

                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Scheduled End
                  </p>

                  <p className="mt-1 font-medium text-gray-900">
                    {formatDateTime(pickup.scheduled_end)}
                  </p>
                </div>

                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    NGO Confirmation
                  </p>

                  <p
                    className={`mt-1 font-semibold ${getConfirmationClass(
                      pickup.ngo_confirmation
                    )}`}
                  >
                    {pickup.ngo_confirmation}
                  </p>
                </div>

                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Business Confirmation
                  </p>

                  <p
                    className={`mt-1 font-semibold ${getConfirmationClass(
                      pickup.business_confirmation
                    )}`}
                  >
                    {pickup.business_confirmation}
                  </p>
                </div>
              </div>

              {/* Contact Details */}
              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">

                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                    NGO / Pickup Person
                  </p>

                  <p className="mt-2 text-sm font-bold text-gray-900">
                    {pickup.ngo_organization_name || `NGO #${pickup.ngo_id}`}
                  </p>

                  <div className="mt-3 space-y-1 text-sm text-gray-700">
                    <p><span className="font-medium">Person:</span> {pickup.pickup_person_name || pickup.ngo_contact_name || "Not available"}</p>
                    <p><span className="font-medium">Phone:</span> {pickup.pickup_person_phone || pickup.ngo_contact_phone || "Not available"}</p>
                    <p><span className="font-medium">Email:</span> {pickup.pickup_person_email || pickup.ngo_contact_email || "Not available"}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                    Donation
                  </p>

                  <p className="mt-2 text-sm font-bold text-gray-900">
                    {pickup.donor_organization_name || "This business"}
                  </p>

                  <div className="mt-3 space-y-1 text-sm text-gray-700">
                    <p><span className="font-medium">Owner:</span> {pickup.donor_owner_name || "Not available"}</p>
                    <p><span className="font-medium">Contact:</span> {pickup.donor_owner_phone || pickup.donor_owner_email || "Not available"}</p>
                  </div>
                </div>

              </div>

              {/* Notes */}
              {pickup.notes && (
                <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Notes
                  </p>

                  <p className="mt-1 text-sm text-gray-700">
                    {pickup.notes}
                  </p>
                </div>
              )}

              {/* Actions */}
              {pickup.status !== "COMPLETED" &&
                pickup.status !== "CANCELLED" && (
                <div className="mt-5 flex flex-wrap gap-3 border-t border-gray-100 pt-5">
                  {pickup.business_confirmation !== "CONFIRMED" && (
                    <button
                      onClick={() => handleConfirm(pickup.id)}
                      disabled={actionLoading === pickup.id}
                      className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {actionLoading === pickup.id
                        ? "Processing..."
                        : "Confirm Pickup"}
                    </button>
                  )}

                  {pickup.status === "READY_FOR_PICKUP" &&
                    pickup.business_confirmation === "CONFIRMED" &&
                    pickup.ngo_confirmation === "CONFIRMED" && (
                    <button
                      onClick={() => handleComplete(pickup.id)}
                      disabled={actionLoading === pickup.id}
                      className="rounded-lg bg-emerald-700 px-5 py-2 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {actionLoading === pickup.id
                        ? "Processing..."
                        : "Mark as Donated"}
                    </button>
                  )}

                  <button
                    onClick={() => handleCancel(pickup.id)}
                    disabled={actionLoading === pickup.id}
                    className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel Pickup
                  </button>
                </div>
              )}

              {pickup.status === "COMPLETED" && (
                <div className="mt-5 border-t border-emerald-100 pt-5">
                  <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
                    ✓ Donated
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}