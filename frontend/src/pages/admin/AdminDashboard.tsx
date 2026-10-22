
import { useEffect, useState } from "react";
import type { AdminUser } from "../../types/auth";
import {
  approveUser,
  getAdminStats,
  getAdminUsers,
  rejectUser,
  reactivateUser,
  suspendUser,
  removeUser,
} from "../../services/adminApi";

type ModalType = "REJECT" | "SUSPEND" | "REMOVE" | null;

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filter, setFilter] = useState("PENDING");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [modal, setModal] = useState<ModalType>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [reason, setReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  async function load() {
    try {
      const [s, u] = await Promise.all([
        getAdminStats(),
        getAdminUsers({ status: filter }),
      ]);

      setStats(s);
      setUsers(u);
      setError("");
    } catch (e: any) {
      setError(
        e?.response?.data?.detail || "Failed to load admin data."
      );
    }
  }

  useEffect(() => {
    load();
  }, [filter]);

  function closeModal() {
    if (actionLoading) return;

    setModal(null);
    setSelectedUser(null);
    setReason("");
  }

  function openModal(type: ModalType, user: AdminUser) {
    setSelectedUser(user);
    setModal(type);
    setReason("");
    setError("");
    setSuccess("");
  }

  async function executeAction() {
    if (!selectedUser || !modal || actionLoading) return;

    const currentUser = selectedUser;
    const currentModal = modal;
    const currentReason = reason.trim() || undefined;
    const organizationName = currentUser.organization_name || "Account";

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      if (currentModal === "REJECT") {
        await rejectUser(currentUser.id, currentReason);

        setSuccess(`${organizationName} has been rejected.`);
      } else if (currentModal === "SUSPEND") {
        await suspendUser(currentUser.id, currentReason);

        setSuccess(`${organizationName} has been suspended.`);
      } else if (currentModal === "REMOVE") {
        const result = await removeUser(currentUser.id);

        if (result?.action === "suspended") {
          setSuccess(
            `${organizationName} has been suspended because it has operational records. All inventory, transactions, and donations have been preserved.`
          );
        } else {
          setSuccess(
            `${organizationName} has been permanently removed.`
          );
        }
      }

      // Close the modal directly because actionLoading is still true here.
      setModal(null);
      setSelectedUser(null);
      setReason("");

      await load();
    } catch (e: any) {
      setError(
        e?.response?.data?.detail ||
          "Action failed. Please try again."
      );

      // Close the modal but keep the error visible on the dashboard.
      setModal(null);
      setSelectedUser(null);
      setReason("");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleApprove(user: AdminUser) {
    try {
      setError("");
      setSuccess("");

      await approveUser(user.id);

      setSuccess(
        `${user.organization_name || "Account"} has been approved.`
      );

      await load();
    } catch (e: any) {
      setError(
        e?.response?.data?.detail || "Failed to approve account."
      );
    }
  }

  async function handleReactivate(user: AdminUser) {
    try {
      setError("");
      setSuccess("");

      await reactivateUser(user.id);

      setSuccess(
        `${user.organization_name || "Account"} has been reactivated.`
      );

      await load();
    } catch (e: any) {
      setError(
        e?.response?.data?.detail || "Failed to reactivate account."
      );
    }
  }

  return (
    <>
      <div className="space-y-6">
        {/* HEADER */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Admin Dashboard
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Verify and manage platform organizations.
          </p>
        </div>

        {/* SUCCESS MESSAGE */}
        {success && (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-sm">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              ✓
            </div>

            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-800">
                Success
              </p>

              <p className="mt-0.5 text-sm text-emerald-700">
                {success}
              </p>
            </div>

            <button
              onClick={() => setSuccess("")}
              aria-label="Dismiss success message"
              className="text-emerald-500 transition hover:text-emerald-700"
            >
              ×
            </button>
          </div>
        )}

        {/* ERROR MESSAGE */}
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 shadow-sm">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
              !
            </div>

            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800">
                Something went wrong
              </p>

              <p className="mt-0.5 text-sm text-red-700">
                {error}
              </p>
            </div>

            <button
              onClick={() => setError("")}
              aria-label="Dismiss error message"
              className="text-red-500 transition hover:text-red-700"
            >
              ×
            </button>
          </div>
        )}

        {/* STATS */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            [
              "Pending Businesses Verification",
              stats?.pending_tenants,
            ],
            ["Pending NGOs Verification", stats?.pending_ngos],
            ["Active Businesses", stats?.active_tenants],
            ["Active NGOs", stats?.active_ngos],
            ["Suspended", stats?.suspended_users],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {label}
              </p>

              <p className="mt-2 text-3xl font-bold text-slate-900">
                {value ?? "—"}
              </p>
            </div>
          ))}
        </div>

        {/* ORGANIZATION ACCOUNTS */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-slate-900">
                Organization accounts
              </h2>

              <p className="text-xs text-slate-500">
                Approve, reject, suspend or reactivate accounts.
              </p>
            </div>

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
            >
              <option value="PENDING">Pending</option>
              <option value="ACTIVE">Active</option>
              <option value="REJECTED">Rejected</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Organization</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Contact</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="transition hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-4 font-semibold text-slate-800">
                      {u.organization_name || "—"}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {u.role}
                    </td>

                    <td className="px-5 py-4">
                      <div className="text-slate-700">
                        {u.full_name}
                      </div>

                      <div className="text-xs text-slate-400">
                        {u.email}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        {u.status}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        {/* PENDING */}
                        {u.status === "PENDING" && (
                          <>
                            <button
                              onClick={() => handleApprove(u)}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700"
                            >
                              Approve
                            </button>

                            <button
                              onClick={() => openModal("REJECT", u)}
                              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-red-700"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {/* ACTIVE */}
                        {u.status === "ACTIVE" && (
                          <button
                            onClick={() => openModal("SUSPEND", u)}
                            className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-amber-600"
                          >
                            Suspend
                          </button>
                        )}

                        {/* SUSPENDED */}
                        {u.status === "SUSPENDED" && (
                          <button
                            onClick={() => handleReactivate(u)}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700"
                          >
                            Reactivate
                          </button>
                        )}

                        {/* REMOVE */}
                        {u.status !== "ACTIVE" && (
                          <button
                            onClick={() => openModal("REMOVE", u)}
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-50"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {!users.length && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-10 text-center text-slate-400"
                    >
                      No accounts in this status.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL OVERLAY */}
      {modal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
            {/* MODAL HEADER */}
            <div className="border-b border-slate-100 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {modal === "REJECT" && "Reject organization"}
                    {modal === "SUSPEND" && "Suspend organization"}
                    {modal === "REMOVE" && "Remove organization"}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {selectedUser.organization_name || "Organization"}
                  </p>
                </div>

                <button
                  onClick={closeModal}
                  disabled={actionLoading}
                  aria-label="Close dialog"
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* MODAL BODY */}
            <div className="px-6 py-5">
              {/* REJECT */}
              {modal === "REJECT" && (
                <>
                  <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-4">
                    <p className="text-sm font-semibold text-red-800">
                      Reject this organization?
                    </p>

                    <p className="mt-1 text-xs leading-5 text-red-600">
                      The organization will not be approved and will remain
                      unavailable on the platform.
                    </p>
                  </div>

                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Reason
                    <span className="ml-1 font-normal text-slate-400">
                      (optional)
                    </span>
                  </label>

                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={4}
                    placeholder="Enter the reason for rejection..."
                    className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-red-400 focus:ring-4 focus:ring-red-50"
                  />
                </>
              )}

              {/* SUSPEND */}
              {modal === "SUSPEND" && (
                <>
                  <div className="mb-4 rounded-xl border border-amber-100 bg-amber-50 p-4">
                    <p className="text-sm font-semibold text-amber-800">
                      Suspend this organization?
                    </p>

                    <p className="mt-1 text-xs leading-5 text-amber-700">
                      The organization will temporarily lose access to the
                      platform until it is reactivated. Its existing records
                      will be retained.
                    </p>
                  </div>

                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Reason
                    <span className="ml-1 font-normal text-slate-400">
                      (optional)
                    </span>
                  </label>

                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={4}
                    placeholder="Enter the reason for suspension..."
                    className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-50"
                  />
                </>
              )}

              {/* REMOVE */}
              {modal === "REMOVE" && (
                <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-800">
                    Remove this organization?
                  </p>

                  <p className="mt-2 text-sm leading-6 text-amber-700">
                    <strong>
                      {selectedUser.organization_name || "This organization"}
                    </strong>{" "}
                    will be permanently removed only if it has no operational
                    records and meets the existing removal rules.
                  </p>

                  <p className="mt-2 text-sm leading-6 text-amber-700">
                    If this business has inventory, transactions, or donations,
                    its account will be suspended instead. Those records will
                    be preserved.
                  </p>
                </div>
              )}
            </div>

            {/* MODAL FOOTER */}
            <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
              <button
                onClick={closeModal}
                disabled={actionLoading}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                onClick={executeAction}
                disabled={actionLoading}
                className={`rounded-xl px-4 py-2.5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  modal === "SUSPEND"
                    ? "bg-amber-500 hover:bg-amber-600"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {actionLoading
                  ? "Processing..."
                  : modal === "REJECT"
                    ? "Reject Organization"
                    : modal === "SUSPEND"
                      ? "Suspend Organization"
                      : "Continue"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
