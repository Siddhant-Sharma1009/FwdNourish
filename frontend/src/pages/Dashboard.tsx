import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import type { Inventory } from "../types/inventory";
import type { Transaction } from "../types/transaction";
import type { DonationResponse } from "../types/donation";

import { getInventory } from "../services/inventoryApi";
import { getTransactions } from "../services/transactionApi";
import { getMyDonations } from "../services/donationApi";
import {
  getBusinessPickups,
  type Pickup,
} from "../services/pickupApi";
import type { AIPrediction } from "../services/aiPredictionApi";
import { getAIPredictions } from "../services/aiPredictionApi";
import { calculateSustainabilityImpact } from "../utils/sustainabilityImpact";

function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [aiPredictions, setAIPredictions] = useState<AIPrediction[]>([]);
  const [donations, setDonations] = useState<DonationResponse[]>([]);
  const [pickups, setPickups] = useState<Pickup[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading || !user) return;
    if (user.role !== "TENANT" || user.status !== "ACTIVE") return;

    let cancelled = false;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        const [inventoryData, transactionData, aiData, donationData, pickupData] =
          await Promise.all([
            getInventory(),
            getTransactions(),
            getAIPredictions(),
            getMyDonations(),
            getBusinessPickups(),
          ]);

        if (cancelled) return;

        setInventory(inventoryData);
        setTransactions(transactionData);
        setAIPredictions(aiData);
        setDonations(donationData);
        setPickups(pickupData);
      } catch (err) {
        console.error("Business dashboard load failed:", err);
        if (!cancelled) {
          setError("Failed to load some dashboard data. Please refresh and try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  const inventoryHealth = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalStock = 0;
    let safe = 0;
    const expired: Inventory[] = [];
    const expiringSoon: Inventory[] = [];

    inventory.forEach((item) => {
      totalStock += Number(item.quantity) || 0;

      const expiryDate = new Date(item.expiry_date);
      expiryDate.setHours(0, 0, 0, 0);

      const daysRemaining = Math.ceil(
        (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysRemaining < 0) {
        expired.push(item);
      } else if (daysRemaining <= item.expiry_threshold_days) {
        expiringSoon.push(item);
      } else {
        safe += 1;
      }
    });

    return {
      totalItems: inventory.length,
      totalStock,
      safe,
      expired,
      expiringSoon,
    };
  }, [inventory]);

  const riskSummary = useMemo(() => {
    const low = aiPredictions.filter((p) => p.risk_level === "LOW").length;
    const medium = aiPredictions.filter((p) => p.risk_level === "MEDIUM").length;
    const high = aiPredictions.filter((p) => p.risk_level === "HIGH").length;

    const averageRiskScore = aiPredictions.length
      ? aiPredictions.reduce((sum, p) => sum + Number(p.risk_score || 0), 0) /
        aiPredictions.length
      : 0;

    const recommendedPurchase = aiPredictions.reduce(
      (sum, p) => sum + Number(p.recommended_purchase_quantity || 0),
      0
    );

    return { low, medium, high, averageRiskScore, recommendedPurchase };
  }, [aiPredictions]);

  const donationSummary = useMemo(() => {
    const normalized = donations.map((donation) =>
      String(donation.donation_status || "").toUpperCase()
    );

    const activeStatuses = new Set(["PUBLISHED", "ACTIVE"]);
    const completedStatuses = new Set(["COMPLETED", "DONATED"]);
    const cancelledStatuses = new Set(["CANCELLED", "CANCELED"]);

    const active = normalized.filter((status) => activeStatuses.has(status)).length;
    const completed = normalized.filter((status) => completedStatuses.has(status)).length;
    const cancelled = normalized.filter((status) => cancelledStatuses.has(status)).length;

    const pendingPickups = pickups.filter((pickup) => {
      const status = String(pickup.status || "").toUpperCase();
      return !["COMPLETED", "CANCELLED", "CANCELED"].includes(status);
    }).length;

    const completedPickupDonationIds = new Set(
      pickups
        .filter((pickup) => String(pickup.status || "").toUpperCase() === "COMPLETED")
        .map((pickup) => pickup.donation_id)
    );

    const completedDonationQuantities = donations
      .filter((donation) => completedPickupDonationIds.has(donation.id))
      .map((donation) => Number(donation.quantity) || 0);

    const completedFromDonationStatus = donations
      .filter((donation) => completedStatuses.has(String(donation.donation_status || "").toUpperCase()))
      .map((donation) => Number(donation.quantity) || 0);

    const quantities = completedDonationQuantities.length
      ? completedDonationQuantities
      : completedFromDonationStatus;

    const totalQuantityDonated = donations.reduce(
      (sum, donation) => sum + Number(donation.quantity || 0),
      0
    );

    return {
      total: donations.length,
      active,
      completed,
      cancelled,
      pendingPickups,
      totalQuantityDonated,
      completedDonationQuantities: quantities,
    };
  }, [donations, pickups]);

  const sustainability = useMemo(
    () =>
      calculateSustainabilityImpact(donationSummary.completedDonationQuantities),
    [donationSummary.completedDonationQuantities]
  );

  const recentDonations = useMemo(
    () =>
      [...donations]
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        .slice(0, 5),
    [donations]
  );

  const recentPickups = useMemo(
    () =>
      [...pickups]
        .sort(
          (a, b) =>
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime()
        )
        .slice(0, 5),
    [pickups]
  );

  // Last 7 days of transaction activity, grouped by day, for the trend chart.
  const transactionTrend = useMemo(() => {
    const days: { label: string; date: string; total: number }[] = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      days.push({
        label: d.toLocaleDateString(undefined, { weekday: "short" }),
        date: d.toDateString(),
        total: 0,
      });
    }
    const byDate = new Map(days.map((d) => [d.date, d]));
    transactions.forEach((t) => {
      const d = new Date(t.created_at);
      d.setHours(0, 0, 0, 0);
      const bucket = byDate.get(d.toDateString());
      if (bucket) bucket.total += Number(t.quantity) || 0;
    });
    return days;
  }, [transactions]);

  if (authLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-sm text-slate-500">Loading account...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-slate-500">Please log in to continue.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500">Loading business dashboard...</p>
        </div>
      </div>
    );
  }

  const healthTotal = Math.max(inventoryHealth.totalItems, 1);
  const riskTotal = Math.max(aiPredictions.length, 1);

  const statCards = [
    {
      title: "Total Items",
      value: inventoryHealth.totalItems.toLocaleString(),
      description: "Inventory items registered",
      to: "/inventory",
      icon: <IconBox />,
      className: "border-slate-200 bg-white text-slate-900",
      iconWrap: "bg-slate-100 text-slate-600",
    },
    {
      title: "Total Stock",
      value: inventoryHealth.totalStock.toLocaleString(),
      description: "Units currently in stock",
      to: "/inventory",
      icon: <IconLayers />,
      className: "border-emerald-200 bg-emerald-50/50 text-emerald-700",
      iconWrap: "bg-emerald-100 text-emerald-700",
    },
    {
      title: "Expiring Soon",
      value: inventoryHealth.expiringSoon.length.toString(),
      description: "Requires immediate action",
      to: "/expiry-alerts",
      icon: <IconClock />,
      className: "border-amber-200 bg-amber-50/50 text-amber-700",
      iconWrap: "bg-amber-100 text-amber-700",
    },
    {
      title: "Expired",
      value: inventoryHealth.expired.length.toString(),
      description: "Pending removal or disposal",
      to: "/expiry-alerts",
      icon: <IconAlert />,
      className: "border-rose-200 bg-rose-50/50 text-rose-700",
      iconWrap: "bg-rose-100 text-rose-700",
    },
  ];

  const healthSegments: ChartSegment[] = [
    { label: "Safe", value: inventoryHealth.safe, color: "#10b981", to: "/inventory" },
    { label: "Expiring Soon", value: inventoryHealth.expiringSoon.length, color: "#fbbf24", to: "/expiry-alerts" },
    { label: "Expired", value: inventoryHealth.expired.length, color: "#f43f5e", to: "/expiry-alerts" },
  ];

  const riskSegments: ChartSegment[] = [
    { label: "Low Risk", value: riskSummary.low, color: "#10b981", to: "/ai-forecasting" },
    { label: "Medium Risk", value: riskSummary.medium, color: "#fbbf24", to: "/ai-forecasting" },
    { label: "High Risk", value: riskSummary.high, color: "#f43f5e", to: "/ai-forecasting" },
  ];

  const donationSegments: ChartSegment[] = [
    { label: "Active", value: donationSummary.active, color: "#10b981", to: "/surplus" },
    { label: "Pending Pickup", value: donationSummary.pendingPickups, color: "#fbbf24", to: "/surplus" },
    { label: "Completed", value: donationSummary.completed, color: "#3b82f6", to: "/surplus" },
    { label: "Cancelled", value: donationSummary.cancelled, color: "#94a3b8", to: "/surplus" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Business Dashboard
          </h1>
          <p className="text-sm text-slate-500">
            Inventory health, AI waste risk, donations and sustainability impact.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/inventory"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm"
          >
            Inventory
          </Link>
          <Link
            to="/surplus"
            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-sm"
          >
            Donations
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700 shadow-sm">
          {error}
        </div>
      )}

      {/* Stat cards: each one links through to the page it summarizes */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link
            to={stat.to}
            key={stat.title}
            className={`group flex items-start justify-between rounded-xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${stat.className}`}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {stat.title}
              </p>
              <p className="mt-2 text-3xl font-extrabold tracking-tight">{stat.value}</p>
              <p className="mt-1 text-xs text-slate-500">{stat.description}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 opacity-0 transition group-hover:opacity-100">
                View details <IconArrow />
              </span>
            </div>
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${stat.iconWrap}`}>
              {stat.icon}
            </span>
          </Link>
        ))}
      </div>

      {/* Inventory Health: progress bars + interactive donut chart */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Inventory Health</h2>
            <p className="text-sm text-slate-500">Current inventory condition based on expiry dates. Click any segment to investigate.</p>
          </div>
          <Link to="/expiry-alerts" className="text-xs font-semibold text-emerald-600 hover:underline">
            View expiry alerts
          </Link>
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_auto_260px]">
          <div className="space-y-4">
            {[
              { label: "Safe", value: inventoryHealth.safe, bar: "bg-emerald-500", text: "text-emerald-700", to: "/inventory" },
              { label: "Expiring Soon", value: inventoryHealth.expiringSoon.length, bar: "bg-amber-400", text: "text-amber-700", to: "/expiry-alerts" },
              { label: "Expired", value: inventoryHealth.expired.length, bar: "bg-rose-500", text: "text-rose-700", to: "/expiry-alerts" },
            ].map((row) => (
              <button
                type="button"
                key={row.label}
                onClick={() => navigate(row.to)}
                className="block w-full text-left"
              >
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700 hover:text-slate-900">{row.label}</span>
                  <span className={`font-bold ${row.text}`}>{row.value}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all ${row.bar}`}
                    style={{ width: `${Math.min(100, (row.value / healthTotal) * 100)}%` }}
                  />
                </div>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-center ">
            <DonutChart segments={healthSegments} centerLabel="Total Items" centerValue={inventoryHealth.totalItems.toLocaleString()} />
          </div>

          <div className="rounded-xl bg-slate-50 p-4 ">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Health summary</p>
            <div className="mt-3 space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Healthy items</span><b>{inventoryHealth.safe}</b></div>
              <div className="flex justify-between"><span className="text-slate-500">Needs attention</span><b>{inventoryHealth.expiringSoon.length + inventoryHealth.expired.length}</b></div>
              <div className="flex justify-between"><span className="text-slate-500">Health coverage</span><b>{((inventoryHealth.safe / healthTotal) * 100).toFixed(0)}%</b></div>
            </div>
          </div>
        </div>
      </section>

      {/* Waste Risk: interactive bar chart + donut + existing detail table */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Waste Risk</h2>
            <p className="text-sm text-slate-500">AI-generated risk levels from your existing prediction service.</p>
          </div>
          <Link to="/ai-forecasting" className="text-xs font-semibold text-emerald-600 hover:underline">
            Open forecasting
          </Link>
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_220px]">
          <BarChart segments={riskSegments} maxValue={riskTotal} onBarClick={(seg) => navigate(seg.to!)} />
          <div className="flex items-center justify-center">
            <DonutChart segments={riskSegments} centerLabel="Predictions" centerValue={aiPredictions.length.toLocaleString()} size={150} />
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => navigate("/ai-forecasting")}
            className="rounded-xl border border-rose-100 bg-rose-50/50 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-rose-600">High-risk items</p>
            <p className="mt-1 text-2xl font-extrabold text-rose-700">{riskSummary.high}</p>
            <p className="mt-1 text-xs text-rose-600">Immediate review recommended by the AI model.</p>
          </button>
          <button
            type="button"
            onClick={() => navigate("/ai-forecasting")}
            className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Recommended purchase</p>
            <p className="mt-1 text-2xl font-extrabold text-emerald-700">{riskSummary.recommendedPurchase.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
            <p className="mt-1 text-xs text-emerald-600">Total units recommended by current predictions.</p>
          </button>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Inventory ID</th>
                <th className="px-4 py-3">Demand / Day</th>
                <th className="px-4 py-3">Risk Score</th>
                <th className="px-4 py-3">Risk Level</th>
                <th className="px-4 py-3">Recommended Purchase</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {aiPredictions.slice(0, 8).map((prediction) => {
                const riskClasses = prediction.risk_level === "HIGH"
                  ? "bg-rose-100 text-rose-700"
                  : prediction.risk_level === "MEDIUM"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-emerald-100 text-emerald-700";

                return (
                  <tr
                    key={prediction.id}
                    onClick={() => navigate("/ai-forecasting")}
                    className="cursor-pointer hover:bg-slate-50/70"
                  >
                    <td className="px-4 py-3 font-semibold text-slate-800">#{prediction.inventory_id}</td>
                    <td className="px-4 py-3 text-slate-600">{Number(prediction.forecast_daily_demand || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{Number(prediction.risk_score || 0).toFixed(2)}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${riskClasses}`}>{prediction.risk_level}</span></td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{Number(prediction.recommended_purchase_quantity || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                  </tr>
                );
              })}
              {aiPredictions.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">No AI predictions available yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 7-day transaction activity trend */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Activity Trend</h2>
            <p className="text-sm text-slate-500">Total inventory units moved per day over the last 7 days.</p>
          </div>
          <Link to="/transactions" className="text-xs font-semibold text-emerald-600 hover:underline">View all transactions</Link>
        </div>
        <div className="mt-5">
          <TrendChart data={transactionTrend} onClick={() => navigate("/transactions")} />
        </div>
      </section>

      {/* Donation Tracker: mini stats + donut + recent lists */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Donation Tracker</h2>
            <p className="text-sm text-slate-500">Track your surplus food redistribution workflow.</p>
          </div>
          <Link to="/surplus" className="text-xs font-semibold text-emerald-600 hover:underline">View donations</Link>
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_180px]">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Total Donations", value: donationSummary.total, className: "text-slate-900" },
              { label: "Active", value: donationSummary.active, className: "text-emerald-700" },
              { label: "Pending Pickup", value: donationSummary.pendingPickups, className: "text-amber-700" },
              { label: "Completed", value: donationSummary.completed, className: "text-blue-700" },
            ].map((item) => (
              <button
                type="button"
                key={item.label}
                onClick={() => navigate("/surplus")}
                className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{item.label}</p>
                <p className={`mt-2 text-2xl font-extrabold ${item.className}`}>{item.value}</p>
              </button>
            ))}
          </div>
          <div className="flex items-center justify-center">
            <DonutChart segments={donationSegments} centerLabel="Total" centerValue={donationSummary.total.toLocaleString()} size={150} />
          </div>
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Recent donations</h3>
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {recentDonations.length === 0 ? (
                <p className="p-6 text-center text-sm text-slate-500">No donations yet.</p>
              ) : recentDonations.map((donation) => (
                <button
                  type="button"
                  key={donation.id}
                  onClick={() => navigate("/surplus")}
                  className="flex w-full items-center justify-between gap-4 p-4 text-left transition hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800">Donation #{donation.id}</p>
                    <p className="text-xs text-slate-500">{Number(donation.quantity || 0).toLocaleString()} units • {donation.pickup_location || "Location not specified"}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">{donation.donation_status}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Recent pickups</h3>
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {recentPickups.length === 0 ? (
                <p className="p-6 text-center text-sm text-slate-500">No pickups scheduled yet.</p>
              ) : recentPickups.map((pickup) => (
                <button
                  type="button"
                  key={pickup.id}
                  onClick={() => navigate("/surplus")}
                  className="flex w-full items-center justify-between gap-4 p-4 text-left transition hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800">Pickup #{pickup.id}</p>
                    <p className="truncate text-xs text-slate-500">{pickup.ngo_organization_name || "NGO"} • {pickup.pickup_location || "Location not specified"}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">{pickup.status}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Sustainability Impact: pictorial icon cards */}
      <section className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Sustainability Impact</h2>
          <p className="text-sm text-slate-500">Impact generated from successfully completed donation pickups.</p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <ImpactCard
            label="Food Waste Diverted"
            value={sustainability.foodWasteDivertedKg}
            suffix="kg"
            description="Estimated food successfully redistributed"
            accent="text-emerald-700"
            iconWrap="bg-emerald-100 text-emerald-700"
            icon={<IconLeaf />}
          />
          <ImpactCard
            label="CO₂ Equivalent Saved"
            value={sustainability.co2eSavedKg}
            suffix="kg CO₂e"
            description="Estimated avoided emissions"
            accent="text-teal-700"
            iconWrap="bg-teal-100 text-teal-700"
            icon={<IconCloud />}
          />
          <ImpactCard
            label="Meals Redistributed"
            value={sustainability.mealsRedistributed}
            suffix="meals"
            description="Estimated meal equivalents"
            accent="text-blue-700"
            iconWrap="bg-blue-100 text-blue-700"
            icon={<IconBowl />}
          />
        </div>

        <div className="mt-4 rounded-xl border border-emerald-100 bg-white/80 p-4 text-xs text-slate-500">
          <b className="text-slate-700">Impact methodology:</b> the current frontend uses project-level estimates of 1 donated inventory unit = 1 kg food, 2.5 kg CO₂e avoided per kg, and 2 meal equivalents per kg. Replace these factors later with your validated/category-specific methodology or backend impact data.
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Recent Transactions</h2>
              <p className="text-xs text-slate-500">Latest stock activity log</p>
            </div>
            <Link to="/transactions" className="text-xs font-semibold text-emerald-600 hover:underline">View all</Link>
          </div>
          {transactions.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">No transactions recorded yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {transactions.slice(0, 5).map((transaction) => (
                <button
                  type="button"
                  key={transaction.id}
                  onClick={() => navigate("/transactions")}
                  className="flex w-full items-center justify-between p-4 text-left transition hover:bg-slate-50"
                >
                  <div className="min-w-0 pr-4">
                    <p className="text-sm font-medium capitalize text-slate-800">{transaction.transaction_type}</p>
                    <p className="truncate text-xs text-slate-500">{transaction.note || "Standard Inventory Log"}</p>
                  </div>
                  <div className="text-right">
                    <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{transaction.quantity} units</span>
                    <p className="mt-1 text-[11px] text-slate-400">{new Date(transaction.created_at).toLocaleDateString()}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Expiry Attention</h2>
              <p className="text-xs text-slate-500">Items requiring resolution</p>
            </div>
            <Link to="/expiry-alerts" className="text-xs font-semibold text-emerald-600 hover:underline">View alerts</Link>
          </div>
          <div className="space-y-3 p-4">
            {[...inventoryHealth.expired, ...inventoryHealth.expiringSoon].slice(0, 5).map((item) => {
              const expired = inventoryHealth.expired.some((entry) => entry.id === item.id);
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => navigate("/expiry-alerts")}
                  className={`flex w-full items-center justify-between rounded-lg border p-3.5 text-left transition hover:shadow-sm ${expired ? "border-rose-200 bg-rose-50/50" : "border-amber-200 bg-amber-50/50"}`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{item.name}</p>
                    <p className="font-mono text-xs text-slate-500">SKU: {item.sku}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${expired ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"}`}>
                    {expired ? "Expired" : "Expiring Soon"}
                  </span>
                </button>
              );
            })}
            {inventoryHealth.expired.length === 0 && inventoryHealth.expiringSoon.length === 0 && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-6 text-center">
                <p className="text-sm font-semibold text-emerald-900">All Stock is Fresh</p>
                <p className="mt-1 text-xs text-emerald-700">No expiring items need attention right now.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Chart + icon primitives (zero extra dependencies, plain SVG)        */
/* ------------------------------------------------------------------ */

type ChartSegment = {
  label: string;
  value: number;
  color: string;
  to?: string;
};

function DonutChart({
  segments,
  size = 170,
  thickness = 22,
  centerLabel,
  centerValue,
}: {
  segments: ChartSegment[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState<number | null>(null);
  const total = segments.reduce((sum, seg) => sum + seg.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let accumulated = 0;

  if (total <= 0) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex flex-col items-center justify-center rounded-full border-8 border-slate-100 text-center"
      >
        <span className="text-sm font-semibold text-slate-400">No data</span>
      </div>
    );
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={thickness} />
        {segments.map((seg, i) => {
          if (seg.value <= 0) return null;
          const fraction = seg.value / total;
          const dash = Math.max(circumference * fraction - 1.5, 0);
          const gap = circumference - dash;
          const rotation = (accumulated / total) * 360;
          accumulated += seg.value;
          const isHovered = hovered === i;

          return (
            <circle
              key={seg.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={isHovered ? thickness + 5 : thickness}
              strokeDasharray={`${dash} ${gap}`}
              strokeLinecap="round"
              transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
              className="cursor-pointer transition-all duration-150"
              style={{ opacity: hovered === null || isHovered ? 1 : 0.45 }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => seg.to && navigate(seg.to)}
            >
              <title>{`${seg.label}: ${seg.value}`}</title>
            </circle>
          );
        })}
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xl font-extrabold text-slate-900">
          {hovered !== null ? segments[hovered].value.toLocaleString() : centerValue}
        </span>
        <span className="max-w-[80px] text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {hovered !== null ? segments[hovered].label : centerLabel}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1">
        {segments.map((seg, i) => (
          <button
            type="button"
            key={seg.label}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => seg.to && navigate(seg.to)}
            className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 hover:text-slate-900"
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: seg.color }} />
            {seg.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function BarChart({
  segments,
  maxValue,
  onBarClick,
}: {
  segments: ChartSegment[];
  maxValue: number;
  onBarClick?: (segment: ChartSegment) => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const safeMax = Math.max(maxValue, 1);
  const chartHeight = 160;

  return (
    <div>
      <div className="flex h-[160px] items-end justify-around gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
        {segments.map((seg, i) => {
          const heightPx = Math.max((seg.value / safeMax) * (chartHeight - 40), 4);
          const isHovered = hovered === i;
          return (
            <button
              type="button"
              key={seg.label}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onBarClick?.(seg)}
              className="flex h-full flex-1 flex-col items-center justify-end"
            >
              <span
                className={`mb-1 text-xs font-bold transition-opacity ${isHovered ? "opacity-100" : "opacity-70"}`}
                style={{ color: seg.color }}
              >
                {seg.value}
              </span>
              <div
                className="w-full max-w-[48px] rounded-t-md transition-all duration-150"
                style={{
                  height: heightPx,
                  backgroundColor: seg.color,
                  opacity: isHovered ? 1 : 0.85,
                  transform: isHovered ? "scaleX(1.08)" : "scaleX(1)",
                }}
              />
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex justify-around">
        {segments.map((seg) => (
          <span key={seg.label} className="flex-1 text-center text-[11px] font-medium text-slate-500">
            {seg.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function TrendChart({
  data,
  onClick,
}: {
  data: { label: string; total: number }[];
  onClick?: () => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const width = 640;
  const height = 140;
  const padding = 20;
  const maxValue = Math.max(...data.map((d) => d.total), 1);

  const points = data.map((d, i) => {
    const x = padding + (i / Math.max(data.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - (d.total / maxValue) * (height - padding * 2);
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x},${height - padding} L${points[0].x},${height - padding} Z`;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full cursor-pointer"
        style={{ minWidth: 480 }}
        onClick={onClick}
      >
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>

        <path d={areaPath} fill="url(#trendFill)" />
        <path d={linePath} fill="none" stroke="#10b981" strokeWidth={2.5} />

        {points.map((p, i) => (
          <g key={p.label} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
            <circle cx={p.x} cy={p.y} r={hovered === i ? 6 : 4} fill="#10b981" stroke="white" strokeWidth={2} />
            <rect x={p.x - 16} y={0} width={32} height={height} fill="transparent" />
            <text x={p.x} y={height - 2} textAnchor="middle" fontSize={10} fill="#64748b">
              {p.label}
            </text>
            {hovered === i && (
              <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize={11} fontWeight={700} fill="#0f172a">
                {p.total}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

function ImpactCard({
  label,
  value,
  suffix,
  description,
  accent,
  icon,
  iconWrap,
}: {
  label: string;
  value: number;
  suffix: string;
  description: string;
  accent: string;
  icon: React.ReactNode;
  iconWrap: string;
}) {
  return (
    <div className="flex items-start justify-between rounded-xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        <p className={`mt-2 text-3xl font-extrabold ${accent}`}>
          {value.toLocaleString(undefined, { maximumFractionDigits: 1 })}
          <span className="ml-1 text-sm font-bold">{suffix}</span>
        </p>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconWrap}`}>{icon}</span>
    </div>
  );
}

/* Small inline icon set (no external icon library required) */

function IconBox() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M21 8L12 3 3 8v8l9 5 9-5V8z" strokeLinejoin="round" />
      <path d="M3 8l9 5 9-5M12 13v8" strokeLinejoin="round" />
    </svg>
  );
}

function IconLayers() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 3l9 5-9 5-9-5 9-5z" strokeLinejoin="round" />
      <path d="M3 13l9 5 9-5" strokeLinejoin="round" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" strokeLinecap="round" />
    </svg>
  );
}

function IconAlert() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 3l10 18H2L12 3z" strokeLinejoin="round" />
      <path d="M12 10v4" strokeLinecap="round" />
      <circle cx="12" cy="17.5" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconArrow() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconLeaf() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M4 20c8 0 16-6 16-16-10 0-16 6-16 16z" strokeLinejoin="round" />
      <path d="M4 20c3-4 6-7 12-12" strokeLinecap="round" />
    </svg>
  );
}

function IconCloud() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M7 18a4 4 0 010-8 5 5 0 019.6-1.5A4.5 4.5 0 0117.5 18H7z" strokeLinejoin="round" />
    </svg>
  );
}

function IconBowl() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M3 12h18a9 8 0 01-18 0z" strokeLinejoin="round" />
      <path d="M8 12V6M16 12V6" strokeLinecap="round" />
    </svg>
  );
}

export default Dashboard;