import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "../../context/AuthContext";
import { getNGOMatches, type DonationMatch, } from "../../services/donationMatchApi";
import { schedulePickup } from "../../services/pickupApi";

interface ScheduleForm {
  match: DonationMatch | null;
  date: string;
  startTime: string;
  endTime: string;
  notes: string;
}

// ================================================================
// HELPERS (logic unchanged)
// ================================================================

function formatDateTime(value: string | null) {
  if (!value) return "Not specified";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not specified";
  }

  return date.toLocaleString();
}


function getDateInput(value: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTimeInput(value: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toTimeString().slice(0, 5);
}

function getScoreClass(score: number) {
  if (score >= 80) {
    return "text-green-600";
  }

  if (score >= 50) {
    return "text-yellow-600";
  }

  return "text-red-600";
}

function getScoreBarClass(score: number) {
  if (score >= 80) {
    return "bg-green-500";
  }

  if (score >= 50) {
    return "bg-yellow-500";
  }

  return "bg-red-500";
}

function getStatusClass(status: string) {
  switch (status) {
    case "SUGGESTED":
      return "bg-blue-50 text-blue-700 ring-blue-200";

    case "ACCEPTED":
      return "bg-green-50 text-green-700 ring-green-200";

    case "PICKUP_SCHEDULED":
      return "bg-purple-50 text-purple-700 ring-purple-200";

    case "READY_FOR_PICKUP":
      return "bg-amber-50 text-amber-700 ring-amber-200";

    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";

    case "CANCELLED":
      return "bg-red-50 text-red-700 ring-red-200";

    default:
      return "bg-gray-50 text-gray-700 ring-gray-200";
  }
}

function getStatusDotClass(status: string) {
  switch (status) {
    case "SUGGESTED":
      return "bg-blue-500";
    case "ACCEPTED":
      return "bg-green-500";
    case "PICKUP_SCHEDULED":
      return "bg-purple-500";
    case "READY_FOR_PICKUP":
      return "bg-amber-500";
    case "COMPLETED":
      return "bg-emerald-500";
    case "CANCELLED":
      return "bg-red-500";
    default:
      return "bg-gray-400";
  }
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

// ================================================================
// SMALL UI PIECES
// ================================================================

function ScoreRing({ score }: { score: number }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(score, 0), 100);
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className={`relative h-[68px] w-[68px] shrink-0 ${getScoreClass(
        score
      )}`}
      role="img"
      aria-label={`Match score ${score.toFixed(1)} percent`}
    >
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          strokeWidth="6"
          className="stroke-gray-100"
        />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          stroke="currentColor"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 600ms ease" }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-base font-bold">
          {score.toFixed(0)}
          <span className="text-[10px] font-semibold">%</span>
        </span>
        <span className="mt-0.5 text-[9px] font-medium text-gray-400">
          match
        </span>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusClass(
        status
      )}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${getStatusDotClass(
          status
        )}`}
      />
      {formatStatus(status)}
    </span>
  );
}

function ContactRow({
  icon,
  label,
  children,
}: {
  icon: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-3.5 py-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-sm shadow-sm ring-1 ring-gray-200">
        {icon}
      </span>

      <div className="min-w-0">
        <p className="text-[11px] font-medium text-gray-500">{label}</p>
        <div className="truncate text-sm font-semibold text-gray-900">
          {children}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
}) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-3 text-center">
      <p className="text-[11px] font-medium text-gray-500">{label}</p>

      <p className="mt-1 text-base font-bold leading-tight text-gray-900">
        {value}
        {unit && (
          <span className="ml-1 text-[11px] font-medium text-gray-500">
            {unit}
          </span>
        )}
      </p>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-500/20 disabled:bg-gray-50 disabled:text-gray-400";

// ================================================================
// PAGE
// ================================================================

export default function NGOMatches() {
  const { user } = useAuth();

  const [matches, setMatches] = useState<DonationMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showScheduleModal, setShowScheduleModal] =
    useState(false);

  const [scheduleLoading, setScheduleLoading] =
    useState(false);

  const [scheduleError, setScheduleError] =
    useState("");

  const [scheduleSuccess, setScheduleSuccess] =
    useState("");

  const [scheduleForm, setScheduleForm] =
    useState<ScheduleForm>({
      match: null,
      date: "",
      startTime: "",
      endTime: "",
      notes: "",
    });

  // ============================================================
  // MATCH LIST CONTROLS (display only)
  // ============================================================

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [distanceFilter, setDistanceFilter] = useState("ALL");
  const [scoreFilter, setScoreFilter] = useState("ALL");
  const [selectedMatch, setSelectedMatch] = useState<DonationMatch | null>(null);

  // ============================================================
  // LOAD MATCHES
  // ============================================================

  const loadMatches = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getNGOMatches();

      setMatches(data);
    } catch (err: any) {
      console.error(
        "Failed to load NGO matches:",
        err
      );

      setError(
        err?.response?.data?.detail ||
        "Failed to load matched surplus listings."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, []);

  // ============================================================
  // OPEN SCHEDULE MODAL
  // ============================================================

  const openScheduleModal = (
    match: DonationMatch
  ) => {
    setScheduleError("");
    setScheduleSuccess("");

    let defaultDate = "";
    let defaultStartTime = "";
    let defaultEndTime = "";

    if (
      match.available_from &&
      match.available_until
    ) {
      const availableFrom = new Date(
        match.available_from
      );

      const availableUntil = new Date(
        match.available_until
      );

      if (
        !Number.isNaN(availableFrom.getTime()) &&
        !Number.isNaN(availableUntil.getTime())
      ) {
        defaultDate =
          getDateInput(match.available_from);

        defaultStartTime =
          getTimeInput(match.available_from);

        defaultEndTime =
          getTimeInput(match.available_until);
      }
    }

    setScheduleForm({
      match,
      date: defaultDate,
      startTime: defaultStartTime,
      endTime: defaultEndTime,
      notes: "",
    });

    setShowScheduleModal(true);
  };

  // ============================================================
  // CLOSE SCHEDULE MODAL
  // ============================================================

  const closeScheduleModal = () => {
    if (scheduleLoading) {
      return;
    }

    setShowScheduleModal(false);

    setScheduleForm({
      match: null,
      date: "",
      startTime: "",
      endTime: "",
      notes: "",
    });

    setScheduleError("");
    setScheduleSuccess("");
  };

  // ============================================================
  // SUBMIT PICKUP
  // ============================================================

  const handleSchedulePickup = async () => {
    const match = scheduleForm.match;

    if (!match) {
      return;
    }

    setScheduleError("");
    setScheduleSuccess("");

    // ----------------------------------------------------------
    // Required fields
    // ----------------------------------------------------------

    if (!scheduleForm.date) {
      setScheduleError(
        "Please select a pickup date."
      );
      return;
    }

    if (!scheduleForm.startTime) {
      setScheduleError(
        "Please select a pickup start time."
      );
      return;
    }

    if (!scheduleForm.endTime) {
      setScheduleError(
        "Please select a pickup end time."
      );
      return;
    }

    // ----------------------------------------------------------
    // Build selected datetime
    // ----------------------------------------------------------

    const scheduledStart = new Date(
      `${scheduleForm.date}T${scheduleForm.startTime}`
    );

    const scheduledEnd = new Date(
      `${scheduleForm.date}T${scheduleForm.endTime}`
    );

    if (
      Number.isNaN(scheduledStart.getTime()) ||
      Number.isNaN(scheduledEnd.getTime())
    ) {
      setScheduleError(
        "Invalid pickup date or time."
      );
      return;
    }

    // ----------------------------------------------------------
    // End must be after start
    // ----------------------------------------------------------

    if (scheduledEnd <= scheduledStart) {
      setScheduleError(
        "Pickup end time must be after the start time."
      );
      return;
    }

    // ----------------------------------------------------------
    // Validate against donation availability window
    // ----------------------------------------------------------

    if (
      match.available_from &&
      match.available_until
    ) {
      const availableFrom = new Date(
        match.available_from
      );

      const availableUntil = new Date(
        match.available_until
      );

      if (
        scheduledStart < availableFrom ||
        scheduledEnd > availableUntil
      ) {
        setScheduleError(
          "The pickup time must be within the donor's availability window."
        );
        return;
      }
    }

    // ----------------------------------------------------------
    // Submit
    // ----------------------------------------------------------

    try {
      setScheduleLoading(true);

      await schedulePickup({
        match_id: match.match_id,

        // Keep the exact local wall-clock time selected by the NGO.
        // Do not convert these values with toISOString(), because that
        // changes the displayed pickup time to UTC.
        scheduled_start:
          `${scheduleForm.date}T${scheduleForm.startTime}`,

        scheduled_end:
          `${scheduleForm.date}T${scheduleForm.endTime}`,

        notes:
          scheduleForm.notes.trim() ||
          undefined,
      });

      // The pickup API has completed successfully. Close the modal
      // immediately instead of keeping the scheduling card open.
      setShowScheduleModal(false);
      setScheduleForm({
        match: null,
        date: "",
        startTime: "",
        endTime: "",
        notes: "",
      });
      setScheduleSuccess("");
      setScheduleError("");

      // Refresh after the modal is closed. A refresh failure must not
      // turn a successful scheduling action into a scheduling error.
      loadMatches().catch((refreshError) => {
        console.error(
          "Pickup scheduled, but NGO matches refresh failed:",
          refreshError
        );
      });
    } catch (err: any) {
      console.error(
        "Schedule pickup request returned an error:",
        err
      );

      // Some backend responses can create the pickup successfully and
      // then return an error while serializing/processing the response.
      // Verify the match status before telling the NGO that scheduling
      // failed.
      try {
        const refreshedMatches = await getNGOMatches();
        const refreshedMatch = refreshedMatches.find(
          (item) => item.match_id === match.match_id
        );

        const pickupWasCreated =
          refreshedMatch &&
          refreshedMatch.status !== "SUGGESTED";

        if (pickupWasCreated) {
          setMatches(refreshedMatches);
          setShowScheduleModal(false);
          setScheduleForm({
            match: null,
            date: "",
            startTime: "",
            endTime: "",
            notes: "",
          });
          setScheduleError("");
          setScheduleSuccess("");
          return;
        }
      } catch (verifyError) {
        console.error(
          "Could not verify pickup after scheduling error:",
          verifyError
        );
      }

      setScheduleError(
        err?.response?.data?.detail ||
        "Failed to schedule pickup."
      );
    } finally {
      setScheduleLoading(false);
    }
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="min-h-full bg-slate-50 px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6">
            <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200" />
            <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded bg-gray-200" />
          </div>

          <div className="space-y-4">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 animate-pulse rounded-xl bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-56 max-w-full animate-pulse rounded bg-gray-200" />
                    <div className="h-3 w-40 animate-pulse rounded bg-gray-100" />
                  </div>
                  <div className="h-16 w-16 animate-pulse rounded-full bg-gray-100" />
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-5">
                  <div className="h-36 animate-pulse rounded-xl bg-gray-100 lg:col-span-3" />
                  <div className="h-36 animate-pulse rounded-xl bg-gray-100 lg:col-span-2" />
                </div>
              </div>
            ))}
          </div>

          <p className="mt-5 text-center text-sm text-gray-500">
            Loading matched surplus listings...
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // ERROR
  // ============================================================

  if (error) {
    return (
      <div className="min-h-full bg-slate-50 px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              NGO Matches
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Surplus food listings matched with your requirements.
            </p>
          </div>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100">
                ⚠️
              </div>

              <div>
                <p className="font-semibold text-red-800">
                  Unable to load matches
                </p>

                <p className="mt-1 text-sm text-red-700">
                  {error}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={loadMatches}
              className="mt-5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // DERIVED SUMMARY + FILTERING
  // ============================================================

  const openCount = matches.filter(
    (m) => m.status === "SUGGESTED"
  ).length;

  const bestScore = matches.length
    ? Math.max(...matches.map((m) => m.match_score))
    : 0;

  // Keep this flexible so the UI works with whichever timestamp the
  // backend currently exposes. Newest matched donations appear first.
  const getMatchTimestamp = (match: DonationMatch) => {
    const item = match as DonationMatch & {
      created_at?: string | null;
      matched_at?: string | null;
      createdAt?: string | null;
      matchedAt?: string | null;
      donation_created_at?: string | null;
      donationCreatedAt?: string | null;
    };

    const value =
      item.matched_at ||
      item.created_at ||
      item.matchedAt ||
      item.createdAt ||
      item.donation_created_at ||
      item.donationCreatedAt ||
      match.available_from;

    const time = value ? new Date(value).getTime() : 0;
    return Number.isNaN(time) ? 0 : time;
  };

  const filteredMatches = [...matches]
    .sort((a, b) => getMatchTimestamp(b) - getMatchTimestamp(a))
    .filter((match) => {
      const query = searchTerm.trim().toLowerCase();

      const matchesSearch =
        !query ||
        match.food_name.toLowerCase().includes(query) ||
        (match.donor_organization_name || "").toLowerCase().includes(query) ||
        (match.pickup_location || "").toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "ALL" || match.status === statusFilter;

      const matchesDistance =
        distanceFilter === "ALL" ||
        (match.distance_km !== null &&
          match.distance_km !== undefined &&
          (distanceFilter === "10"
            ? match.distance_km <= 10
            : distanceFilter === "25"
              ? match.distance_km <= 25
              : distanceFilter === "50"
                ? match.distance_km <= 50
                : true));

      const matchesScore =
        scoreFilter === "ALL" ||
        (scoreFilter === "80"
          ? match.match_score >= 80
          : scoreFilter === "60"
            ? match.match_score >= 60
            : scoreFilter === "40"
              ? match.match_score >= 40
              : true);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesDistance &&
        matchesScore
      );
    });

  const hasActiveFilters =
    searchTerm.trim() ||
    statusFilter !== "ALL" ||
    distanceFilter !== "ALL" ||
    scoreFilter !== "ALL";

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("ALL");
    setDistanceFilter("ALL");
    setScoreFilter("ALL");
  };

  // ============================================================
  // MAIN PAGE
  // ============================================================

  return (
    <div className="min-h-full bg-slate-50 px-2 py-0 sm:px-6">
      <header className="px-1 pb-0 pt-3 sm:pt-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-3xl ">
              Donation{" "}
              <span className="bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
                Matches
              </span>
            </h2>

            <p className="mt-1 max-w-xl text-sm text-slate-600 sm:text-base dark:text-slate-400">
              Surplus food listings matched with your requirements.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 ring-1 ring-inset ring-gray-200">
              {matches.length} {matches.length === 1 ? "match" : "matches"}
            </span>

            <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-200">
              {openCount} ready to schedule
            </span>

            <button
              type="button"
              onClick={loadMatches}
              className="rounded-full border border-gray-300 bg-white px-4 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        <div className="relative mb-4 mt-4 sm:mb-5 sm:mt-5">
          <div className="h-px w-full bg-gradient-to-r from-slate-300 via-slate-200 to-transparent dark:from-slate-600 dark:via-slate-700" />
          <div className="absolute left-0 top-0 h-[2px] w-16 -translate-y-1/2 rounded-full bg-gradient-to-r from-amber-500 to-orange-600" />
        </div>
      </header>

      <div className="mx-auto max-w-6xl">
        {/* ======================================================
            FILTERS
        ====================================================== */}

        <section className="mb-5 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Find a donation</h3>
              <p className="text-xs text-gray-500">
                Newest matched donations are shown first.
              </p>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="self-start text-xs font-semibold text-green-700 hover:text-green-800 sm:self-auto"
              >
                Clear filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                🔎
              </span>
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Food, donor or location"
                className={`${inputClass} pl-9`}
                aria-label="Search donations"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={inputClass}
              aria-label="Filter by status"
            >
              <option value="ALL">All statuses</option>
              <option value="SUGGESTED">Suggested</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="PICKUP_SCHEDULED">Pickup scheduled</option>
              <option value="READY_FOR_PICKUP">Ready for pickup</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <select
              value={distanceFilter}
              onChange={(e) => setDistanceFilter(e.target.value)}
              className={inputClass}
              aria-label="Filter by distance"
            >
              <option value="ALL">Any distance</option>
              <option value="10">Within 10 km</option>
              <option value="25">Within 25 km</option>
              <option value="50">Within 50 km</option>
            </select>

            <select
              value={scoreFilter}
              onChange={(e) => setScoreFilter(e.target.value)}
              className={inputClass}
              aria-label="Filter by match score"
            >
              <option value="ALL">Any match score</option>
              <option value="80">80%+ match</option>
              <option value="60">60%+ match</option>
              <option value="40">40%+ match</option>
            </select>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
            <span>
              Showing{" "}
              <span className="font-semibold text-gray-700">
                {filteredMatches.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-gray-700">
                {matches.length}
              </span>{" "}
              matches
            </span>
            <span className="hidden sm:inline">
              Highest match: {bestScore.toFixed(0)}%
            </span>
          </div>
        </section>

        {/* ======================================================
            EMPTY STATE
        ====================================================== */}

        {matches.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-3xl">
              🔎
            </div>

            <h2 className="mt-4 text-lg font-bold text-gray-900">
              No matches found
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
              No surplus food listings currently match your active NGO requirements.
            </p>
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-2xl">
              🔍
            </div>
            <h2 className="mt-3 text-lg font-bold text-gray-900">
              No donations match your filters
            </h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
              Try changing the status, distance, score, or search term.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
            >
              Clear filters
            </button>
          </div>
        ) : (
          /* ====================================================
             COMPACT MATCH CARDS
          ==================================================== */

          <div className="space-y-3">
            {filteredMatches.map((match, index) => (
              <article
                key={match.match_id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:border-gray-300 hover:shadow-md"
              >
                <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:px-5">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 text-xl ring-1 ring-inset ring-green-100 sm:flex">
                      🍲
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-base font-bold text-gray-900">
                          {match.food_name}
                        </h2>
                        <StatusPill status={match.status} />
                        {index === 0 && !hasActiveFilters && (
                          <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700 ring-1 ring-inset ring-amber-200">
                            RECENT
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                        <span>
                          {match.donor_organization_name || "Donor unavailable"}
                        </span>
                        <span className="hidden text-gray-300 sm:inline">•</span>
                        <span>
                          {match.distance_km !== null &&
                          match.distance_km !== undefined
                            ? `${match.distance_km.toFixed(1)} km away`
                            : "Distance unavailable"}
                        </span>
                        <span className="hidden text-gray-300 sm:inline">•</span>
                        <span>
                          {match.available_quantity} {match.required_unit} available
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <ScoreRing score={match.match_score} />

                    <button
                      type="button"
                      onClick={() => setSelectedMatch(match)}
                      className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 shadow-sm transition hover:border-gray-400 hover:bg-gray-50"
                    >
                      View details
                    </button>

                    <button
                      type="button"
                      onClick={() => openScheduleModal(match)}
                      disabled={match.status !== "SUGGESTED"}
                      className="hidden rounded-xl bg-green-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300 sm:inline-flex"
                    >
                      {match.status === "SUGGESTED"
                        ? "Schedule"
                        : match.status === "ACCEPTED"
                          ? "Accepted"
                          : "Scheduled"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* =========================================================
            MATCH DETAILS MODAL
        ========================================================= */}

        {selectedMatch && (
          <div
            className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Donation match details"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setSelectedMatch(null);
            }}
          >
            <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex shrink-0 items-center justify-between gap-4 border-b border-gray-200 px-5 py-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-lg font-bold text-gray-900">
                      {selectedMatch.food_name}
                    </h2>
                    <StatusPill status={selectedMatch.status} />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Donation #{selectedMatch.donation_id} ·{" "}
                    {selectedMatch.donor_organization_name || "Donor unavailable"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedMatch(null)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-2xl text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  aria-label="Close details"
                >
                  ×
                </button>
              </div>

              <div className="overflow-y-auto px-5 py-5">
                <div className="grid gap-4 lg:grid-cols-5">
                  <div className="space-y-4 lg:col-span-3">
                    <section className="rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-lg ring-1 ring-inset ring-emerald-100">
                          🏢
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-emerald-700">
                            Donating organization
                          </p>
                          <h3 className="truncate text-base font-bold text-gray-900">
                            {selectedMatch.donor_organization_name ||
                              "Business organization not available"}
                          </h3>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <ContactRow icon="👤" label="Contact person">
                          {selectedMatch.donor_owner_name || "Not available"}
                        </ContactRow>
                        <ContactRow icon="📞" label="Phone">
                          {selectedMatch.donor_owner_phone ? (
                            <a
                              href={`tel:${selectedMatch.donor_owner_phone}`}
                              className="text-blue-600 hover:underline"
                            >
                              {selectedMatch.donor_owner_phone}
                            </a>
                          ) : (
                            "Not available"
                          )}
                        </ContactRow>
                        <div className="sm:col-span-2">
                          <ContactRow icon="✉️" label="Email">
                            {selectedMatch.donor_owner_email ? (
                              <a
                                href={`mailto:${selectedMatch.donor_owner_email}`}
                                className="text-blue-600 hover:underline"
                              >
                                {selectedMatch.donor_owner_email}
                              </a>
                            ) : (
                              "Not available"
                            )}
                          </ContactRow>
                        </div>
                      </div>
                    </section>

                    <section className="rounded-xl border border-gray-200 p-4">
                      <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-base">
                          📍
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-gray-500">
                            Pickup location
                          </p>
                          <p className="mt-0.5 text-sm font-semibold leading-5 text-gray-900">
                            {selectedMatch.pickup_location ||
                              selectedMatch.donor_address ||
                              "Location not available"}
                          </p>
                          {selectedMatch.distance_km !== null &&
                            selectedMatch.distance_km !== undefined && (
                              <p className="mt-1 text-xs text-gray-500">
                                About{" "}
                                <span className="font-semibold text-gray-700">
                                  {selectedMatch.distance_km.toFixed(1)} km
                                </span>{" "}
                                from your NGO
                              </p>
                            )}
                        </div>

                        {selectedMatch.pickup_latitude !== null &&
                        selectedMatch.pickup_latitude !== undefined &&
                        selectedMatch.pickup_longitude !== null &&
                        selectedMatch.pickup_longitude !== undefined ? (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${selectedMatch.pickup_latitude},${selectedMatch.pickup_longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            Maps
                          </a>
                        ) : null}
                      </div>
                    </section>

                    <section className="rounded-xl border-l-4 border-amber-400 bg-amber-50 px-4 py-3">
                      <p className="text-xs font-semibold text-amber-800">
                        📝 Note from the donor
                      </p>
                      <p className="mt-1 text-sm leading-6 text-gray-700">
                        {selectedMatch.note ||
                          "No additional notes were provided by the donor."}
                      </p>
                    </section>
                  </div>

                  <div className="space-y-4 lg:col-span-2">
                    <div className="flex justify-center">
                      <ScoreRing score={selectedMatch.match_score} />
                    </div>

                    <section>
                      <h3 className="mb-2 text-sm font-bold text-gray-900">
                        Donation details
                      </h3>
                      <div className="grid grid-cols-3 gap-2">
                        <Stat
                          label="You need"
                          value={selectedMatch.required_quantity}
                          unit={selectedMatch.required_unit}
                        />
                        <Stat
                          label="Available"
                          value={selectedMatch.available_quantity}
                          unit={selectedMatch.required_unit}
                        />
                        <Stat
                          label="Distance"
                          value={
                            selectedMatch.distance_km !== null &&
                            selectedMatch.distance_km !== undefined
                              ? `${selectedMatch.distance_km.toFixed(1)} km`
                              : "—"
                          }
                        />
                      </div>
                    </section>

                    <section className="rounded-xl border border-gray-200 p-4">
                      <h3 className="text-sm font-bold text-gray-900">
                        Match analysis
                      </h3>
                      <p className="mt-0.5 text-xs text-gray-500">
                        How this donation fits your requirement.
                      </p>

                      <div className="mt-4 space-y-3">
                        {[
                          { label: "Food", value: selectedMatch.food_match_score },
                          {
                            label: "Quantity",
                            value: selectedMatch.quantity_match_score,
                          },
                          {
                            label: "Distance",
                            value: selectedMatch.distance_match_score,
                          },
                          { label: "Expiry", value: selectedMatch.expiry_match_score },
                        ].map((item) => (
                          <div key={item.label}>
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium text-gray-600">
                                {item.label}
                              </span>
                              <span
                                className={`font-bold ${getScoreClass(item.value)}`}
                              >
                                {item.value.toFixed(1)}%
                              </span>
                            </div>
                            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
                              <div
                                className={`h-full rounded-full ${getScoreBarClass(
                                  item.value
                                )}`}
                                style={{
                                  width: `${Math.min(
                                    Math.max(item.value, 0),
                                    100
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                </div>

                <section className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs font-medium text-gray-500">
                    Pickup availability
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-800">
                    {selectedMatch.available_from &&
                    selectedMatch.available_until ? (
                      <>
                        {formatDateTime(selectedMatch.available_from)}
                        <span className="mx-2 font-normal text-gray-400">
                          to
                        </span>
                        {formatDateTime(selectedMatch.available_until)}
                      </>
                    ) : (
                      "Availability window not specified"
                    )}
                  </p>
                </section>
              </div>

              <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-gray-200 bg-gray-50 px-5 py-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedMatch(null)}
                  className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedMatch(null);
                    openScheduleModal(selectedMatch);
                  }}
                  disabled={selectedMatch.status !== "SUGGESTED"}
                  className="rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {selectedMatch.status === "SUGGESTED"
                    ? "Schedule pickup"
                    : selectedMatch.status === "ACCEPTED"
                      ? "Pickup accepted"
                      : "Pickup scheduled"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            SCHEDULE PICKUP MODAL
        ========================================================= */}

        {showScheduleModal &&
          scheduleForm.match && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
              role="dialog"
              aria-modal="true"
              aria-label="Schedule pickup"
            >
              <div className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                {/* ---------------- MODAL HEADER ---------------- */}

                <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-200 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-lg ring-1 ring-inset ring-green-100">
                      🚚
                    </div>

                    <div>
                      <h2 className="text-lg font-bold leading-tight text-gray-900">
                        Schedule pickup
                      </h2>

                      <p className="mt-0.5 text-sm text-gray-500">
                        {scheduleForm.match.food_name}, Donation #
                        {scheduleForm.match.donation_id}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={closeScheduleModal}
                    disabled={scheduleLoading}
                    aria-label="Close"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-2xl leading-none text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                  >
                    ×
                  </button>
                </div>

                {/* ---------------- MODAL BODY ---------------- */}

                <div className="space-y-4 overflow-y-auto px-6 py-5">
                  {/* Donor */}
                  <div className="rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 ring-1 ring-inset ring-emerald-100">
                        🏢
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-medium text-emerald-700">
                          Donating organization
                        </p>

                        <p className="truncate font-bold text-gray-900">
                          {scheduleForm.match.donor_organization_name ||
                            "Business organization not available"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 border-t border-gray-100 pt-3 sm:grid-cols-3">
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500">
                          Contact person
                        </p>

                        <p className="mt-0.5 truncate text-sm font-semibold text-gray-800">
                          {scheduleForm.match.donor_owner_name ||
                            "Not available"}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs text-gray-500">
                          Phone
                        </p>

                        {scheduleForm.match.donor_owner_phone ? (
                          <a
                            href={`tel:${scheduleForm.match.donor_owner_phone}`}
                            className="mt-0.5 block truncate text-sm font-semibold text-blue-600 hover:underline"
                          >
                            {scheduleForm.match.donor_owner_phone}
                          </a>
                        ) : (
                          <p className="mt-0.5 text-sm font-semibold text-gray-800">
                            Not available
                          </p>
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs text-gray-500">
                          Email
                        </p>

                        {scheduleForm.match.donor_owner_email ? (
                          <a
                            href={`mailto:${scheduleForm.match.donor_owner_email}`}
                            className="mt-0.5 block truncate text-sm font-semibold text-blue-600 hover:underline"
                          >
                            {scheduleForm.match.donor_owner_email}
                          </a>
                        ) : (
                          <p className="mt-0.5 text-sm font-semibold text-gray-800">
                            Not available
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Location + availability */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 p-4">
                      <p className="text-xs font-medium text-gray-500">
                        📍 Pickup location
                      </p>

                      <p className="mt-1 text-sm font-semibold leading-5 text-gray-800">
                        {scheduleForm.match.pickup_location ||
                          scheduleForm.match.donor_address ||
                          "Not specified"}
                      </p>

                      {scheduleForm.match.pickup_latitude !==
                        null &&
                        scheduleForm.match.pickup_latitude !==
                        undefined &&
                        scheduleForm.match.pickup_longitude !==
                        null &&
                        scheduleForm.match.pickup_longitude !==
                        undefined && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${scheduleForm.match.pickup_latitude},${scheduleForm.match.pickup_longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex text-xs font-semibold text-blue-600 hover:underline"
                          >
                            Open in Google Maps
                          </a>
                        )}
                    </div>

                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                      <p className="text-xs font-medium text-blue-700">
                        🕒 Donor availability
                      </p>

                      {scheduleForm.match.available_from &&
                        scheduleForm.match.available_until ? (
                        <p className="mt-1 text-sm font-semibold leading-5 text-blue-900">
                          {formatDateTime(
                            scheduleForm.match.available_from
                          )}

                          <span className="mx-1.5 font-normal text-blue-500">
                            to
                          </span>

                          <br className="hidden sm:block" />

                          {formatDateTime(
                            scheduleForm.match.available_until
                          )}
                        </p>
                      ) : (
                        <p className="mt-1 text-sm text-blue-800">
                          Not specified
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Donor note */}
                  <div className="rounded-xl border-l-4 border-amber-400 bg-amber-50 px-4 py-3">
                    <p className="text-xs font-semibold text-amber-800">
                      📝 Note from the donor
                    </p>

                    <p className="mt-1 text-sm leading-6 text-gray-700">
                      {scheduleForm.match.note ||
                        "No additional notes were provided by the donor."}
                    </p>
                  </div>

                  {/* Pickup person */}
                  <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                    <p className="text-xs font-semibold text-green-800">
                      NGO details shared with donor to schedule this pickup.
                    </p>

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="min-w-0">
                        <p className="text-xs text-green-700">
                          NGO Name
                        </p>

                        <p className="mt-0.5 truncate text-sm font-semibold text-gray-800">
                          {user?.full_name ||
                            "Your account name"}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs text-green-700">
                          Phone
                        </p>

                        <p className="mt-0.5 truncate text-sm font-semibold text-gray-800">
                          {user?.phone ||
                            "Phone not available"}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs text-green-700">
                          Email
                        </p>

                        <p className="mt-0.5 break-all text-sm font-semibold text-gray-800">
                          {user?.email ||
                            "Email not available"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Date + time */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Pickup date
                      </label>

                      <input
                        type="date"
                        value={scheduleForm.date}
                        onChange={(e) =>
                          setScheduleForm(
                            (previous) => ({
                              ...previous,
                              date: e.target.value,
                            })
                          )
                        }
                        disabled={scheduleLoading}
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Start time
                      </label>

                      <input
                        type="time"
                        value={scheduleForm.startTime}
                        onChange={(e) =>
                          setScheduleForm(
                            (previous) => ({
                              ...previous,
                              startTime:
                                e.target.value,
                            })
                          )
                        }
                        disabled={scheduleLoading}
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        End time
                      </label>

                      <input
                        type="time"
                        value={scheduleForm.endTime}
                        onChange={(e) =>
                          setScheduleForm(
                            (previous) => ({
                              ...previous,
                              endTime:
                                e.target.value,
                            })
                          )
                        }
                        disabled={scheduleLoading}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Pickup notes
                    </label>

                    <textarea
                      value={scheduleForm.notes}
                      onChange={(e) =>
                        setScheduleForm(
                          (previous) => ({
                            ...previous,
                            notes: e.target.value,
                          })
                        )
                      }
                      disabled={scheduleLoading}
                      rows={3}
                      placeholder="Add pickup instructions or notes..."
                      className={`${inputClass} resize-none`}
                    />
                  </div>

                  {/* Error */}
                  {scheduleError && (
                    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5">
                      <span>⚠️</span>

                      <p className="text-sm font-medium text-red-700">
                        {scheduleError}
                      </p>
                    </div>
                  )}

                  {/* Success */}
                  {scheduleSuccess && (
                    <div className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-3.5">
                      <span>✅</span>

                      <p className="text-sm font-medium text-green-700">
                        {scheduleSuccess}
                      </p>
                    </div>
                  )}
                </div>

                {/* ---------------- MODAL FOOTER ---------------- */}

                <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeScheduleModal}
                    disabled={scheduleLoading}
                    className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleSchedulePickup}
                    disabled={scheduleLoading}
                    className="rounded-xl bg-green-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    {scheduleLoading
                      ? "Scheduling..."
                      : "Confirm pickup"}
                  </button>
                </div>
              </div>
            </div>
          )}
      </div>
    </div >
  );
}
