import React, { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import logo from "../../assets/icon-512.png";

interface SidebarProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

// ============================================================
// ICONS (single helper, no repeated <svg> boilerplate)
// ============================================================

function Icon({
  paths,
  className = "h-5 w-5",
  strokeWidth = 1.7,
}: {
  paths: string | string[];
  className?: string;
  strokeWidth?: number;
}) {
  const list = Array.isArray(paths) ? paths : [paths];
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      aria-hidden="true"
    >
      {list.map((d) => (
        <path key={d} strokeLinecap="round" strokeLinejoin="round" d={d} />
      ))}
    </svg>
  );
}

const ICON_PATHS: Record<string, string | string[]> = {
  Dashboard:
    "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  "Point Of Sale":
    "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z",
  Inventory: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  "Add Inventory": "M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z",
  Manual:
    "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  "CSV Upload":
    "M7 16a4 4 0 01-.88-7.903A5 5 0 0115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12",
  Scanner:
    "M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z",
  "Expiry Alerts": "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  Donations:
    "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
  "AI Prediction": [
    "M9 3h6a2 2 0 012 2v1h1a3 3 0 013 3v6a3 3 0 01-3 3h-1v1a2 2 0 01-2 2H9a2 2 0 01-2-2v-1H6a3 3 0 01-3-3V9a3 3 0 013-3h1V5a2 2 0 012-2z",
    "M9 9h6m-6 3h6m-6 3h3",
  ],
  Transactions:
    "M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z",
  "Admin Dashboard":
    "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  "NGO Dashboard":
    "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  // These two were missing in the original, so they rendered with no icon
  Requirements: [
    "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    "M9 12h6m-6 4h6",
  ],
  Matches:
    "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1",
  Profile:
    "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.118a7.5 7.5 0 0115 0A17.933 17.933 0 0112 22.5a17.933 17.933 0 01-7.5-2.382z",
  Logout: [
    "M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15",
    "M18 12H9m9 0l-3-3m3 3l-3 3",
  ],
  Chevron: "M19 9l-7 7-7-7",
  Close: "M6 18L18 6M6 6l12 12",
  Leaf: [
    "M11 20A7 7 0 014 13V6a1 1 0 011-1h7a7 7 0 017 7v7a1 1 0 01-1 1h-7z",
    "M11 20v-9a3 3 0 013-3h6",
  ],
};

function NavIcon({
  name,
  className = "h-5 w-5",
}: {
  name: string;
  className?: string;
}) {
  const paths = ICON_PATHS[name];
  return paths ? <Icon paths={paths} className={className} /> : null;
}

// ============================================================
// MENU CONFIG
// ============================================================

interface SubMenuItem {
  name: string;
  path: string;
}

interface MenuItem {
  name: string;
  path?: string;
  /** Use `end` when a route has deeper siblings (e.g. /inventory vs /inventory/add) */
  end?: boolean;
  children?: SubMenuItem[];
}

const addInventorySubMenu: SubMenuItem[] = [
  { name: "Manual", path: "/inventory/add" },
  { name: "CSV Upload", path: "/csv-upload" },
  { name: "Scanner", path: "/scanner" },
];

const tenantMenuItems: MenuItem[] = [
  { name: "Dashboard", path: "/dashboard" },
  { name: "Point Of Sale", path: "/pos" },
  // FIX: without `end`, "Inventory" stayed highlighted on /inventory/add too
  { name: "Inventory", path: "/inventory", end: true },
  { name: "Add Inventory", children: addInventorySubMenu },
  { name: "Expiry Alerts", path: "/expiry-alerts" },
  { name: "Donations", path: "/surplus" },
  { name: "AI Prediction", path: "/ai-forecasting" },
  { name: "Transactions", path: "/transactions" },
];

const roleMenuItems: Record<string, MenuItem[]> = {
  ADMIN: [{ name: "Admin Dashboard", path: "/admin", end: true }],
  NGO: [
    { name: "Dashboard", path: "/ngo", end: true },
    { name: "Requirements", path: "/ngo/requirements" },
    { name: "Matches", path: "/ngo/matches" },
  ],
};

const roleLabel = (role?: string) =>
  role === "ADMIN"
    ? "Platform admin"
    : role === "NGO"
      ? "NGO partner"
      : "Business owner";

// ============================================================
// NAV GROUP (collapsible, owns its own state)
// ============================================================

function NavGroup({
  item,
  onNavigate,
}: {
  item: MenuItem;
  onNavigate?: () => void;
}) {
  const { pathname } = useLocation();
  const children = item.children ?? [];
  const active = children.some((c) => pathname === c.path);
  const [open, setOpen] = useState(active);

  // FIX: open the group when the user lands on a child route from elsewhere
  useEffect(() => {
    if (active) setOpen(true);
  }, [active]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        aria-expanded={open}
        className={`group relative flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/60 ${active
          ? "bg-white/[0.06] text-lime-200"
          : "text-emerald-50/70 hover:bg-white/[0.04] hover:text-white"
          }`}
      >
        <span className="flex items-center gap-3">
          <span
            className={
              active
                ? "text-lime-300"
                : "text-emerald-200/50 group-hover:text-lime-200"
            }
          >
            <NavIcon name={item.name} />
          </span>
          {item.name}
        </span>
        <Icon
          paths={ICON_PATHS.Chevron}
          strokeWidth={2}
          className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180 text-lime-300" : "text-emerald-200/40"
            }`}
        />
      </button>

      {/* grid-rows trick gives a smooth height animation without measuring */}
      <div
        className={`grid transition-all duration-300 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
      >
        <div className="overflow-hidden">
          <div className="ml-[22px] mt-1 space-y-0.5 border-l border-emerald-200/10 pl-3">
            {children.map((sub) => (
              <NavLink
                key={sub.path}
                to={sub.path}
                onClick={onNavigate}
                tabIndex={open ? 0 : -1}
                className={({ isActive }) =>
                  `group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/60 ${isActive
                    ? "bg-lime-300/10 text-lime-200"
                    : "text-emerald-50/55 hover:bg-white/[0.04] hover:text-emerald-50"
                  }`
                }
              >
                <NavIcon name={sub.name} className="h-4 w-4" />
                {sub.name}
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PROFILE MENU (closes on outside click, Escape and route change)
// ============================================================

function ProfileMenu({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;

  const initial = (user.full_name?.trim().charAt(0) || "U").toUpperCase();

  const go = (path: string) => {
    setOpen(false);
    onNavigate?.();
    navigate(path);
  };

  const handleLogout = () => {
    setOpen(false);
    onNavigate?.();
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div ref={ref} className="relative border-t border-white/[0.06] p-3">
      {open && (
        <div
          role="menu"
          className="absolute bottom-full left-3 right-3 z-50 mb-2 overflow-hidden rounded-2xl border border-white/10 bg-[#13261f] p-1.5 shadow-2xl shadow-black/50"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => go("/profile")}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06] focus:outline-none focus-visible:bg-white/[0.08]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-300/10 text-lime-300">
              <NavIcon name="Profile" className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-sm font-medium text-emerald-50">
                Profile
              </span>
              <span className="block text-xs text-emerald-100/50">
                View and edit your details
              </span>
            </span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-rose-500/10 focus:outline-none focus-visible:bg-rose-500/15"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-300">
              <NavIcon name="Logout" className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-sm font-medium text-rose-300">
                Log out
              </span>
              <span className="block text-xs text-rose-300/55">
                End this session
              </span>
            </span>
          </button>
        </div>
      )}

      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((p) => !p)}
        className={`flex w-full items-center gap-3 rounded-2xl border p-2.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/60 ${open
          ? "border-lime-300/30 bg-white/[0.07]"
          : "border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06]"
          }`}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-lime-300 to-emerald-500 text-sm font-bold text-emerald-950">
          {initial}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-emerald-50">
            {user.full_name || "Active user"}
          </span>
          <span className="block truncate text-[11px] text-emerald-100/50">
            {roleLabel(user.role)}
          </span>
        </span>
        <Icon
          paths={ICON_PATHS.Chevron}
          strokeWidth={2}
          className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180 text-lime-300" : "text-emerald-200/40"
            }`}
        />
      </button>
    </div>
  );
}

// ============================================================
// SIDEBAR CONTENT
// ============================================================

function SidebarContent({
  menuItems,
  onClose,
}: {
  menuItems: MenuItem[];
  /** Only passed for the mobile drawer. Its presence also shows the close button */
  onClose?: () => void;
}) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      {/* soft ambient glows */}
      <div className="pointer-events-none absolute -left-16 -top-24 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-20 h-64 w-64 rounded-full bg-lime-300/10 blur-3xl" />

      {/* Brand */}
      <div className="relative flex items-center justify-between px-5 pb-4 pt-6">
        <div className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-[#16302a] via-[#0f211c] to-[#08120f] p-1.5 shadow-lg shadow-black/40 ring-1 ring-inset ring-lime-300/10">
            <img src={logo} alt="FwdNourish logo" className="h-full w-full object-contain" />
          </div>
          <div className="leading-tight">
            <h1 className="text-[17px] font-extrabold tracking-tight text-white">
              FwdNourish!<span className="text-lime-300">.</span>
            </h1>
            <p className="text-xs text-emerald-100/50">Food waste platform</p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-emerald-100/70 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/60"
          >
            <Icon paths={ICON_PATHS.Close} className="h-4 w-4" strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav
        aria-label="Main"
        className="relative flex-1 space-y-1 overflow-y-auto px-3 pb-4 pt-2 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.12)_transparent]"
      >
        <p className="px-3 pb-2 text-xs font-medium text-emerald-100/35">
          Menu
        </p>

        {menuItems.map((item) =>
          item.children ? (
            <NavGroup key={item.name} item={item} onNavigate={onClose} />
          ) : (
            <NavLink
              key={item.path}
              to={item.path!}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/60 ${isActive
                  ? "bg-gradient-to-r from-emerald-400/20 via-emerald-400/10 to-transparent text-white"
                  : "text-emerald-50/70 hover:bg-white/[0.04] hover:text-white"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {/* the one memorable detail: a glowing lime tab on the active row */}
                  <span
                    className={`absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-lime-300 shadow-[0_0_14px_2px_rgba(190,242,100,0.6)] transition-opacity ${isActive ? "opacity-100" : "opacity-0"
                      }`}
                  />
                  <span
                    className={
                      isActive
                        ? "text-lime-300"
                        : "text-emerald-200/50 group-hover:text-lime-200"
                    }
                  >
                    <NavIcon name={item.name} />
                  </span>
                  {item.name}
                </>
              )}
            </NavLink>
          )
        )}
      </nav>

      <ProfileMenu onNavigate={onClose} />
    </div>
  );
}

// ============================================================
// SIDEBAR
// ============================================================

export default function Sidebar({
  mobileMenuOpen,
  setMobileMenuOpen,
}: SidebarProps) {
  const { user } = useAuth();

  // FIX: previously an unknown or missing user silently got the NGO menu
  const menuItems: MenuItem[] = !user
    ? []
    : user.role === "TENANT"
      ? tenantMenuItems
      : roleMenuItems[user.role] ?? [];

  const closeMobile = () => setMobileMenuOpen(false);

  // FIX: Escape closes the drawer, and the page behind it stops scrolling
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeMobile();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobileMenuOpen]);

  return (
    <>
      {/* Desktop. FIX: no close button here (it used to appear when the mobile drawer was open) */}
      <aside className="hidden w-64 shrink-0 border-r border-white/[0.06] bg-[#0b1713] md:block">
        <SidebarContent menuItems={menuItems} />
      </aside>

      {/* Mobile backdrop */}
      <div
        onClick={closeMobile}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden ${mobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
      />

      {/* Mobile drawer */}
      <aside
        aria-hidden={!mobileMenuOpen}
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-[#0b1713] shadow-2xl shadow-black/60 transition-transform duration-300 ease-out md:hidden ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <SidebarContent menuItems={menuItems} onClose={closeMobile} />
      </aside>
    </>
  );
}