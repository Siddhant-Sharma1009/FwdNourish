import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import type { AdminUser } from "../../types/auth";
import { getAdminUsers } from "../../services/adminApi";

export type AdminAccountStatus =
  | "PENDING"
  | "ACTIVE"
  | "SUSPENDED"
  | "REJECTED";

interface AdminAccountStatusPageProps {
  status: AdminAccountStatus;
  title: string;
  description: string;
  accent: "amber" | "emerald" | "orange" | "red";
}

const STATUS_CONFIG: Record<
  AdminAccountStatus,
  {
    label: string;
    badge: string;
    dot: string;
    emptyTitle: string;
    emptyDescription: string;
  }
> = {
  PENDING: {
    label: "Pending Verification",
    badge: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
    emptyTitle: "No pending accounts",
    emptyDescription:
      "There are currently no organization accounts waiting for verification.",
  },
  ACTIVE: {
    label: "Active Accounts",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
    emptyTitle: "No active accounts",
    emptyDescription:
      "There are currently no active organization accounts.",
  },
  SUSPENDED: {
    label: "Suspended Accounts",
    badge: "border-orange-200 bg-orange-50 text-orange-700",
    dot: "bg-orange-500",
    emptyTitle: "No suspended accounts",
    emptyDescription:
      "There are currently no suspended organization accounts.",
  },
  REJECTED: {
    label: "Rejected Accounts",
    badge: "border-red-200 bg-red-50 text-red-700",
    dot: "bg-red-500",
    emptyTitle: "No rejected accounts",
    emptyDescription:
      "There are currently no rejected organization accounts.",
  },
};

const ACCENT_CLASSES = {
  amber: {
    line: "from-amber-500 to-orange-500",
    button:
      "border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300",
  },
  emerald: {
    line: "from-emerald-500 to-teal-500",
    button:
      "border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300",
  },
  orange: {
    line: "from-orange-500 to-amber-500",
    button:
      "border-orange-200 text-orange-700 hover:bg-orange-50 hover:border-orange-300",
  },
  red: {
    line: "from-red-500 to-rose-500",
    button:
      "border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300",
  },
};

export default function AdminAccountStatusPage({
  status,
  title,
  description,
  accent,
}: AdminAccountStatusPageProps) {
  const navigate = useNavigate();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "TENANT" | "NGO">(
    "ALL"
  );

  const config = STATUS_CONFIG[status];
  const accentConfig = ACCENT_CLASSES[accent];

  async function loadAccounts() {
    try {
      setLoading(true);
      setError("");

      const result = await getAdminUsers({ status });

      setUsers(result);
    } catch (e: any) {
      setError(
        e?.response?.data?.detail ||
          `Failed to load ${config.label.toLowerCase()}.`
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAccounts();
  }, [status]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesRole =
        roleFilter === "ALL" || user.role === roleFilter;

      if (!matchesRole) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        user.organization_name,
        user.full_name,
        user.email,
        user.phone,
        user.role,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(query)
        );
    });
  }, [users, search, roleFilter]);

  return (
    <div className="space-y-5 pb-24 md:space-y-6 md:pb-0">
      {/* =====================================================
          HEADER
      ====================================================== */}

      <header className="px-1 pt-3 sm:pt-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${config.dot}`}
              />

              <span
                className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${config.badge}`}
              >
                {config.label}
              </span>
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
              {title}
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-slate-600 sm:text-base dark:text-slate-400">
              {description}
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/admin")}
            className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
          >
            ← Admin Dashboard
          </button>
        </div>

        <div className="relative mt-5 hidden md:block">
          <div className="h-px w-full bg-gradient-to-r from-slate-300 via-slate-200 to-transparent" />

          <div
            className={`absolute left-0 top-0 h-[2px] w-24 -translate-y-1/2 rounded-full bg-gradient-to-r ${accentConfig.line}`}
          />
        </div>
      </header>

      {/* =====================================================
          ERROR
      ====================================================== */}

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 shadow-sm">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 font-bold text-red-600">
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
            onClick={loadAccounts}
            className="text-sm font-bold text-red-700 hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* =====================================================
          SUMMARY
      ====================================================== */}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
            Total
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {loading ? "—" : users.length}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {config.label.toLowerCase()}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
            Businesses
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {loading
              ? "—"
              : users.filter((user) => user.role === "TENANT").length}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Business organizations
          </p>
        </div>

        <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:col-span-1">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
            NGOs
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {loading
              ? "—"
              : users.filter((user) => user.role === "NGO").length}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            NGO organizations
          </p>
        </div>
      </section>

      {/* =====================================================
          ACCOUNTS
      ====================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Header / Filters */}

        <div className="border-b border-slate-100 p-4 md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-bold text-slate-900">
                Organization Accounts
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                {filteredUsers.length} account
                {filteredUsers.length === 1 ? "" : "s"} shown
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search organization, name or email..."
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 sm:w-[280px]"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(event) =>
                  setRoleFilter(
                    event.target.value as
                      | "ALL"
                      | "TENANT"
                      | "NGO"
                  )
                }
                className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
              >
                <option value="ALL">All organizations</option>
                <option value="TENANT">Businesses</option>
                <option value="NGO">NGOs</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading */}

        {loading && (
          <div className="space-y-3 p-4">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="animate-pulse rounded-2xl border border-slate-100 p-4"
              >
                <div className="h-4 w-40 rounded bg-slate-200" />
                <div className="mt-3 h-3 w-64 rounded bg-slate-100" />
                <div className="mt-2 h-3 w-48 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        )}

        {/* Mobile cards */}

        {!loading && (
          <div className="space-y-3 bg-slate-50/60 p-3 md:hidden">
            {filteredUsers.map((user) => (
              <AccountCard
                key={user.id}
                user={user}
                status={status}
                config={config}
                onReview={() =>
                  navigate(`/admin/accounts/${user.id}`)
                }
              />
            ))}

            {!filteredUsers.length && (
              <EmptyState
                title={config.emptyTitle}
                description={config.emptyDescription}
              />
            )}
          </div>
        )}

        {/* Desktop table */}

        {!loading && (
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">
                    Organization
                  </th>

                  <th className="px-5 py-3.5">
                    Type
                  </th>

                  <th className="px-5 py-3.5">
                    Contact
                  </th>

                  <th className="px-5 py-3.5">
                    Status
                  </th>

                  <th className="px-5 py-3.5 text-right">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="transition hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-800">
                        {user.organization_name || "—"}
                      </div>

                      <div className="mt-0.5 text-xs text-slate-400">
                        Account #{user.id}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        {user.role === "TENANT"
                          ? "Business"
                          : "NGO"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="text-slate-700">
                        {user.full_name}
                      </div>

                      <div className="mt-0.5 text-xs text-slate-400">
                        {user.email}
                      </div>

                      {user.phone && (
                        <div className="mt-0.5 text-xs text-slate-400">
                          {user.phone}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={user.status} />
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/admin/accounts/${user.id}`)
                        }
                        className={`rounded-lg border bg-white px-3 py-1.5 text-xs font-bold transition ${accentConfig.button}`}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}

                {!filteredUsers.length && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-14 text-center"
                    >
                      <EmptyState
                        title={config.emptyTitle}
                        description={config.emptyDescription}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

/* ============================================================
   ACCOUNT CARD
============================================================ */

function AccountCard({
  user,
  status,
  onReview,
}: {
  user: AdminUser;
  status: AdminAccountStatus;
  config: (typeof STATUS_CONFIG)[AdminAccountStatus];
  onReview: () => void;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-base font-bold text-white">
          {(user.organization_name ||
            user.full_name ||
            "?")
            .charAt(0)
            .toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold text-slate-900">
            {user.organization_name || "—"}
          </h3>

          <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
            {user.role === "TENANT" ? "Business" : "NGO"}
          </span>
        </div>

        <StatusBadge status={status} />
      </div>

      <div className="mt-3 space-y-1 rounded-xl bg-slate-50 p-3">
        <p className="text-sm font-medium text-slate-800">
          {user.full_name}
        </p>

        <a
          href={`mailto:${user.email}`}
          className="block truncate text-xs text-slate-500 hover:text-emerald-600"
        >
          {user.email}
        </a>

        {user.phone && (
          <a
            href={`tel:${user.phone}`}
            className="block text-xs text-slate-500"
          >
            {user.phone}
          </a>
        )}
      </div>

      <button
        type="button"
        onClick={onReview}
        className="mt-3 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 active:scale-[0.98]"
      >
        Review Account
      </button>
    </article>
  );
}

/* ============================================================
   STATUS BADGE
============================================================ */

function StatusBadge({ status }: { status: string }) {
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
      className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold ${styles[status] || "border-slate-200 bg-slate-50 text-slate-600"}`}
    >
      {status}
    </span>
  );
}

/* ============================================================
   EMPTY STATE
============================================================ */

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center justify-center py-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-lg text-slate-400">
        ✓
      </div>

      <p className="mt-3 font-semibold text-slate-700">
        {title}
      </p>

      <p className="mt-1 text-sm leading-6 text-slate-400">
        {description}
      </p>
    </div>
  );
}