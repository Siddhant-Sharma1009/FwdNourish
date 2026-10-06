import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function Icon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

const icons: Record<string, string> = {
  Home: "M3 10.5 12 3l9 7.5M5 9v11h14V9M9 20v-6h6v6",
  Inventory: "M20 7l-8-4-8 4m16 0-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  Donate: "M4.318 6.318a4.5 4.5 0 0 1 6.364 0L12 7.636l1.318-1.318a4.5 4.5 0 1 1 6.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 0 1 0-6.364Z",
  Transactions: "M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm2 4h6M9 11h6M9 15h4",
  Requirements: "M5 4h14v16H5zM8 8h8M8 12h8M8 16h5",
  Matches: "M8 12a4 4 0 1 1 0-8h3v4M16 12a4 4 0 1 1 0 8h-3v-4M9 12h6",
  Profile: "M20 21a8 8 0 0 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
};

export default function MobileBottomNav() {
  const { user } = useAuth();

  const items: Array<{ label: string; path: string; exact?: boolean }> =
    user?.role === "NGO"
      ? [
          { label: "Home", path: "/ngo", exact: true },
          { label: "Requirements", path: "/ngo/requirements" },
          { label: "Matches", path: "/ngo/matches" },
          { label: "Profile", path: "/profile" },
        ]
      : user?.role === "ADMIN"
        ? [
            { label: "Home", path: "/admin", exact: true },
            { label: "Profile", path: "/profile" },
          ]
        : [
            { label: "Home", path: "/dashboard", exact: true },
            { label: "Inventory", path: "/inventory" },
            { label: "Donate", path: "/surplus" },
            { label: "Transactions", path: "/transactions" },
            { label: "Profile", path: "/profile" },
          ];

  return (
    <nav className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 px-2 pt-2 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl md:hidden" aria-label="Mobile navigation">
      <div className="mx-auto flex max-w-lg items-end justify-around gap-1 pb-[env(safe-area-inset-bottom)]">
        {items.map(({ label, path, exact }) => (
          <NavLink
            key={path}
            to={path}
            end={Boolean(exact)}
            className={({ isActive }) =>
              `flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-semibold transition-all ${isActive ? "bg-emerald-50 text-emerald-700" : "text-slate-400 hover:text-slate-600"}`
            }
          >
            <Icon path={icons[label] ?? icons.Profile} />
            <span className="max-w-full truncate">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
