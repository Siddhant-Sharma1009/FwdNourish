import React from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import NotificationBell from "../common/NotificationBell";

interface NavbarProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function Navbar({
  mobileMenuOpen,
  setMobileMenuOpen,
}: NavbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const title =
    user?.role === "ADMIN"
      ? "Platform Administration"
      : user?.role === "NGO"
        ? "NGO Workspace"
        : "Inventory Management";

  // Dynamic User Initials
  const userInitials =
    user?.full_name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-800 bg-slate-900 px-4 shadow-md md:px-8">
      {/* Left Section: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-800/60 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white md:hidden"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? (
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          )}
        </button>

        <div className="flex items-center gap-2.5">
          <h2 className="text-base font-bold tracking-tight text-white md:text-lg">
            {title}
          </h2>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <NotificationBell />

        {/* User Status Card */}
        <div
          onClick={() => navigate("/profile")}
          className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-800/40 py-1.5 pl-2 pr-3 transition-colors hover:border-green-700 hover:bg-slate-800/70"
        >
          <div className="hidden sm:block">
            <p className="text-xs font-semibold leading-none text-slate-200">
              {user?.full_name || "User"}
            </p>
          </div>

          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-200/90 bg-emerald-500/10 text-xs font-bold text-emerald-300">
            {userInitials}
          </div>
        </div>

        {/* Logout Button */}
        <button
          type="button"
          onClick={logout}
          className="group flex h-9 items-center gap-2 rounded-xl border border-slate-800 bg-slate-800/60 px-3 text-xs font-medium text-slate-300 transition-all hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
        >
          <svg
            className="h-4 w-4 text-slate-400 transition-colors group-hover:text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>

          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}