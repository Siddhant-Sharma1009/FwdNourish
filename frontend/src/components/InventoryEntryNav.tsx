import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type Tab = {
  path: string;
  glyph: string; // desktop icon (unchanged)
  icon: ReactNode; // mobile icon
  fullLabel: string; // desktop label (unchanged)
  shortLabel: string; // mobile label
};

const iconProps = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const TABS: Tab[] = [
  {
    path: "/inventory/add",
    glyph: "✎",
    fullLabel: "Manual Entry",
    shortLabel: "Manual",
    icon: (
      <svg {...iconProps}>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
  },
  {
    path: "/csv-upload",
    glyph: "↑",
    fullLabel: "CSV Upload",
    shortLabel: "CSV",
    icon: (
      <svg {...iconProps}>
        <path d="M12 16V4" />
        <path d="M7 9l5-5 5 5" />
        <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
      </svg>
    ),
  },
  {
    path: "/scanner",
    glyph: "▣",
    fullLabel: "Barcode / QR Scanner",
    shortLabel: "Scan",
    icon: (
      <svg {...iconProps}>
        <path d="M4 8V5a1 1 0 0 1 1-1h3" />
        <path d="M16 4h3a1 1 0 0 1 1 1v3" />
        <path d="M20 16v3a1 1 0 0 1-1 1h-3" />
        <path d="M8 20H5a1 1 0 0 1-1-1v-3" />
        <path d="M8 12h8" />
      </svg>
    ),
  },
];

function InventoryEntryNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav
      aria-label="Inventory entry method"
      className="
        mb-4 rounded-2xl bg-slate-200/70 p-1
        sm:mb-6 sm:border sm:border-slate-200 sm:bg-white sm:p-2 sm:shadow-sm
      "
    >
      <div className="grid grid-cols-3 gap-1 sm:gap-2">
        {TABS.map((tab) => {
          const isActive = location.pathname === tab.path;

          return (
            <button
              key={tab.path}
              type="button"
              onClick={() => navigate(tab.path)}
              aria-current={isActive ? "page" : undefined}
              className={`
                flex select-none touch-manipulation flex-col items-center justify-center gap-1
                rounded-xl px-1 py-2.5 text-[11px] font-semibold leading-tight
                transition-all duration-150 active:scale-[0.97]
                focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1
                sm:flex-row sm:gap-2 sm:px-4 sm:py-3 sm:text-sm sm:active:scale-100
                ${
                  isActive
                    ? "bg-white text-emerald-700 shadow-[0_1px_3px_rgba(15,23,42,0.12)] sm:bg-emerald-600 sm:text-white sm:shadow-sm"
                    : "text-slate-500 active:bg-white/60 sm:text-slate-600 sm:active:bg-transparent sm:hover:bg-slate-100 sm:hover:text-slate-900"
                }
              `}
            >
              {/* Mobile: line icon. Desktop: original glyph */}
              <span className="sm:hidden">{tab.icon}</span>
              <span className="hidden text-base sm:inline">{tab.glyph}</span>

              {/* Mobile: short label. Desktop: original label */}
              <span className="sm:hidden">{tab.shortLabel}</span>
              <span className="hidden sm:inline">{tab.fullLabel}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default InventoryEntryNav;