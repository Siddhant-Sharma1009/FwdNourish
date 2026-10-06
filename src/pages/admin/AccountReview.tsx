import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";


import {
  approveUser,
  getAdminUser,
  reactivateUser,
  rejectUser,
  removeUser,
  suspendUser,
  type AdminUserDetails,
} from "../../services/adminApi";

type ActionType =
  | "REJECT"
  | "SUSPEND"
  | "REMOVE"
  | null;

export default function AccountReview() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [user, setUser] =
    useState<AdminUserDetails | null>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [modal, setModal] =
    useState<ActionType>(null);

  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!userId) {
      setError("Invalid account.");
      setLoading(false);
      return;
    }

    loadUser(Number(userId));
  }, [userId]);

  async function loadUser(id: number) {
    try {
      setLoading(true);
      setError("");

      const result = await getAdminUser(id);

      setUser(result);
    } catch (e: any) {
      setError(
        e?.response?.data?.detail ||
          "Failed to load account details."
      );
    } finally {
      setLoading(false);
    }
  }

  function closeModal() {
    if (actionLoading) return;

    setModal(null);
    setReason("");
  }

  async function handleApprove() {
    if (!user) return;

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      const updated = await approveUser(user.id);

      setUser((previous) =>
        previous
          ? {
              ...previous,
              status: updated.status,
              rejection_reason:
                updated.rejection_reason,
            }
          : previous
      );

      setSuccess(
        "The account has been approved successfully."
      );
    } catch (e: any) {
      setError(
        e?.response?.data?.detail ||
          "Failed to approve account."
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReactivate() {
    if (!user) return;

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      const updated =
        await reactivateUser(user.id);

      setUser((previous) =>
        previous
          ? {
              ...previous,
              status: updated.status,
              rejection_reason:
                updated.rejection_reason,
            }
          : previous
      );

      setSuccess(
        "The account has been reactivated successfully."
      );
    } catch (e: any) {
      setError(
        e?.response?.data?.detail ||
          "Failed to reactivate account."
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function executeAction() {
    if (!user || !modal) return;

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      if (modal === "REJECT") {
        const updated = await rejectUser(
          user.id,
          reason.trim() || undefined
        );

        setUser((previous) =>
          previous
            ? {
                ...previous,
                status: updated.status,
                rejection_reason:
                  updated.rejection_reason,
              }
            : previous
        );

        setSuccess(
          "The account has been rejected."
        );
      }

      if (modal === "SUSPEND") {
        const updated = await suspendUser(
          user.id,
          reason.trim() || undefined
        );

        setUser((previous) =>
          previous
            ? {
                ...previous,
                status: updated.status,
                rejection_reason:
                  updated.rejection_reason,
              }
            : previous
        );

        setSuccess(
          "The account has been suspended."
        );
      }

      if (modal === "REMOVE") {
        await removeUser(user.id);

        navigate("/admin", {
          replace: true,
          state: {
            message:
              "Account removed successfully.",
          },
        });

        return;
      }

      closeModal();
    } catch (e: any) {
      setError(
        e?.response?.data?.detail ||
          "Action failed. Please try again."
      );
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />

          <p className="mt-3 text-sm text-slate-500">
            Loading account details...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl py-12">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <h1 className="font-bold text-red-900">
            Account could not be loaded
          </h1>

          <p className="mt-2 text-sm text-red-700">
            {error || "Account not found."}
          </p>

          <Link
            to="/admin"
            className="mt-5 inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Back to Admin Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-6xl space-y-6">

        {/* =====================================================
            HEADER
        ====================================================== */}

        <div>
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-emerald-600"
          >
            ← Back to accounts
          </Link>

          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                Account review
              </p>

              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                {user.organization_name ||
                  user.full_name}
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Review the submitted information before
                taking an administrative action.
              </p>
            </div>

            <StatusBadge status={user.status} />
          </div>
        </div>

        {/* =====================================================
            MESSAGES
        ====================================================== */}

        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {success}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {/* =====================================================
            ACCOUNT
        ====================================================== */}

        <Section
          title="Account information"
          description="Basic identity and authentication information."
        >
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Info label="Account ID" value={`${user.id}`} />

            <Info
              label="Account type"
              value={user.role}
            />

            <Info
              label="Status"
              value={user.status}
            />

            <Info
              label="Registered"
              value={formatDate(user.created_at)}
            />

            <Info
              label="Full name"
              value={user.full_name}
            />

            <Info
              label="Email"
              value={user.email}
            />

            <Info
              label="Phone"
              value={user.phone}
            />

            <Info
              label="Tenant ID"
              value={
                user.tenant_id
                  ? String(user.tenant_id)
                  : null
              }
            />
          </div>
        </Section>

        {/* =====================================================
            ORGANIZATION
        ====================================================== */}

        <Section
          title={
            user.role === "NGO"
              ? "Organization information"
              : "Business information"
          }
          description="Information submitted during registration."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Info
              label={
                user.role === "NGO"
                  ? "Organization name"
                  : "Business name"
              }
              value={user.organization_name}
            />

            <Info
              label="Business type"
              value={user.business_type}
            />

            <Info
              label="Registration number"
              value={user.registration_number}
            />

            {user.role === "NGO" && (
              <Info
                label="Service radius"
                value={
                  user.service_radius_km != null
                    ? `${user.service_radius_km} km`
                    : null
                }
              />
            )}
          </div>

          <div className="mt-5">
            <Info
              label="Description"
              value={user.description}
              multiline
            />
          </div>
        </Section>

        {/* =====================================================
            LOCATION
        ====================================================== */}

        <Section
          title="Location"
          description="Registered organization location."
        >
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Info
              label="Address"
              value={user.address}
              className="lg:col-span-2"
            />

            <Info
              label="City"
              value={user.city}
            />

            <Info
              label="State"
              value={user.state}
            />

            <Info
              label="Pincode"
              value={user.pincode}
            />

            <Info
              label="Latitude"
              value={
                user.latitude != null
                  ? String(user.latitude)
                  : null
              }
            />

            <Info
              label="Longitude"
              value={
                user.longitude != null
                  ? String(user.longitude)
                  : null
              }
            />
          </div>

          {user.google_maps_link && (
            <a
              href={user.google_maps_link}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700"
            >
              Open Google Maps
              <span>↗</span>
            </a>
          )}
        </Section>

        {/* =====================================================
            ONLINE PRESENCE
        ====================================================== */}

        <Section
          title="Online presence"
          description="Public links provided during registration."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <LinkInfo
              label="Website"
              value={user.website}
            />

            <LinkInfo
              label="Instagram"
              value={user.instagram}
            />

            <LinkInfo
              label="Facebook"
              value={user.facebook}
            />

            <LinkInfo
              label="LinkedIn"
              value={user.linkedin}
            />
          </div>
        </Section>

        {/* =====================================================
            VERIFICATION
        ====================================================== */}

        <Section
          title="Verification history"
          description="Administrator verification information."
        >
          <div className="grid gap-5 sm:grid-cols-3">
            <Info
              label="Verified at"
              value={
                user.verified_at
                  ? formatDate(user.verified_at)
                  : null
              }
            />

            <Info
              label="Verified by"
              value={
                user.verified_by != null
                  ? `Admin #${user.verified_by}`
                  : null
              }
            />

            <Info
              label="Previous rejection reason"
              value={user.rejection_reason}
            />
          </div>
        </Section>

        {/* =====================================================
            ADMIN ACTIONS
        ====================================================== */}

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="font-bold text-slate-900">
              Administrative decision
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Choose the appropriate action for this account.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 px-6 py-5">
            {user.status === "PENDING" && (
              <>
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  Approve account
                </button>

                <button
                  onClick={() => setModal("REJECT")}
                  disabled={actionLoading}
                  className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
                >
                  Reject account
                </button>
              </>
            )}

            {user.status === "ACTIVE" && (
              <button
                onClick={() => setModal("SUSPEND")}
                disabled={actionLoading}
                className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-amber-600 disabled:opacity-50"
              >
                Suspend account
              </button>
            )}

            {user.status === "SUSPENDED" && (
              <button
                onClick={handleReactivate}
                disabled={actionLoading}
                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                Reactivate account
              </button>
            )}

            {user.status !== "ACTIVE" && (
              <button
                onClick={() => setModal("REMOVE")}
                disabled={actionLoading}
                className="rounded-xl border border-red-200 px-5 py-3 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
              >
                Remove account
              </button>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================
          ACTION MODAL
      ====================================================== */}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">

            <div className="border-b border-slate-100 px-6 py-5">
              <h3 className="text-lg font-bold text-slate-900">
                {modal === "REJECT" &&
                  "Reject account"}

                {modal === "SUSPEND" &&
                  "Suspend account"}

                {modal === "REMOVE" &&
                  "Remove account"}
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                {user.organization_name ||
                  user.full_name}
              </p>
            </div>

            <div className="px-6 py-5">
              {modal === "REMOVE" ? (
                <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                  <p className="text-sm font-semibold text-red-800">
                    Permanently remove this account?
                  </p>

                  <p className="mt-2 text-sm leading-6 text-red-700">
                    This action cannot be undone.
                  </p>
                </div>
              ) : (
                <>
                  <p className="mb-4 text-sm leading-6 text-slate-600">
                    {modal === "REJECT"
                      ? "Provide a reason for rejecting this registration."
                      : "Provide a reason for suspending this account."}
                  </p>

                  <textarea
                    value={reason}
                    onChange={(e) =>
                      setReason(e.target.value)
                    }
                    rows={4}
                    placeholder={
                      modal === "REJECT"
                        ? "Reason for rejection..."
                        : "Reason for suspension..."
                    }
                    className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
                  />
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button
                onClick={closeModal}
                disabled={actionLoading}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                onClick={executeAction}
                disabled={actionLoading}
                className={`rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50 ${
                  modal === "SUSPEND"
                    ? "bg-amber-500 hover:bg-amber-600"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {actionLoading
                  ? "Processing..."
                  : modal === "REJECT"
                    ? "Reject account"
                    : modal === "SUSPEND"
                      ? "Suspend account"
                      : "Remove permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* =========================================================
   SMALL COMPONENTS
========================================================= */

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-5">
        <h2 className="font-bold text-slate-900">
          {title}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {description}
        </p>
      </div>

      <div className="px-6 py-5">
        {children}
      </div>
    </section>
  );
}

function Info({
  label,
  value,
  multiline = false,
  className = "",
}: {
  label: string;
  value?: string | null;
  multiline?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p
        className={`mt-1.5 text-sm font-medium text-slate-800 ${
          multiline
            ? "whitespace-pre-wrap leading-6"
            : "break-words"
        }`}
      >
        {value || "Not provided"}
      </p>
    </div>
  );
}

function LinkInfo({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      {value ? (
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          className="mt-1.5 block break-all text-sm font-medium text-emerald-700 hover:underline"
        >
          {value}
        </a>
      ) : (
        <p className="mt-1.5 text-sm font-medium text-slate-400">
          Not provided
        </p>
      )}
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const styles: Record<string, string> = {
    PENDING:
      "bg-amber-50 text-amber-700 border-amber-200",
    ACTIVE:
      "bg-emerald-50 text-emerald-700 border-emerald-200",
    SUSPENDED:
      "bg-orange-50 text-orange-700 border-orange-200",
    REJECTED:
      "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <span
      className={`inline-flex w-fit rounded-full border px-3 py-1.5 text-xs font-bold ${
        styles[status] ||
        "bg-slate-50 text-slate-600 border-slate-200"
      }`}
    >
      {status}
    </span>
  );
}

function formatDate(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}