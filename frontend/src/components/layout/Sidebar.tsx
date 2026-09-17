import React from "react";
import { NavLink } from "react-router-dom";

interface SidebarProps {
    mobileMenuOpen: boolean;
    setMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

interface NavItem {
    name: string;
    path: string;
    icon: (props: { className?: string }) => React.JSX.Element;
    end?: boolean;
}

interface NavSection {
    title?: string;
    items: NavItem[];
}

/* Inline SVG Components */
const LeafIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 20A7 7 0 014 13V6a1 1 0 011-1h7a7 7 0 017 7v7a1 1 0 01-1 1h-7z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 20v-9a3 3 0 013-3h6" />
    </svg>
);

const CloseIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const navigationSections: NavSection[] = [
    {
        items: [
            {
                name: "Dashboard",
                path: "/",
                end: true,
                icon: ({ className }) => (
                    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <rect x="3" y="3" width="7" height="9" rx="1" />
                        <rect x="14" y="3" width="7" height="5" rx="1" />
                        <rect x="14" y="12" width="7" height="9" rx="1" />
                        <rect x="3" y="16" width="7" height="5" rx="1" />
                    </svg>
                ),
            },
            {
                name: "Point Of Sale",
                path: "/pos",
                icon: ({ className }) => (
                    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                    </svg>
                ),
            },
        ],
    },
    {
        title: "Management",
        items: [
            {
                name: "Inventory",
                path: "/inventory",
                end: true,
                icon: ({ className }) => (
                    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                ),
            },
            {
                name: "Add Inventory",
                path: "/inventory/add",
                icon: ({ className }) => (
                    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                ),
            },
            {
                name: "CSV Upload",
                path: "/csv-upload",
                icon: ({ className }) => (
                    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                ),
            },
            {
                name: "Scanner",
                path: "/scanner",
                icon: ({ className }) => (
                    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m0 14v1m8-9h-1M5 12H4m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707" />
                    </svg>
                ),
            },
            {
                name: "Expiry Alerts",
                path: "/expiry-alerts",
                icon: ({ className }) => (
                    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                ),
            },
        ],
    },
    {
        title: "Operations",
        items: [
            {
                name: "Donations",
                path: "/donations",
                icon: ({ className }) => (
                    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                ),
            },
            {
                name: "Transactions",
                path: "/transactions",
                icon: ({ className }) => (
                    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                ),
            },
        ],
    },
];

function Sidebar({ mobileMenuOpen, setMobileMenuOpen }: SidebarProps) {
    const renderNavItems = (onItemClick?: () => void) => (
        <div className="space-y-6">
            {navigationSections.map((section, idx) => (
                <div key={idx} className="space-y-1">
                    {section.title && (
                        <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            {section.title}
                        </p>
                    )}
                    {section.items.map((link) => {
                        const IconComponent = link.icon;
                        return (
                            <NavLink
                                key={link.path}
                                to={link.path}
                                end={link.end}
                                onClick={onItemClick}
                                className={({ isActive }) =>
                                    `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${isActive
                                        ? "border-l-4 border-emerald-600 bg-emerald-50/80 font-semibold text-emerald-800 shadow-sm"
                                        : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                                    }`
                                }
                            >
                                <IconComponent className="h-4 w-4 shrink-0 text-slate-400 transition-colors group-hover:text-slate-600" />
                                <span>{link.name}</span>
                            </NavLink>
                        );
                    })}
                </div>
            ))}
        </div>
    );

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200/80 bg-slate-50/50 md:flex">
                <div className="flex h-16 items-center gap-2.5 border-b border-slate-200/80 px-6">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
                        <LeafIcon className="h-4 w-4" />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-slate-900 leading-none">
                            FwdNourish<span className="text-emerald-600">!</span>
                        </h1>
                        <p className="mt-1 text-[11px] text-slate-500 leading-none">
                            Food Waste Management
                        </p>
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto p-4">
                    {renderNavItems()}
                </nav>
            </aside>

            {/* Mobile Overlay */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity md:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Mobile Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out md:hidden ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
                            <LeafIcon className="h-4 w-4" />
                        </div>
                        <div>
                            <h1 className="text-base font-bold text-slate-900 leading-none">
                                FwdNourish<span className="text-emerald-600">!</span>
                            </h1>
                            <p className="mt-1 text-[11px] text-slate-500 leading-none">
                                Food Waste Management
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                        aria-label="Close navigation"
                    >
                        <CloseIcon className="h-5 w-5" />
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto p-4">
                    {renderNavItems(() => setMobileMenuOpen(false))}
                </nav>
            </aside>
        </>
    );
}

export default Sidebar;