import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import NotificationBell from "../common/NotificationBell";

interface NavbarProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const PATHS = {
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "M6 18L18 6M6 6l12 12",
  logout:
    "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
};

function Icon({
  d,
  className = "h-5 w-5",
  strokeWidth = 1.8,
}: {
  d: string;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

const focusRing =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/60";

// ---- Moved to top level (outside the component) ----
const SECTION_LABELS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/pos": "Point of Sale",
  "/inventory": "Inventory",
  "/inventory/add": "Add Inventory",
  "/csv-upload": "CSV Upload",
  "/scanner": "Scanner",
  "/expiry-alerts": "Expiry Alerts",
  "/donations": "Donations",
  "/ai-forecasting": "AI Prediction",
  "/transactions": "Transactions",
  "/profile": "Profile",
};

function getSectionLabel(pathname: string): string | null {
  if (SECTION_LABELS[pathname]) return SECTION_LABELS[pathname];
  // nested routes: pick the longest matching prefix
  const match = Object.keys(SECTION_LABELS)
    .filter((p) => pathname.startsWith(p + "/"))
    .sort((a, b) => b.length - a.length)[0];
  return match ? SECTION_LABELS[match] : null;
}
// ----------------------------------------------------

export default function Navbar({
  mobileMenuOpen,
  setMobileMenuOpen,
}: NavbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const title =
    user?.role === "ADMIN"
      ? "Platform administration"
      : user?.role === "NGO"
        ? "NGO workspace"
        : "Business workspace";

  // Changes per page, like a breadcrumb
  const subtitle = getSectionLabel(pathname) ?? "FwdNourish";

  const userInitials =
    (user?.full_name ?? "")
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  const handleLogout = () => {
    logout();
    // Matches the sidebar's behaviour, so logging out always lands on /login
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 flex h-[60px] md:h-[68px] w-full shrink-0 items-center justify-between gap-3 border-b border-white/[0.08] bg-[#0a1813]/95 px-3 shadow-[0_1px_0_rgba(255,255,255,0.02)] backdrop-blur-xl md:px-7">
      {/* Left: mobile toggle + page title */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
          aria-expanded={mobileMenuOpen}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-emerald-50/80 transition-colors hover:bg-white/[0.08] hover:text-white md:hidden ${focusRing}`}
        >
          <Icon d={mobileMenuOpen ? PATHS.close : PATHS.menu} strokeWidth={2} />
        </button>

        <div className="min-w-0 leading-tight">
          <h2 className="truncate text-base font-bold tracking-tight text-white md:text-lg">
            {title}
          </h2>
          <p className="hidden truncate text-xs text-emerald-100/45 md:block">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Right: bell, profile, logout */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <NotificationBell />

        <button
          type="button"
          onClick={() => navigate("/profile")}
          aria-label="Open profile"
          className={`group flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] py-1.5 pl-3 pr-1.5 transition-colors hover:border-lime-300/30 hover:bg-white/[0.07] max-sm:pl-1.5 ${focusRing}`}
        >
          <span className="hidden text-left leading-tight sm:block">
            <span className="block max-w-[140px] truncate text-[13px] font-semibold text-emerald-50">
              {user?.full_name || "User"}
            </span>
            <span className="block text-[11px] text-emerald-100/45">
              {user?.role === "ADMIN"
                ? "Platform admin"
                : user?.role === "NGO"
                  ? "NGO partner"
                  : "Business owner"}
            </span>
          </span>

          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-lime-300 to-emerald-500 text-xs font-bold text-emerald-950 shadow-md shadow-emerald-500/20">
            {userInitials}
          </span>
        </button>

        <button
          type="button"
          onClick={handleLogout}
          aria-label="Log out"
          className={`group hidden h-11 items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3.5 text-[13px] font-medium text-emerald-50/80 transition-colors hover:border-rose-400/30 hover:bg-rose-500/10 hover:text-rose-300 ${focusRing}`}
        >
          <Icon
            d={PATHS.logout}
            className="h-4 w-4 text-emerald-200/50 transition-colors group-hover:text-rose-300"
          />
          <span className="hidden sm:inline">Log out</span>
        </button>
      </div>
    </header>
  );
}