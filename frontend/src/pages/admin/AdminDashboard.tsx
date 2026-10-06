import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

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

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "ACTIVE", label: "Active" },
  { value: "REJECTED", label: "Rejected" },
  { value: "SUSPENDED", label: "Suspended" },
];

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filter, setFilter] = useState("PENDING");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [modal, setModal] = useState<ModalType>(null);
  const [selectedUser, setSelectedUser] =
    useState<AdminUser | null>(null);

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
        e?.response?.data?.detail ||
        "Failed to load admin data."
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

  function openModal(
    type: ModalType,
    user: AdminUser
  ) {
    setSelectedUser(user);
    setModal(type);
    setReason("");
    setError("");
    setSuccess("");
  }

  async function executeAction() {
    if (!selectedUser || !modal) return;

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      if (modal === "REJECT") {
        await rejectUser(
          selectedUser.id,
          reason.trim() || undefined
        );

        setSuccess(
          `${selectedUser.organization_name || "Account"} has been rejected.`
        );
      }

      if (modal === "SUSPEND") {
        await suspendUser(
          selectedUser.id,
          reason.trim() || undefined
        );

        setSuccess(
          `${selectedUser.organization_name || "Account"} has been suspended.`
        );
      }

      if (modal === "REMOVE") {
        await removeUser(selectedUser.id);

        setSuccess(
          `${selectedUser.organization_name || "Account"} has been permanently removed.`
        );
      }

      closeModal();
      await load();
    } catch (e: any) {
      setError(
        e?.response?.data?.detail ||
        "Action failed. Please try again."
      );

      closeModal();
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
        e?.response?.data?.detail ||
        "Failed to approve account."
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
        e?.response?.data?.detail ||
        "Failed to reactivate account."
      );
    }
  }

  return (
    <>
      <div className="space-y-4 pb-24 md:space-y-6 md:pb-0">

        <header className="px-1 pb-0 pt-3 sm:pt-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                Admin{" "}
                <span className="bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
                  Dashboard
                </span>
              </h2>

              <p className="mt-1 max-w-xl text-sm text-slate-600 sm:text-base">
                Review, verify and manage platform organizations.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">

            </div>
          </div>

          {/* Styled divider */}
          <div className="relative mb-4 mt-4 hidden sm:mb-6 sm:mt-5 md:block">
            <div className="h-px w-full bg-gradient-to-r from-slate-300 via-slate-200 to-transparent dark:from-slate-600 dark:via-slate-700" />
            <div className="absolute left-0 top-0 h-[2px] w-16 -translate-y-1/2 rounded-full bg-gradient-to-r from-amber-500 to-orange-600" />
          </div>
        </header>


        {/* =====================================================
            SUCCESS MESSAGE
        ====================================================== */}

        {success && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-sm md:rounded-xl">
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
              type="button"
              onClick={() => setSuccess("")}
              aria-label="Dismiss"
              className="-m-2 p-2 text-emerald-500 transition hover:text-emerald-700 md:m-0 md:p-0"
            >
              ×
            </button>
          </div>
        )}

        {/* =====================================================
            ERROR MESSAGE
        ====================================================== */}

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 shadow-sm md:rounded-xl">
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
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss"
              className="-m-2 p-2 text-red-500 transition hover:text-red-700 md:m-0 md:p-0"
            >
              ×
            </button>
          </div>
        )}

        {/* =====================================================
            STATS
        ====================================================== */}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-5">
          {[
            [
              "Pending Businesses Verification",
              stats?.pending_tenants,
            ],
            [
              "Pending NGOs Verification",
              stats?.pending_ngos,
            ],
            [
              "Active Businesses",
              stats?.active_tenants,
            ],
            [
              "Active NGOs",
              stats?.active_ngos,
            ],
            [
              "Suspended",
              stats?.suspended_users,
            ],
          ].map(([label, value], index) => (
            <div
              key={String(label)}
              className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${index === 4 ? "col-span-2 sm:col-span-1" : ""}`}
            >
              <p className="text-[11px] font-semibold uppercase leading-4 tracking-wide text-slate-400 sm:text-xs">
                {label}
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
                {value ?? "—"}
              </p>
            </div>
          ))}
        </div>

        {/* =====================================================
            ORGANIZATION ACCOUNTS
        ====================================================== */}

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

          {/* TABLE HEADER */}

          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between md:p-5">
            <div>
              <h2 className="font-bold text-slate-900">
                Organization accounts
              </h2>

              <p className="text-xs text-slate-500">
                Review account details and perform administrative actions.
              </p>
            </div>

            {/* Mobile: status chips */}
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilter(option.value)}
                  className={`min-h-[40px] shrink-0 rounded-full px-4 text-sm font-semibold transition active:scale-95 ${
                    filter === option.value
                      ? "bg-slate-900 text-white shadow"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* Desktop: original dropdown */}
            <select
              value={filter}
              onChange={(e) =>
                setFilter(e.target.value)
              }
              className="hidden rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100 md:block"
            >
              <option value="PENDING">
                Pending
              </option>

              <option value="ACTIVE">
                Active
              </option>

              <option value="REJECTED">
                Rejected
              </option>

              <option value="SUSPENDED">
                Suspended
              </option>
            </select>
          </div>

          {/* MOBILE: account cards */}

          <div className="space-y-3 bg-slate-50/60 p-3 md:hidden">
            {users.map((u) => (
              <article
                key={u.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-base font-bold text-white">
                    {(u.organization_name || u.full_name || "?")
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[15px] font-semibold text-slate-900">
                      {u.organization_name || "—"}
                    </h3>

                    <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                      {u.role === "TENANT" ? "BUSINESS" : u.role}
                    </span>
                  </div>

                  <StatusBadge status={u.status} />
                </div>

                <div className="mt-3 space-y-1 rounded-xl bg-slate-50 p-3">
                  <p className="text-sm font-medium text-slate-800">
                    {u.full_name}
                  </p>

                  <a
                    href={`mailto:${u.email}`}
                    className="block truncate text-xs text-slate-500"
                  >
                    {u.email}
                  </a>

                  {u.phone && (
                    <a
                      href={`tel:${u.phone}`}
                      className="block text-xs text-slate-500"
                    >
                      {u.phone}
                    </a>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/accounts/${u.id}`)}
                    className="min-h-[44px] flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 transition active:scale-[0.97] active:bg-slate-50"
                  >
                    Review
                  </button>

                  {u.status === "PENDING" && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleApprove(u)}
                        className="min-h-[44px] flex-1 rounded-xl bg-emerald-600 px-3 text-sm font-bold text-white transition active:scale-[0.97]"
                      >
                        Approve
                      </button>

                      <button
                        type="button"
                        onClick={() => openModal("REJECT", u)}
                        className="min-h-[44px] flex-1 rounded-xl bg-red-600 px-3 text-sm font-bold text-white transition active:scale-[0.97]"
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {u.status === "ACTIVE" && (
                    <button
                      type="button"
                      onClick={() => openModal("SUSPEND", u)}
                      className="min-h-[44px] flex-1 rounded-xl bg-amber-500 px-3 text-sm font-bold text-white transition active:scale-[0.97]"
                    >
                      Suspend
                    </button>
                  )}

                  {u.status === "SUSPENDED" && (
                    <button
                      type="button"
                      onClick={() => handleReactivate(u)}
                      className="min-h-[44px] flex-1 rounded-xl bg-emerald-600 px-3 text-sm font-bold text-white transition active:scale-[0.97]"
                    >
                      Reactivate
                    </button>
                  )}

                  {u.status !== "ACTIVE" && (
                    <button
                      type="button"
                      onClick={() => openModal("REMOVE", u)}
                      className="min-h-[44px] flex-1 rounded-xl border border-red-200 bg-white px-3 text-sm font-bold text-red-700 transition active:scale-[0.97] active:bg-red-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </article>
            ))}

            {!users.length && (
              <div className="px-4 py-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl">
                  ✓
                </div>

                <p className="mt-3 font-semibold text-slate-700">
                  No accounts found
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  There are no organization accounts in the{" "}
                  {filter.toLowerCase()} status.
                </p>
              </div>
            )}
          </div>

          {/* TABLE (desktop) */}

          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full text-left text-sm">

              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">
                    Organization
                  </th>

                  <th className="px-5 py-3">
                    Type
                  </th>

                  <th className="px-5 py-3">
                    Contact
                  </th>

                  <th className="px-5 py-3">
                    Status
                  </th>

                  <th className="px-5 py-3">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">

                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="transition hover:bg-slate-50/70"
                  >

                    {/* ORGANIZATION */}

                    <td className="px-5 py-4 font-semibold text-slate-800">
                      {u.organization_name || "—"}
                    </td>

                    {/* TYPE */}

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        {u.role === "TENANT" ? "BUSINESS" : u.role}
                      </span>
                    </td>

                    {/* CONTACT */}

                    <td className="px-5 py-4">
                      <div className="text-slate-700">
                        {u.full_name}
                      </div>

                      <div className="text-xs text-slate-400">
                        {u.email}
                      </div>

                      {u.phone && (
                        <div className="mt-0.5 text-xs text-slate-400">
                          {u.phone}
                        </div>
                      )}
                    </td>

                    {/* STATUS */}

                    <td className="px-5 py-4">
                      <StatusBadge
                        status={u.status}
                      />
                    </td>

                    {/* ACTIONS */}

                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">

                        {/* =================================================
                            REVIEW
                        ================================================== */}

                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/admin/accounts/${u.id}`
                            )
                          }
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700"
                        >
                          Review
                        </button>

                        {/* =================================================
                            PENDING ACTIONS
                        ================================================== */}

                        {u.status === "PENDING" && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                handleApprove(u)
                              }
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700"
                            >
                              Approve
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                openModal(
                                  "REJECT",
                                  u
                                )
                              }
                              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-red-700"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {/* =================================================
                            ACTIVE ACTION
                        ================================================== */}

                        {u.status === "ACTIVE" && (
                          <button
                            type="button"
                            onClick={() =>
                              openModal(
                                "SUSPEND",
                                u
                              )
                            }
                            className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-amber-600"
                          >
                            Suspend
                          </button>
                        )}

                        {/* =================================================
                            SUSPENDED ACTION
                        ================================================== */}

                        {u.status === "SUSPENDED" && (
                          <button
                            type="button"
                            onClick={() =>
                              handleReactivate(u)
                            }
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700"
                          >
                            Reactivate
                          </button>
                        )}

                        {/* =================================================
                            REMOVE
                        ================================================== */}

                        {u.status !== "ACTIVE" && (
                          <button
                            type="button"
                            onClick={() =>
                              openModal(
                                "REMOVE",
                                u
                              )
                            }
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-50"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {/* EMPTY STATE */}

                {!users.length && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-12 text-center"
                    >
                      <div className="mx-auto max-w-sm">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl">
                          ✓
                        </div>

                        <p className="mt-3 font-semibold text-slate-700">
                          No accounts found
                        </p>

                        <p className="mt-1 text-sm text-slate-400">
                          There are no organization accounts in the{" "}
                          {filter.toLowerCase()} status.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}

              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* =====================================================
          MODAL OVERLAY (mobile: bottom sheet · desktop: dialog)
      ====================================================== */}

      {modal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 px-0 backdrop-blur-sm md:items-center md:px-4">

          <div className="w-full max-w-md rounded-t-3xl border border-slate-200 bg-white shadow-2xl md:rounded-2xl">

            {/* Mobile sheet handle */}
            <div className="flex justify-center pt-2 md:hidden">
              <span className="h-1.5 w-10 rounded-full bg-slate-300" />
            </div>

            {/* MODAL HEADER */}

            <div className="border-b border-slate-100 px-6 py-5">
              <div className="flex items-start justify-between gap-4">

                <div>
                  <h3 className="text-lg font-bold text-slate-900">

                    {modal === "REJECT" &&
                      "Reject organization"}

                    {modal === "SUSPEND" &&
                      "Suspend organization"}

                    {modal === "REMOVE" &&
                      "Remove organization"}

                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {selectedUser.organization_name ||
                      "Organization"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={actionLoading}
                  aria-label="Close"
                  className="rounded-lg p-2.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 md:p-1.5"
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
                      The organization will not be approved
                      and will remain unavailable on the
                      platform.
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
                    onChange={(e) =>
                      setReason(e.target.value)
                    }
                    rows={4}
                    placeholder="Enter the reason for rejection..."
                    className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition placeholder:text-slate-400 focus:border-red-400 focus:ring-4 focus:ring-red-50 md:text-sm"
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
                      The organization will temporarily lose
                      access to the platform until it is
                      reactivated.
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
                    onChange={(e) =>
                      setReason(e.target.value)
                    }
                    rows={4}
                    placeholder="Enter the reason for suspension..."
                    className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-50 md:text-sm"
                  />
                </>
              )}

              {/* REMOVE */}

              {modal === "REMOVE" && (
                <div className="rounded-xl border border-red-100 bg-red-50 p-4">

                  <p className="text-sm font-semibold text-red-800">
                    Permanently remove this account?
                  </p>

                  <p className="mt-2 text-sm leading-6 text-red-700">
                    This action will permanently remove{" "}
                    <strong>
                      {selectedUser.organization_name ||
                        "this organization"}
                    </strong>{" "}
                    from the platform.
                  </p>

                  <p className="mt-2 text-xs font-semibold text-red-600">
                    This action cannot be undone.
                  </p>

                </div>
              )}
            </div>

            {/* MODAL FOOTER */}

            <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:pb-4">

              <button
                type="button"
                onClick={closeModal}
                disabled={actionLoading}
                className="min-h-[48px] flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 md:min-h-0 md:flex-none"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={executeAction}
                disabled={actionLoading}
                className={`min-h-[48px] flex-1 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60 md:min-h-0 md:flex-none ${modal === "SUSPEND"
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
                      : "Remove Permanently"}
              </button>

            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const styles: Record<string, string> = {
    PENDING:
      "border-amber-200 bg-amber-50 text-amber-700",

    ACTIVE:
      "border-emerald-200 bg-emerald-50 text-emerald-700",

    SUSPENDED:
      "border-orange-200 bg-orange-50 text-orange-700",

    REJECTED:
      "border-red-200 bg-red-50 text-red-700",
  };

  return (
    <span
      className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[status] ||
        "border-slate-200 bg-slate-100 text-slate-600"
        }`}
    >
      {status}
    </span>
  );
}