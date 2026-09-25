import { useEffect, useState, type ReactNode } from "react";

import { useAuth } from "../../context/AuthContext";

import {
  getNGOMatches,
  type DonationMatch,
} from "../../services/donationMatchApi";

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

// FIX: this previously used date.toISOString().split("T")[0], which
// returns the date in UTC. getTimeInput (below) has always returned
// the time in the browser's LOCAL timezone. Mixing a UTC date with a
// local time meant that, for any user not in UTC (e.g. UTC+5:30),
// the pre-filled date and time in the schedule modal did not
// actually correspond to the same instant as match.available_from.
// That mismatched value was then used to build `scheduledStart`,
// which frequently failed the "must be within the donor's
// availability window" check even when the visible date/time looked
// correct - the schedule pickup submission would fail even though
// nothing looked wrong on screen. Using local date components here
// makes getDateInput and getTimeInput consistent with each other and
// with how `scheduledStart` / `scheduledEnd` are reconstructed on
// submit.
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

        scheduled_start:
          scheduledStart.toISOString(),

        scheduled_end:
          scheduledEnd.toISOString(),

        notes:
          scheduleForm.notes.trim() ||
          undefined,
      });

      setScheduleSuccess(
        "Pickup scheduled successfully. Waiting for business confirmation."
      );

      await loadMatches();

      setTimeout(() => {
        setShowScheduleModal(false);

        setScheduleForm({
          match: null,
          date: "",
          startTime: "",
          endTime: "",
          notes: "",
        });

        setScheduleSuccess("");
      }, 1500);
    } catch (err: any) {
      console.error(
        "Failed to schedule pickup:",
        err
      );

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
  // DERIVED SUMMARY (display only)
  // ============================================================

  const openCount = matches.filter(
    (m) => m.status === "SUGGESTED"
  ).length;

  const bestScore = matches.length
    ? Math.max(...matches.map((m) => m.match_score))
    : 0;

  // ============================================================
  // MAIN PAGE
  // ============================================================

  return (
    <div className="min-h-full bg-slate-50 px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-6xl">
        {/* ======================================================
            HEADER
        ====================================================== */}

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-600 text-xl shadow-sm">
              🤝
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                NGO Matches
              </h1>

              <p className="mt-0.5 text-sm text-gray-500">
                Surplus food listings matched with your requirements.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {matches.length > 0 && (
              <>
                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 ring-1 ring-inset ring-gray-200">
                  {matches.length}{" "}
                  {matches.length === 1 ? "match" : "matches"}
                </span>

                <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-200">
                  {openCount} ready to schedule
                </span>

                <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 ring-1 ring-inset ring-green-200">
                  Best match {bestScore.toFixed(0)}%
                </span>
              </>
            )}

            <button
              type="button"
              onClick={loadMatches}
              className="rounded-full border border-gray-300 bg-white px-4 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
            >
              ↻ Refresh
            </button>
          </div>
        </div>

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
              No surplus food listings currently match your
              active NGO requirements.
            </p>
          </div>
        ) : (
          /* ====================================================
             MATCH CARDS
          ==================================================== */

          <div className="space-y-5">
            {matches.map((match) => (
              <article
                key={match.match_id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
              >
                {/* ---------------- CARD HEADER ---------------- */}

                <header className="flex items-center gap-4 px-5 py-4 sm:px-6">
                  <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-50 text-2xl ring-1 ring-inset ring-green-100 sm:flex">
                    🍲
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                      <h2 className="text-lg font-bold leading-tight text-gray-900">
                        {match.food_name}
                      </h2>

                      <StatusPill status={match.status} />
                    </div>

                    <p className="mt-1 text-sm text-gray-500">
                      Donation #{match.donation_id}, matched against
                      your food requirement
                    </p>
                  </div>

                  <ScoreRing score={match.match_score} />
                </header>

                {/* ---------------- CARD BODY ---------------- */}

                <div className="grid gap-5 border-t border-gray-100 px-5 py-5 sm:px-6 lg:grid-cols-5">
                  {/* LEFT: donor, location, note */}

                  <div className="space-y-4 lg:col-span-3">
                    {/* Donor */}
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
                            {match.donor_organization_name ||
                              "Business organization not available"}
                          </h3>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <ContactRow
                          icon="👤"
                          label="Contact person"
                        >
                          {match.donor_owner_name ||
                            "Not available"}
                        </ContactRow>

                        <ContactRow icon="📞" label="Phone">
                          {match.donor_owner_phone ? (
                            <a
                              href={`tel:${match.donor_owner_phone}`}
                              className="text-blue-600 hover:underline"
                            >
                              {match.donor_owner_phone}
                            </a>
                          ) : (
                            "Not available"
                          )}
                        </ContactRow>

                        <div className="sm:col-span-2">
                          <ContactRow icon="✉️" label="Email">
                            {match.donor_owner_email ? (
                              <a
                                href={`mailto:${match.donor_owner_email}`}
                                className="text-blue-600 hover:underline"
                              >
                                {match.donor_owner_email}
                              </a>
                            ) : (
                              "Not available"
                            )}
                          </ContactRow>
                        </div>
                      </div>
                    </section>

                    {/* Location */}
                    <section className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-base ring-1 ring-inset ring-rose-100">
                          📍
                        </span>

                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-500">
                            Pickup location
                          </p>

                          <p className="mt-0.5 text-sm font-semibold leading-5 text-gray-900">
                            {match.pickup_location ||
                              match.donor_address ||
                              "Location not available"}
                          </p>

                          {match.donor_address &&
                            match.pickup_location &&
                            match.donor_address !==
                              match.pickup_location && (
                              <p className="mt-1 text-xs text-gray-500">
                                Donor address:{" "}
                                {match.donor_address}
                              </p>
                            )}

                          {match.distance_km !== null &&
                            match.distance_km !== undefined && (
                              <p className="mt-1 text-xs text-gray-500">
                                About{" "}
                                <span className="font-semibold text-gray-700">
                                  {match.distance_km.toFixed(1)} km
                                </span>{" "}
                                from your NGO
                              </p>
                            )}
                        </div>
                      </div>

                      {match.pickup_latitude !== null &&
                      match.pickup_latitude !== undefined &&
                      match.pickup_longitude !== null &&
                      match.pickup_longitude !== undefined ? (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${match.pickup_latitude},${match.pickup_longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                        >
                          Open in Google Maps
                        </a>
                      ) : (
                        <span className="shrink-0 text-xs text-gray-400">
                          Map location unavailable
                        </span>
                      )}
                    </section>

                    {/* Donor note */}
                    <section className="rounded-xl border-l-4 border-amber-400 bg-amber-50 px-4 py-3">
                      <p className="text-xs font-semibold text-amber-800">
                        📝 Note from the donor
                      </p>

                      <p className="mt-1 text-sm leading-6 text-gray-700">
                        {match.note ||
                          "No additional notes were provided by the donor."}
                      </p>
                    </section>
                  </div>

                  {/* RIGHT: quantities + analysis */}

                  <div className="space-y-4 lg:col-span-2">
                    <section>
                      <h3 className="mb-2 text-sm font-bold text-gray-900">
                        Donation details
                      </h3>

                      <div className="grid grid-cols-3 gap-2">
                        <Stat
                          label="You need"
                          value={match.required_quantity}
                          unit={match.required_unit}
                        />

                        <Stat
                          label="Available"
                          value={match.available_quantity}
                          unit={match.required_unit}
                        />

                        <Stat
                          label="Distance"
                          value={
                            match.distance_km !== null &&
                            match.distance_km !== undefined
                              ? `${match.distance_km.toFixed(1)} km`
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

                      <div className="mt-4 space-y-3.5">
                        {[
                          {
                            label: "Food",
                            value: match.food_match_score,
                          },
                          {
                            label: "Quantity",
                            value: match.quantity_match_score,
                          },
                          {
                            label: "Distance",
                            value: match.distance_match_score,
                          },
                          {
                            label: "Expiry",
                            value: match.expiry_match_score,
                          },
                        ].map((item) => (
                          <div key={item.label}>
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium text-gray-600">
                                {item.label}
                              </span>

                              <span
                                className={`font-bold ${getScoreClass(
                                  item.value
                                )}`}
                              >
                                {item.value.toFixed(1)}%
                              </span>
                            </div>

                            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
                              <div
                                className={`h-full rounded-full transition-all ${getScoreBarClass(
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

                {/* ---------------- CARD FOOTER ---------------- */}

                <footer className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50 px-5 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-base shadow-sm ring-1 ring-gray-200">
                      🕒
                    </span>

                    <div>
                      <p className="text-xs font-medium text-gray-500">
                        Pickup availability
                      </p>

                      <p className="mt-0.5 text-sm font-semibold text-gray-800">
                        {match.available_from &&
                        match.available_until ? (
                          <>
                            {formatDateTime(
                              match.available_from
                            )}

                            <span className="mx-2 font-normal text-gray-400">
                              to
                            </span>

                            {formatDateTime(
                              match.available_until
                            )}
                          </>
                        ) : (
                          "Availability window not specified"
                        )}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      openScheduleModal(match)
                    }
                    disabled={
                      match.status !== "SUGGESTED"
                    }
                    className="inline-flex items-center justify-center rounded-xl bg-green-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300 md:min-w-[170px]"
                  >
                    {match.status === "SUGGESTED"
                      ? "Schedule pickup"
                      : match.status === "ACCEPTED"
                      ? "Pickup accepted"
                      : "Pickup scheduled"}
                  </button>
                </footer>
              </article>
            ))}
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
                      Person coming to collect the donation
                    </p>

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="min-w-0">
                        <p className="text-xs text-green-700">
                          Name
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

                    <p className="mt-3 text-xs leading-5 text-green-700">
                      These are the contact details of the NGO account
                      scheduling this pickup.
                    </p>
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
    </div>
  );
}
