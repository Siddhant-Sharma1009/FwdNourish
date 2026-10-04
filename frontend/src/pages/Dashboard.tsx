import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import type { Inventory } from "../types/inventory";
import type { Transaction } from "../types/transaction";
import type { DonationResponse } from "../types/donation";

import { getInventory } from "../services/inventoryApi";
import { getTransactions } from "../services/transactionApi";
import { getMyDonations } from "../services/donationApi";
import { getBusinessPickups, type Pickup, } from "../services/pickupApi";
import type { AIPrediction } from "../services/aiPredictionApi";
import { getAIPredictions } from "../services/aiPredictionApi";
import { calculateSustainabilityImpact } from "../utils/sustainabilityImpact";

/* True below Tailwind's `md` breakpoint (phones / small tablets). */
function useIsMobile(breakpoint = 768) {
  const query = `(max-width: ${breakpoint - 1}px)`;
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return isMobile;
}

function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
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

  /* ================================================================ */
  /* MOBILE: app-style presentation of the same content               */
  /* ================================================================ */
  if (isMobile) {
    const needsAttention =
      inventoryHealth.expiringSoon.length + inventoryHealth.expired.length;
    const coverage = Math.round((inventoryHealth.safe / healthTotal) * 100);

    const jumpChips = [
      { id: "sec-stats", label: "Overview" },
      { id: "sec-inventory", label: "Inventory" },
      { id: "sec-risk", label: "Waste Risk" },
      { id: "sec-activity", label: "Activity" },
      { id: "sec-donations", label: "Donations" },
      { id: "sec-impact", label: "Impact" },
      { id: "sec-recent", label: "Recent" },
    ];
    const jumpTo = (id: string) =>
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

    return (
      <div className="space-y-4 pb-24 pt-1">
        {/* App hero */}
        <header className="rounded-3xl bg-gradient-to-br from-emerald-600 to-emerald-800 p-5 text-white shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight">Business Dashboard</h1>
              <p className="mt-1 text-sm text-emerald-100">Fresh today, profitable tomorrow.</p>
            </div>
            <Ring percent={coverage} />
          </div>
          <div className="mt-4 grid grid-cols-3 divide-x divide-white/15 rounded-2xl bg-white/10 py-3 text-center">
            <HeroStat label="Items" value={inventoryHealth.totalItems} />
            <HeroStat label="In stock" value={inventoryHealth.totalStock} />
            <HeroStat label="Need attention" value={needsAttention} />
          </div>
        </header>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}

        {/* Sticky quick-jump bar (all sections stay on one page) */}
        <nav
          aria-label="Jump to section"
          className="sticky top-0 z-20 -mx-4 bg-slate-50/90 px-4 py-2 backdrop-blur"
        >
          <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {jumpChips.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => jumpTo(c.id)}
                className="min-h-[38px] shrink-0 rounded-full bg-white px-4 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 transition active:scale-95 active:bg-slate-100"
              >
                {c.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Stat cards */}
        <div id="sec-stats" className="grid scroll-mt-16 grid-cols-2 gap-3">
          {statCards.map((stat) => (
            <Link
              to={stat.to}
              key={stat.title}
              className={`flex flex-col rounded-2xl border p-4 shadow-sm transition active:scale-[0.97] ${stat.className}`}
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${stat.iconWrap}`}>
                {stat.icon}
              </span>
              <p className="mt-3 text-2xl font-bold tracking-tight">{stat.value}</p>
              <p className="text-sm font-semibold text-slate-800">{stat.title}</p>
              <p className="mt-0.5 text-xs leading-4 text-slate-500">{stat.description}</p>
            </Link>
          ))}
        </div>

        {/* Inventory Health */}
        <AppCard
          id="sec-inventory"
          title="Inventory Health"
          subtitle="Current inventory condition based on expiry dates. Tap any row to investigate."
          to="/expiry-alerts"
          action="View expiry alerts"
        >
          <div className="flex items-center gap-4">
            <Donut
              segments={healthSegments}
              centerValue={inventoryHealth.totalItems.toLocaleString()}
              centerLabel="Total Items"
            />
            <Legend segments={healthSegments} />
          </div>
          <div className="mt-5 space-y-4">
            {healthSegments.map((row) => (
              <ProgressRow key={row.label} row={row} total={healthTotal} />
            ))}
          </div>
          <div className="mt-5 grid grid-cols-3 divide-x divide-slate-200 rounded-2xl bg-slate-50 py-3 text-center">
            <Metric label="Healthy items" value={inventoryHealth.safe} />
            <Metric label="Needs attention" value={needsAttention} />
            <Metric label="Health coverage" value={`${coverage}%`} />
          </div>
        </AppCard>

        {/* Waste Risk */}
        <AppCard
          id="sec-risk"
          title="Waste Risk"
          subtitle="AI-generated risk levels from your existing prediction service."
          to="/ai-forecasting"
          action="Open forecasting"
        >
          <div className="flex items-center gap-4">
            <Donut
              segments={riskSegments}
              centerValue={aiPredictions.length.toLocaleString()}
              centerLabel="Predictions"
            />
            <Legend segments={riskSegments} />
          </div>
          <div className="mt-5 space-y-4">
            {riskSegments.map((row) => (
              <ProgressRow key={row.label} row={row} total={riskTotal} />
            ))}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => navigate("/ai-forecasting")}
              className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4 text-left transition active:scale-[0.97]"
            >
              <p className="text-xs font-semibold text-rose-600">High-risk items</p>
              <p className="mt-1 text-2xl font-bold text-rose-700">{riskSummary.high}</p>
              <p className="mt-1 text-xs leading-4 text-rose-600">Immediate review recommended by the AI model.</p>
            </button>
            <button
              type="button"
              onClick={() => navigate("/ai-forecasting")}
              className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-left transition active:scale-[0.97]"
            >
              <p className="text-xs font-semibold text-emerald-600">Recommended purchase</p>
              <p className="mt-1 text-2xl font-bold text-emerald-700">
                {riskSummary.recommendedPurchase.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-xs leading-4 text-emerald-600">Total units recommended by current predictions.</p>
            </button>
          </div>

          {/* Table rows become cards */}
          <div className="mt-5 space-y-3">
            {aiPredictions.slice(0, 8).map((prediction) => (
              <PredictionCard
                key={prediction.id}
                prediction={prediction}
                item={inventory.find((item) => item.id === prediction.inventory_id)}
              />
            ))}
            {aiPredictions.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-500">No AI predictions available yet.</p>
            )}
          </div>
        </AppCard>

        {/* Activity Trend */}
        <AppCard
          id="sec-activity"
          title="Activity Trend"
          subtitle="Total inventory units moved per day over the last 7 days."
          to="/transactions"
          action="View transactions"
        >
          <MobileTrend data={transactionTrend} />
        </AppCard>

        {/* Donation Tracker */}
        <AppCard
          id="sec-donations"
          title="Donation Tracker"
          subtitle="Track your surplus food redistribution workflow."
          to="/surplus"
          action="View donations"
        >
          <div className="grid grid-cols-2 gap-3">
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
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left transition active:scale-[0.97]"
              >
                <p className="text-xs font-semibold text-slate-500">{item.label}</p>
                <p className={`mt-1 text-2xl font-bold ${item.className}`}>{item.value}</p>
              </button>
            ))}
          </div>

          <div className="mt-5 flex items-center gap-4">
            <Donut
              segments={donationSegments}
              centerValue={donationSummary.total.toLocaleString()}
              centerLabel="Total"
            />
            <Legend segments={donationSegments} />
          </div>

          <h3 className="mb-1 mt-6 text-sm font-semibold text-slate-900">Recent donations</h3>
          {recentDonations.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No donations yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentDonations.map((donation) => (
                <ListRow
                  key={donation.id}
                  title={`Donation ${donation.id}`}
                  subtitle={`${Number(donation.quantity || 0).toLocaleString()} units • ${donation.pickup_location || "Location not specified"}`}
                  badge={donation.donation_status}
                  onClick={() => navigate("/surplus")}
                />
              ))}
            </div>
          )}

          <h3 className="mb-1 mt-6 text-sm font-semibold text-slate-900">Recent pickups</h3>
          {recentPickups.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No pickups scheduled yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentPickups.map((pickup) => (
                <ListRow
                  key={pickup.id}
                  title={`Pickup ${pickup.id}`}
                  subtitle={`${pickup.ngo_organization_name || "NGO"} • ${pickup.pickup_location || "Location not specified"}`}
                  badge={pickup.status}
                  onClick={() => navigate("/surplus")}
                />
              ))}
            </div>
          )}
        </AppCard>

        {/* Sustainability Impact: swipeable cards */}
        <section id="sec-impact" className="scroll-mt-16">
          <div className="px-1">
            <h2 className="text-base font-bold text-slate-900">Sustainability Impact</h2>
            <p className="text-xs text-slate-500">Impact generated from successfully completed donation pickups.</p>
          </div>
          <div className="-mx-4 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <MobileImpact label="Food Waste Diverted" value={sustainability.foodWasteDivertedKg} suffix="kg" description="Estimated food successfully redistributed" accent="text-emerald-700" iconWrap="bg-emerald-100 text-emerald-700" icon={<IconLeaf />} />
            <MobileImpact label="CO₂ Equivalent Saved" value={sustainability.co2eSavedKg} suffix="kg CO₂e" description="Estimated avoided emissions" accent="text-teal-700" iconWrap="bg-teal-100 text-teal-700" icon={<IconCloud />} />
            <MobileImpact label="Meals Redistributed" value={sustainability.mealsRedistributed} suffix="meals" description="Estimated meal equivalents" accent="text-blue-700" iconWrap="bg-blue-100 text-blue-700" icon={<IconBowl />} />
          </div>
          <details className="mt-2 rounded-2xl border border-emerald-100 bg-white p-4 text-xs text-slate-500">
            <summary className="cursor-pointer select-none text-sm font-semibold text-slate-700">Impact methodology</summary>
            <p className="mt-2 leading-5">
              The current frontend uses project-level estimates of 1 donated inventory unit = 1 kg food, 2.5 kg CO₂e avoided per kg, and 2 meal equivalents per kg. Replace these factors later with your validated/category-specific methodology or backend impact data.
            </p>
          </details>
        </section>

        {/* Recent Transactions */}
        <AppCard
          id="sec-recent"
          title="Recent Transactions"
          subtitle="Latest stock activity log"
          to="/transactions"
          action="View all"
        >
          {transactions.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No transactions recorded yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {transactions.slice(0, 4).map((transaction) => (
                <button
                  type="button"
                  key={transaction.id}
                  onClick={() => navigate("/transactions")}
                  className="flex min-h-[56px] w-full items-center gap-3 py-3 text-left active:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold capitalize text-slate-800">{transaction.transaction_type}</p>
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
        </AppCard>

        {/* Expiry Attention */}
        <AppCard
          title="Expiry Attention"
          subtitle="Items requiring resolution"
          to="/expiry-alerts"
          action="View alerts"
        >
          <div className="space-y-2">
            {[...inventoryHealth.expired, ...inventoryHealth.expiringSoon].slice(0, 4).map((item) => {
              const expired = inventoryHealth.expired.some((entry) => entry.id === item.id);
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => navigate("/expiry-alerts")}
                  className={`flex min-h-[56px] w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition active:scale-[0.98] ${expired ? "border-rose-200 bg-rose-50/60" : "border-amber-200 bg-amber-50/60"}`}
                >
                  <div className="min-w-0 flex-1">
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
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 text-center">
                <p className="text-sm font-semibold text-emerald-900">All Stock is Fresh</p>
                <p className="mt-1 text-xs text-emerald-700">No expiring items need attention right now.</p>
              </div>
            )}
          </div>
        </AppCard>
      </div>
    );
  }

  /* ================================================================ */
  /* DESKTOP: original layout, unchanged                              */
  /* ================================================================ */
  return (

    <div className="space-y-6">
      <header className="px-1 pb-0 pt-3 sm:pt-0">
        <div className="flex items-center gap-2.5">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-3xl ">
            Business{" "}
            <span className="bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
              Dashboard
            </span>
          </h2>
        </div>

        <p className="mt-1 max-w-xl text-sm text-slate-600 sm:text-base dark:text-slate-400">
          Fresh today, profitable tomorrow.
        </p>

        {/* Styled divider */}
        <div className="relative mb-4 mt-4 sm:mb-6 sm:mt-5">
          <div className="h-px w-full bg-gradient-to-r from-slate-300 via-slate-200 to-transparent dark:from-slate-600 dark:via-slate-700" />
          <div className="absolute left-0 top-0 h-[2px] w-16 -translate-y-1/2 rounded-full bg-gradient-to-r from-amber-500 to-orange-600" />
        </div>
      </header>
      

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

          <div className="flex min-w-0 items-center justify-center overflow-hidden">
            <div className="max-w-full">
              <DonutChart
                segments={healthSegments}
                centerLabel="Total Items"
                centerValue={inventoryHealth.totalItems.toLocaleString()}
              />
            </div>
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
          <div className="flex min-w-0 items-center justify-center overflow-hidden">
            <div className="max-w-full">
              <DonutChart
                segments={riskSegments}
                centerLabel="Predictions"
                centerValue={aiPredictions.length.toLocaleString()}
                size={150}
              />
            </div>
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
                <th className="px-4 py-3">sku</th>
                <th className="px-4 py-3">Item Name</th>
                <th className="px-4 py-3">Demand / Day</th>
                <th className="px-4 py-3">Risk Score</th>
                <th className="px-4 py-3">Risk Level</th>
                <th className="px-4 py-3">Recommended Purchase</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">

              {aiPredictions.slice(0, 8).map((prediction) => {
                const predictionInventory = inventory.find(
                  (item) => item.id === prediction.inventory_id
                );
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
                    <td className="px-4 py-3 font-semibold text-slate-800">{predictionInventory?.sku ?? "-"}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800"> {predictionInventory?.name ?? `Inventory #${prediction.inventory_id}`} </td>
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

      <section className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-shadow duration-300 hover:shadow-md">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 3v18h18"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 16l4-5 3 3 5-7"
                />
              </svg>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                  Activity Trend
                </h2>

                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  7 Days
                </span>
              </div>

              <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                Total inventory units moved per day over the last 7 days.
              </p>
            </div>
          </div>

          <Link
            to="/transactions"
            className="inline-flex w-fit items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-emerald-600 transition-all duration-200 hover:bg-emerald-50 hover:text-emerald-700"
          >
            View transactions
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 10h12M11 5l5 5-5 5"
              />
            </svg>
          </Link>
        </div>

        {/* Chart */}
        <div className="px-3 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 sm:p-4">
            <div className="min-w-0 overflow-hidden">
              <TrendChart
                data={transactionTrend}
                onClick={() => navigate("/transactions")}
              />
            </div>
          </div>
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
                    <p className="font-semibold text-slate-800">Donation {donation.id}</p>
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
                    <p className="font-semibold text-slate-800">Pickup {pickup.id}</p>
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
              {transactions.slice(0, 4).map((transaction) => (
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
            {[...inventoryHealth.expired, ...inventoryHealth.expiringSoon].slice(0, 4).map((item) => {
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

/* ------------------------------------------------------------------ */
/* Mobile-only app components (used only when screen < 768px)          */
/* ------------------------------------------------------------------ */

function AppCard({
  id,
  title,
  subtitle,
  to,
  action,
  children,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  to?: string;
  action?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-16 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs leading-4 text-slate-500">{subtitle}</p>}
        </div>
        {to && action && (
          <Link
            to={to}
            className="flex min-h-[32px] shrink-0 items-center rounded-full bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 active:bg-emerald-100"
          >
            {action}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="px-2">
      <p className="text-lg font-bold text-slate-900">{value}</p>
      <p className="text-[11px] leading-3 text-slate-500">{label}</p>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-2">
      <p className="text-lg font-bold">{value.toLocaleString()}</p>
      <p className="text-[11px] text-emerald-100">{label}</p>
    </div>
  );
}

function Ring({ percent }: { percent: number }) {
  const size = 68;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="white"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(c * Math.min(percent, 100)) / 100} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-sm font-bold">{percent}%</span>
        <span className="mt-0.5 text-[9px] text-emerald-100">healthy</span>
      </div>
    </div>
  );
}

function Donut({
  segments,
  centerValue,
  centerLabel,
  size = 116,
}: {
  segments: ChartSegment[];
  centerValue: string;
  centerLabel: string;
  size?: number;
}) {
  const thickness = 14;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  let offset = 0;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={thickness} />
        {total > 0 &&
          segments.map((seg) => {
            if (seg.value <= 0) return null;
            const len = (c * seg.value) / total;
            const el = (
              <circle
                key={seg.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth={thickness}
                strokeDasharray={`${Math.max(len - 2, 0)} ${c}`}
                strokeDashoffset={-offset}
              />
            );
            offset += len;
            return el;
          })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        {total > 0 ? (
          <>
            <span className="text-lg font-bold leading-none text-slate-900">{centerValue}</span>
            <span className="mt-1 max-w-[64px] text-[10px] leading-3 text-slate-500">{centerLabel}</span>
          </>
        ) : (
          <span className="text-xs font-semibold text-slate-400">No data</span>
        )}
      </div>
    </div>
  );
}

function Legend({ segments }: { segments: ChartSegment[] }) {
  const navigate = useNavigate();
  return (
    <div className="min-w-0 flex-1">
      {segments.map((seg) => (
        <button
          key={seg.label}
          type="button"
          onClick={() => seg.to && navigate(seg.to)}
          className="flex min-h-[36px] w-full items-center gap-2 text-left active:opacity-60"
        >
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: seg.color }} />
          <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-600">{seg.label}</span>
          <span className="text-sm font-bold text-slate-900">{seg.value}</span>
        </button>
      ))}
    </div>
  );
}

function ProgressRow({ row, total }: { row: ChartSegment; total: number }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => row.to && navigate(row.to)}
      className="block w-full text-left active:opacity-70"
    >
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{row.label}</span>
        <span className="font-bold text-slate-900">{row.value}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(100, (row.value / total) * 100)}%`, backgroundColor: row.color }}
        />
      </div>
    </button>
  );
}

function ListRow({
  title,
  subtitle,
  badge,
  onClick,
}: {
  title: string;
  subtitle: string;
  badge: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[56px] w-full items-center gap-3 py-3 text-left active:bg-slate-50"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <p className="truncate text-xs text-slate-500">{subtitle}</p>
      </div>
      <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">{badge}</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-slate-300">
        <path d="M9 6l6 6-6 6" />
      </svg>
    </button>
  );
}

/* Replaces the wide prediction table on mobile: one card per row */
function PredictionCard({ prediction, item }: { prediction: AIPrediction; item?: Inventory }) {
  const navigate = useNavigate();
  const badge =
    prediction.risk_level === "HIGH"
      ? "bg-rose-100 text-rose-700"
      : prediction.risk_level === "MEDIUM"
        ? "bg-amber-100 text-amber-700"
        : "bg-emerald-100 text-emerald-700";

  return (
    <button
      type="button"
      onClick={() => navigate("/ai-forecasting")}
      className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition active:scale-[0.98]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">
            {item?.name ?? `Inventory #${prediction.inventory_id}`}
          </p>
          <p className="font-mono text-xs text-slate-500">sku: {item?.sku ?? "-"}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${badge}`}>
          {prediction.risk_level}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center">
        <div>
          <p className="text-sm font-bold text-slate-800">{Number(prediction.forecast_daily_demand || 0).toFixed(2)}</p>
          <p className="text-[11px] text-slate-500">Demand / Day</p>
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">{Number(prediction.risk_score || 0).toFixed(2)}</p>
          <p className="text-[11px] text-slate-500">Risk Score</p>
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">
            {Number(prediction.recommended_purchase_quantity || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-500">Recommended Purchase</p>
        </div>
      </div>
    </button>
  );
}

function MobileImpact({
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
  icon: ReactNode;
  iconWrap: string;
}) {
  return (
    <div className="min-w-[78%] snap-center rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconWrap}`}>{icon}</span>
      <p className={`mt-4 text-3xl font-bold ${accent}`}>
        {value.toLocaleString(undefined, { maximumFractionDigits: 1 })}
        <span className="ml-1 text-sm font-bold">{suffix}</span>
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-800">{label}</p>
      <p className="mt-0.5 text-xs text-slate-500">{description}</p>
    </div>
  );
}

/* Touch-friendly 7-day trend: tap a day to read its value */
function MobileTrend({ data }: { data: { label: string; total: number }[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const width = 320;
  const height = 150;
  const pad = 22;
  const max = Math.max(...data.map((d) => d.total), 1);
  const weekTotal = data.reduce((s, d) => s + d.total, 0);

  const pts = data.map((d, i) => ({
    ...d,
    x: pad + (i / Math.max(data.length - 1, 1)) * (width - pad * 2),
    y: height - pad - (d.total / max) * (height - pad * 2 - 8),
  }));
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const area = `${line} L${pts[pts.length - 1].x},${height - pad} L${pts[0].x},${height - pad} Z`;
  const sel = selected !== null ? pts[selected] : null;

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between rounded-xl bg-slate-50 px-3 py-2">
        <span className="text-xs text-slate-500">{sel ? sel.label : "Last 7 days"}</span>
        <span className="text-sm font-bold text-slate-900">
          {(sel ? sel.total : weekTotal).toLocaleString()} units
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full select-none">
        <defs>
          <linearGradient id="mTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#mTrendFill)" />
        <path d={line} fill="none" stroke="#10b981" strokeWidth={2.5} strokeLinejoin="round" />
        {pts.map((p, i) => (
          <g key={p.label} onClick={() => setSelected(selected === i ? null : i)}>
            <rect x={p.x - 22} y={0} width={44} height={height} fill="transparent" />
            <circle cx={p.x} cy={p.y} r={selected === i ? 6 : 4} fill="#10b981" stroke="white" strokeWidth={2} />
            <text
              x={p.x}
              y={height - 4}
              textAnchor="middle"
              fontSize={11}
              fill={selected === i ? "#0f172a" : "#64748b"}
              fontWeight={selected === i ? 700 : 400}
            >
              {p.label}
            </text>
          </g>
        ))}
      </svg>
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