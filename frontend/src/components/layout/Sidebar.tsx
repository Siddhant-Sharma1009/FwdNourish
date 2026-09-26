import React, { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

interface SidebarProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

// ============================================================
// ICONS
// ============================================================

function LeafIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11 20A7 7 0 014 13V6a1 1 0 011-1h7a7 7 0 017 7v7a1 1 0 01-1 1h-7z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11 20v-9a3 3 0 013-3h6"
      />
    </svg>
  );
}

function ChevronDownIcon({
  className = "h-4 w-4",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 9l-7 7-7-7"
      />
    </svg>
  );
}

// ============================================================
// MENU ICONS
// ============================================================

const itemIcons: Record<string, React.ReactNode> = {
  Dashboard: (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    </svg>
  ),

  "Point Of Sale": (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
      />
    </svg>
  ),

  Inventory: (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
      />
    </svg>
  ),

  "Add Inventory": (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),

  Manual: (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  ),

  "CSV Upload": (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 16a4 4 0 01-.88-7.903A5 5 0 0115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
      />
    </svg>
  ),

  Scanner: (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
      />
    </svg>
  ),

  "Expiry Alerts": (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),

  Donations: (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
      />
    </svg>
  ),

  "AI Prediction": (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 3h6a2 2 0 012 2v1h1a3 3 0 013 3v6a3 3 0 01-3 3h-1v1a2 2 0 01-2 2H9a2 2 0 01-2-2v-1H6a3 3 0 01-3-3V9a3 3 0 013-3h1V5a2 2 0 012-2z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 9h6m-6 3h6m-6 3h3"
      />
    </svg>
  ),

  Transactions: (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
      />
    </svg>
  ),

  "Admin Dashboard": (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  ),

  "NGO Dashboard": (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    </svg>
  ),
};

// ============================================================
// MENU TYPES
// ============================================================

interface SubMenuItem {
  name: string;
  path: string;
}

interface MenuItem {
  name: string;
  path?: string;
  children?: SubMenuItem[];
}

// ============================================================
// MENU CONFIG
// ============================================================

const addInventorySubMenu: SubMenuItem[] = [
  {
    name: "Manual",
    path: "/inventory/add",
  },
  {
    name: "CSV Upload",
    path: "/csv-upload",
  },
  {
    name: "Scanner",
    path: "/scanner",
  },
];

const tenantMenuItems: MenuItem[] = [
  {
    name: "Dashboard",
    path: "/dashboard",
  },
  {
    name: "Point Of Sale",
    path: "/pos",
  },
  {
    name: "Inventory",
    path: "/inventory",
  },
  {
    name: "Add Inventory",
    children: addInventorySubMenu,
  },
  {
    name: "Expiry Alerts",
    path: "/expiry-alerts",
  },
  {
    name: "Donations",
    path: "/surplus",
  },
  {
    name: "AI Prediction",
    path: "/ai-forecasting",
  },
  {
    name: "Transactions",
    path: "/transactions",
  },
];

const roleMenuItems: Record<string, MenuItem[]> = {
  ADMIN: [
    {
      name: "Admin Dashboard",
      path: "/admin",
    },
  ],

  NGO: [
    {
      name: "NGO Dashboard",
      path: "/ngo",
    },
    {
      name: "Requirements",
      path: "/ngo/requirements",
    },
    {
      name: "Matches",
      path: "/ngo/matches",
    },
  ],
};

// ============================================================
// SIDEBAR
// ============================================================

export default function Sidebar({
  mobileMenuOpen,
  setMobileMenuOpen,
}: SidebarProps) {
  const { user, logout } = useAuth();

  const location = useLocation();
  const navigate = useNavigate();

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const isAddInventoryActive = addInventorySubMenu.some(
    (item) => location.pathname === item.path
  );

  const [addInventoryOpen, setAddInventoryOpen] =
    useState(isAddInventoryActive);

  const menuItems =
    user?.role === "TENANT"
      ? tenantMenuItems
      : roleMenuItems[user?.role || "NGO"] || [];

  // ============================================================
  // CLOSE PROFILE MENU WHEN ROUTE CHANGES
  // ============================================================

  React.useEffect(() => {
    setProfileMenuOpen(false);
  }, [location.pathname]);

  // ============================================================
  // CONTENT
  // ============================================================

  const renderContent = (closeMobile?: () => void) => (
    <div className="flex h-full flex-col justify-between">
      {/* ======================================================
          TOP CONTENT
      ====================================================== */}

      <div className="flex-1 overflow-y-auto px-4 py-5">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white shadow-lg shadow-emerald-500/20">
              <LeafIcon className="h-6 w-6" />
            </div>

            <div>
              <h1 className="text-lg font-extrabold tracking-wide text-white">
                FwdNourish<span className="text-emerald-400">.</span>
              </h1>

              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                Waste Management
              </p>
            </div>
          </div>

          {mobileMenuOpen && (
            <button
              type="button"
              onClick={closeMobile}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
              aria-label="Close navigation"
            >
              ✕
            </button>
          )}
        </div>

        {/* Navigation Category */}
        <div className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Main Menu
        </div>

        {/* Navigation */}
        <nav className="space-y-1.5">
          {menuItems.map((item) => {
            // ==================================================
            // SUBMENU
            // ==================================================

            if (item.children) {
              const active = isAddInventoryActive;

              return (
                <div key={item.name} className="space-y-1">
                  <button
                    type="button"
                    onClick={() =>
                      setAddInventoryOpen((prev) => !prev)
                    }
                    className={`group flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                      active
                        ? "bg-slate-800/80 text-emerald-400"
                        : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={
                          active
                            ? "text-emerald-400"
                            : "text-slate-400 group-hover:text-white"
                        }
                      >
                        {itemIcons[item.name]}
                      </span>

                      <span>{item.name}</span>
                    </div>

                    <ChevronDownIcon
                      className={`h-4 w-4 transition-transform duration-200 ${
                        addInventoryOpen
                          ? "rotate-180 text-emerald-400"
                          : "text-slate-500"
                      }`}
                    />
                  </button>

                  {/* Submenu */}
                  {addInventoryOpen && (
                    <div className="ml-4 space-y-1 border-l-2 border-slate-800 pl-3 pt-1">
                      {item.children.map((sub) => (
                        <NavLink
                          key={sub.path}
                          to={sub.path}
                          onClick={closeMobile}
                          className={({ isActive }) =>
                            `group flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                              isActive
                                ? "bg-emerald-500/10 font-semibold text-emerald-400"
                                : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                            }`
                          }
                        >
                          <span className="text-slate-500 group-hover:text-emerald-400">
                            {itemIcons[sub.name]}
                          </span>

                          <span>{sub.name}</span>
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            // ==================================================
            // NORMAL MENU ITEM
            // ==================================================

            return (
              <NavLink
                key={item.path}
                to={item.path!}
                end={
                  item.path === "/" ||
                  item.path === "/admin" ||
                  item.path === "/ngo"
                }
                onClick={closeMobile}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-emerald-600 to-teal-600 font-semibold text-white shadow-md shadow-emerald-900/30"
                      : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={
                        isActive
                          ? "text-white"
                          : "text-slate-400 group-hover:text-white"
                      }
                    >
                      {itemIcons[item.name]}
                    </span>

                    <span>{item.name}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* ======================================================
          USER PROFILE SECTION
      ====================================================== */}

      {user && (
        <div className="relative border-t border-slate-800/80 p-4">
          {/* ==================================================
              PROFILE DROPDOWN
          ================================================== */}

          {profileMenuOpen && (
            <div className="absolute bottom-[76px] left-4 right-4 z-50 overflow-hidden rounded-xl border border-slate-700 bg-slate-800 shadow-2xl">
              {/* Profile */}
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen(false);

                  navigate("/profile");

                  if (mobileMenuOpen) {
                    setMobileMenuOpen(false);
                  }
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-700"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.8}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.118a7.5 7.5 0 0115 0A17.933 17.933 0 0112 22.5a17.933 17.933 0 01-7.5-2.382z"
                    />
                  </svg>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-200">
                    Profile
                  </p>

                  <p className="text-xs text-slate-400">
                    View & edit profile
                  </p>
                </div>
              </button>

              {/* Divider */}
              <div className="border-t border-slate-700" />

              {/* Logout */}
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen(false);

                  logout();

                  if (mobileMenuOpen) {
                    setMobileMenuOpen(false);
                  }

                  navigate("/login", {
                    replace: true,
                  });
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-red-500/10"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-400">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.8}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15"
                    />

                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M18 12H9m9 0l-3-3m3 3l-3 3"
                    />
                  </svg>
                </div>

                <div>
                  <p className="text-sm font-medium text-red-400">
                    Logout
                  </p>

                  <p className="text-xs text-red-400/60">
                    Sign out of your account
                  </p>
                </div>
              </button>
            </div>
          )}

          {/* ==================================================
              PROFILE BADGE
          ================================================== */}

          <button
            type="button"
            onClick={() =>
              setProfileMenuOpen((prev) => !prev)
            }
            className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left backdrop-blur-sm transition-all ${
              profileMenuOpen
                ? "border-emerald-500/40 bg-slate-800"
                : "border-slate-800 bg-slate-800/40 hover:border-slate-700 hover:bg-slate-800/70"
            }`}
          >
            {/* Avatar */}
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/20 text-sm font-bold text-emerald-400">
              {user.full_name
                ? user.full_name.charAt(0).toUpperCase()
                : "U"}
            </div>

            {/* User Information */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-200">
                {user.full_name || "Active User"}
              </p>

              <p className="truncate text-[10px] font-medium uppercase tracking-wide text-slate-400">
                {user.role === "ADMIN"
                  ? "Platform Administration"
                  : user.role === "NGO"
                    ? "NGO Owner"
                    : "Business Owner"}
              </p>
            </div>

            {/* Chevron */}
            <svg
              className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${
                profileMenuOpen
                  ? "rotate-180 text-emerald-400"
                  : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );

  // ============================================================
  // DESKTOP + MOBILE
  // ============================================================

  return (
    <>
      {/* ======================================================
          DESKTOP SIDEBAR
      ====================================================== */}

      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-900 shadow-xl md:flex">
        {renderContent()}
      </aside>

      {/* ======================================================
          MOBILE BACKDROP
      ====================================================== */}

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm transition-opacity md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ======================================================
          MOBILE SIDEBAR
      ====================================================== */}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-slate-900 shadow-2xl transition-transform duration-300 ease-in-out md:hidden ${
          mobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        {renderContent(() => setMobileMenuOpen(false))}
      </aside>
    </>
  );
}