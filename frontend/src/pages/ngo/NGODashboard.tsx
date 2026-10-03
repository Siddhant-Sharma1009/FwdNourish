import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import {
  getNGOMatches,
  type DonationMatch,
} from "../../services/donationMatchApi";
import {
  getNGOPickups,
  type Pickup,
} from "../../services/pickupApi";
import { getNGORequirements } from "../../services/ngoRequirementApi";
import type { NGORequirement } from "../../types/ngoRequirement";

const CO2E_PER_KG_FOOD = 2.5;
const MEALS_PER_KG_FOOD = 2;



function status(value: string | null | undefined): string {
  return (value || "").trim().toUpperCase();
}

function displayStatus(value: string | null | undefined): string {
  if (!value) return "Unknown";

  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatNumber(value: number, digits = 1): string {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: digits,
  });
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "Not specified";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not specified";

  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "Not specified";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not specified";

  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusClasses(value: string | null | undefined): string {
  switch (status(value)) {
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "READY_FOR_PICKUP":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "SCHEDULED":
    case "PICKUP_SCHEDULED":
      return "bg-purple-50 text-purple-700 ring-purple-200";
    case "ACCEPTED":
      return "bg-blue-50 text-blue-700 ring-blue-200";
    case "CANCELLED":
    case "REJECTED":
      return "bg-red-50 text-red-700 ring-red-200";
    default:
      return "bg-slate-50 text-slate-700 ring-slate-200";
  }
}

function StatIcon({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
      {children}
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {title}
          </p>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        </div>
        <StatIcon>{icon}</StatIcon>
      </div>
    </div>
  );
}

export default function NGODashboard() {
   useAuth();

  const [matches, setMatches] = useState<DonationMatch[]>([]);
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [requirements, setRequirements] = useState<NGORequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async (initial = false) => {
    try {
      if (initial) setLoading(true);
      else setRefreshing(true);

      setError("");

      const [matchesResult, pickupsResult, requirementsResult] =
        await Promise.allSettled([
          getNGOMatches(),
          getNGOPickups(),
          getNGORequirements(),
        ]);

      const errors: string[] = [];

      if (matchesResult.status === "fulfilled") {
        setMatches(matchesResult.value);
      } else {
        console.error("Failed to load NGO matches", matchesResult.reason);
        errors.push("incoming donations");
      }

      if (pickupsResult.status === "fulfilled") {
        setPickups(pickupsResult.value);
      } else {
        console.error("Failed to load NGO pickups", pickupsResult.reason);
        errors.push("pickup history");
      }

      if (requirementsResult.status === "fulfilled") {
        setRequirements(requirementsResult.value);
      } else {
        console.error(
          "Failed to load NGO requirements",
          requirementsResult.reason
        );
        errors.push("requirements");
      }

      if (errors.length === 3) {
        setError("Unable to load NGO dashboard data. Please try again.");
      } else if (errors.length > 0) {
        setError(`Some dashboard data could not be loaded: ${errors.join(", ")}.`);
      }
    } catch (error) {
      console.error("Failed to load NGO dashboard", error);
      setError("Unable to load NGO dashboard data. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard(true);
  }, [loadDashboard]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadDashboard(false);
    }, 15000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadDashboard]);


  const activeRequirements = useMemo(
    () =>
      requirements.filter(
        (item) => status(item.status) === "ACTIVE"
      ),
    [requirements]
  );

  const incomingDonations = useMemo(
    () =>
      matches.filter((item) => status(item.status) !== "CANCELLED"),
    [matches]
  );

  const scheduledPickups = useMemo(
    () =>
      pickups.filter((item) =>
        ["SCHEDULED", "PICKUP_SCHEDULED", "READY_FOR_PICKUP"].includes(
          status(item.status)
        )
      ),
    [pickups]
  );

  const completedPickups = useMemo(
    () => pickups.filter((item) => status(item.status) === "COMPLETED"),
    [pickups]
  );

  const foodDiverted = useMemo(
    () =>
      completedPickups.reduce((total, pickup) => {
        const match = matches.find(
          (item) => item.match_id === pickup.match_id
        );

        const committedQuantity = Number(
          pickup.committed_quantity ?? 0
        );

        const donationQuantity = Number(
          pickup.donation_quantity ?? 0
        );

        const matchQuantity = Number(
          match?.available_quantity ?? 0
        );

        const quantity =
          committedQuantity > 0
            ? committedQuantity
            : donationQuantity > 0
              ? donationQuantity
              : matchQuantity;

        return total + (Number.isFinite(quantity) ? Math.max(quantity, 0) : 0);
      }, 0),
    [completedPickups, matches]
  );

  const co2Saved = foodDiverted * CO2E_PER_KG_FOOD;
  const mealsRedistributed = foodDiverted * MEALS_PER_KG_FOOD;

  const recentPickups = useMemo(
    () =>
      [...pickups]
        .sort(
          (a, b) =>
            new Date(b.scheduled_start || b.created_at || 0).getTime() -
            new Date(a.scheduled_start || a.created_at || 0).getTime()
        )
        .slice(0, 6),
    [pickups]
  );

  const upcomingPickups = useMemo(
    () =>
      pickups
        .filter((pickup) => {
          const pickupTime = pickup.scheduled_start
            ? new Date(pickup.scheduled_start).getTime()
            : 0;

          return (
            pickupTime >= Date.now() &&
            !["COMPLETED", "CANCELLED"].includes(status(pickup.status))
          );
        })
        .sort(
          (a, b) =>
            new Date(a.scheduled_start || 0).getTime() -
            new Date(b.scheduled_start || 0).getTime()
        )
        .slice(0, 5),
    [pickups]
  );

  const completedRecent = useMemo(
    () =>
      [...completedPickups]
        .sort(
          (a, b) =>
            new Date(b.scheduled_start || b.created_at || 0).getTime() -
            new Date(a.scheduled_start || a.created_at || 0).getTime()
        )
        .slice(0, 5),
    [completedPickups]
  );

  const getMatchForPickup = useCallback(
    (pickup: Pickup) =>
      matches.find((match) => match.match_id === pickup.match_id),
    [matches]
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-36 animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-slate-200" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"
            />
          ))}
        </div>
        <div className="h-80 animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-slate-200" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
    

<header className="px-1 pb-0 pt-3 sm:pt-0">
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
        NGO{" "}
        <span className="bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
          Dashboard
        </span>
      </h2>

      <p className="mt-1 max-w-xl text-sm text-slate-600 sm:text-base dark:text-slate-400">
        Receive. Distribute. Make an Impact.
      </p>
    </div>

    <div className="flex flex-wrap gap-2">
      <Link
        to="/ngo/requirements"
        className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-green-600/20 transition hover:from-emerald-600 hover:to-green-700 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 active:scale-[0.98] dark:focus-visible:ring-offset-slate-900"
      >
        
        Requirements
      </Link>

      <Link
        to="/ngo/matches"
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 active:scale-[0.98] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:focus-visible:ring-offset-slate-900"
      >
       
        View Matches
      </Link>

      <button
        type="button"
        onClick={() => void loadDashboard(false)}
        disabled={refreshing}
        className="inline-flex items-center gap-1.5 rounded-xl border border-transparent px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-200/70 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white dark:focus-visible:ring-offset-slate-900"
      >
        {refreshing ? "Refreshing..." : "Refresh"}
      </button>
    </div>
  </div>

  {/* Styled divider */}
  <div className="relative mb-4 mt-4 sm:mb-6 sm:mt-5">
    <div className="h-px w-full bg-gradient-to-r from-slate-300 via-slate-200 to-transparent dark:from-slate-600 dark:via-slate-700" />
    <div className="absolute left-0 top-0 h-[2px] w-16 -translate-y-1/2 rounded-full bg-gradient-to-r from-amber-500 to-orange-600" />
  </div>
</header>

      {error && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadDashboard(false)}
            className="w-fit rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-bold hover:bg-amber-200"
          >
            Retry
          </button>
        </div>
      )}

      <section>
        <div className="mb-3">
          <h2 className="text-base font-bold text-slate-900">
            Operations Overview
          </h2>
          <p className="text-xs text-slate-500">
            Current NGO activity across requirements, donations, and pickups.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Active Requirements"
            value={activeRequirements.length}
            subtitle="Currently active food requirements"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a3 3 0 016 0M8 11h8M8 15h5" />
              </svg>
            }
          />
          <StatCard
            title="Incoming Donations"
            value={incomingDonations.length}
            subtitle="Available donation matches"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z" />
              </svg>
            }
          />
          <StatCard
            title="Scheduled Pickups"
            value={scheduledPickups.length}
            subtitle="Awaiting collection"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 4h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2zm0 5h10" />
              </svg>
            }
          />
          <StatCard
            title="Completed Pickups"
            value={completedPickups.length}
            subtitle="Successfully completed"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4M12 3l7 4v5c0 4.5-3 7.8-7 9-4-1.2-7-4.5-7-9V7l7-4z" />
              </svg>
            }
          />
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Sustainability Impact
            </h2>
            <p className="text-xs text-slate-500">
              Calculated from completed donation pickups.
            </p>
          </div>
          <span className="text-[11px] font-medium text-slate-400">
            Based on completed donations
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                  Food Waste Diverted
                </p>
                <p className="mt-2 text-3xl font-extrabold text-emerald-900">
                  {formatNumber(foodDiverted)}
                </p>
                <p className="mt-1 text-xs text-emerald-700">kg food</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 3v8m0 0c0 1.1.9 2 2 2h1V3m-3 8h3m-1 2v8m7-18v8m0 0c0 1.1.9 2 2 2h1V3m-3 8h3m-1 2v8" />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-sky-700">
                  CO₂e Saved
                </p>
                <p className="mt-2 text-3xl font-extrabold text-sky-900">
                  {formatNumber(co2Saved)}
                </p>
                <p className="mt-1 text-xs text-sky-700">kg CO₂e</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sky-600 shadow-sm">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 21a9 9 0 100-18 9 9 0 000 18zM8 14c1.2-2.5 2.8-3.5 5-3.5 1.4 0 2.5.5 3 1.5M8 10h.01M16 15h.01" />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-orange-200 bg-orange-50/70 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-orange-700">
                  Meals Redistributed
                </p>
                <p className="mt-2 text-3xl font-extrabold text-orange-900">
                  {formatNumber(mealsRedistributed, 0)}
                </p>
                <p className="mt-1 text-xs text-orange-700">meal equivalents</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-orange-600 shadow-sm">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 3v7m0 0c0 1.1-.9 2-2 2V3m2 7c0 1.1.9 2 2 2V3M7 12v9m8-18v18m0-18c2 1 3 3 3 5v3h-3" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-[11px] leading-5 text-slate-500">
          Impact is calculated from completed donations using the existing
          project methodology: 1 donation unit ≈ 1 kg food, 2.5 kg CO₂e avoided
          per kg of food, and 2 meal equivalents per kg.
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Incoming Donations</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Donation matches generated for your requirements.
              </p>
            </div>
            <Link
              to="/ngo/matches"
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
            >
              View all
            </Link>
          </div>

          {incomingDonations.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm font-semibold text-slate-700">No incoming donations</p>
              <p className="mt-1 text-xs text-slate-500">
                New donation matches will appear here.
              </p>
              <Link
                to="/ngo/requirements"
                className="mt-4 inline-flex rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700"
              >
                Update Requirements
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {incomingDonations.slice(0, 5).map((match) => (
                <div
                  key={match.match_id}
                  className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">{match.food_name}</h3>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${statusClasses(match.status)}`}>
                        {displayStatus(match.status)}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500 md:grid-cols-4">
                      <span>
                        Qty: <strong className="text-slate-700">{formatNumber(Number(match.available_quantity) || 0, 2)} {match.required_unit}</strong>
                      </span>
                      <span>
                        Match: <strong className="text-slate-700">{formatNumber(Number(match.match_score) || 0, 0)}%</strong>
                      </span>
                      <span>
                        Distance: <strong className="text-slate-700">{match.distance_km == null ? "N/A" : `${formatNumber(Number(match.distance_km))} km`}</strong>
                      </span>
                      <span>
                        Until: <strong className="text-slate-700">{formatDate(match.available_until)}</strong>
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Donor: <span className="font-semibold text-slate-700">{match.donor_organization_name || "Not provided"}</span>
                    </p>
                  </div>
                  <Link
                    to="/ngo/matches"
                    className="w-fit rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                  >
                    View Match
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-slate-900">Upcoming Pickups</h2>
            <p className="mt-0.5 text-xs text-slate-500">Your next scheduled collections.</p>
          </div>

          {upcomingPickups.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm font-semibold text-slate-700">No upcoming pickups</p>
              <p className="mt-1 text-xs text-slate-500">Schedule one from the Matches page.</p>
              <Link
                to="/ngo/matches"
                className="mt-4 inline-flex rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700"
              >
                Find Matches
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {upcomingPickups.map((pickup) => {
                const match = getMatchForPickup(pickup);
                return (
                  <div key={pickup.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">
                          {match?.food_name || "Food Donation"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDateTime(pickup.scheduled_start)}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ring-1 ring-inset ${statusClasses(pickup.status)}`}>
                        {displayStatus(pickup.status)}
                      </span>
                    </div>
                    <p className="mt-2 truncate text-xs text-slate-500">
                      📍 {pickup.pickup_location || "Location not provided"}
                    </p>
                    {pickup.pickup_person_name && (
                      <p className="mt-1 truncate text-xs text-slate-500">
                        Collector: <span className="font-semibold text-slate-700">{pickup.pickup_person_name}</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Pickup History</h2>
              <p className="mt-0.5 text-xs text-slate-500">Recent collection activity.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
              {pickups.length} total
            </span>
          </div>

          {recentPickups.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-slate-500">
              No pickup history yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-left">
                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">Donation</th>
                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">Donor</th>
                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">Pickup</th>
                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentPickups.map((pickup) => {
                    const match = getMatchForPickup(pickup);
                    return (
                      <tr key={pickup.id} className="hover:bg-slate-50/60">
                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-slate-800">{match?.food_name || "Food Donation"}</p>
                          {match && (
                            <p className="mt-1 text-xs text-slate-500">
                              {formatNumber(Number(match.available_quantity) || 0, 2)} {match.required_unit}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-sm font-medium text-slate-700">
                            {pickup.donor_organization_name || match?.donor_organization_name || "Not provided"}
                          </p>
                          {(pickup.donor_owner_name || match?.donor_owner_name) && (
                            <p className="mt-1 text-xs text-slate-500">
                              Owner: {pickup.donor_owner_name || match?.donor_owner_name}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-xs font-medium text-slate-700">{formatDateTime(pickup.scheduled_start)}</p>
                          <p className="mt-1 max-w-[180px] truncate text-xs text-slate-500">
                            {pickup.pickup_location || "Location not provided"}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ring-inset ${statusClasses(pickup.status)}`}>
                            {displayStatus(pickup.status)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Active Requirements</h2>
              <p className="mt-0.5 text-xs text-slate-500">Current food needs.</p>
            </div>
            <Link to="/ngo/requirements" className="text-xs font-bold text-emerald-600 hover:text-emerald-700">
              Manage
            </Link>
          </div>

          {activeRequirements.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm font-semibold text-slate-700">No active requirements</p>
              <p className="mt-1 text-xs text-slate-500">Add requirements to receive relevant matches.</p>
              <Link
                to="/ngo/requirements"
                className="mt-4 inline-flex rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700"
              >
                Add Requirement
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {activeRequirements.slice(0, 6).map((requirement) => (
                <div key={requirement.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-800">{requirement.food_name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Need <span className="font-semibold text-slate-700">{formatNumber(requirement.quantity_required, 2)} {requirement.unit}</span>
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                      Active
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Required by {formatDate(requirement.required_by)}</span>
                    <span>{formatNumber(requirement.max_distance_km, 0)} km</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-bold text-slate-900">Recently Completed</h2>
          <p className="mt-0.5 text-xs text-slate-500">Completed donations contributing to your impact.</p>
        </div>

        {completedRecent.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-semibold text-slate-700">No completed pickups yet</p>
            <p className="mt-1 text-xs text-slate-500">
              Completed donations will appear here and contribute to the sustainability metrics above.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {completedRecent.map((pickup) => {
              const match = getMatchForPickup(pickup);
              const quantity = Number(
                pickup.committed_quantity ?? pickup.donation_quantity ?? 0
              );

              return (
                <div
                  key={pickup.id}
                  className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-slate-900">
                        {match?.food_name || "Food Donation"}
                      </p>
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                        Completed
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Donor: {pickup.donor_organization_name || match?.donor_organization_name || "Not provided"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs">
                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <span className="text-slate-400">Date</span>
                      <p className="font-semibold text-slate-700">
                        {formatDate(pickup.scheduled_start || pickup.created_at)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-emerald-50 px-3 py-2">
                      <span className="text-emerald-600">Committed quantity</span>
                      <p className="font-semibold text-emerald-800">
                        {formatNumber(Number.isFinite(quantity) ? quantity : 0, 2)} {pickup.donation_unit || match?.required_unit || "units"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
