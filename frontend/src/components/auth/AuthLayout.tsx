import type { ReactNode } from "react";

import AuthIllustration from "./AuthIllustration";
import logo from "../../assets/fwdNourish-logo.png";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
  mode?: "login" | "signup" | "pending";
}

export default function AuthLayout({
  children,
  title,
  subtitle,
  mode = "login",
}: AuthLayoutProps) {
  return (
    <div className="h-[100dvh] overflow-hidden bg-slate-100 lg:h-screen">
      <div className="flex h-full w-full">
        {/* =====================================================
            LEFT PANEL
        ====================================================== */}

        <aside className="relative hidden h-screen w-[48%] min-w-0 shrink-0 overflow-hidden bg-[#01302c] lg:block xl:w-[52%]">
          {/* Background */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(16,185,129,0.22),transparent_55%),radial-gradient(ellipse_at_90%_100%,rgba(132,204,22,0.16),transparent_50%),linear-gradient(160deg,#013a34_0%,#012621_100%)]" />
          <div className="pointer-events-none absolute -right-24 top-1/4 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-lime-400/10 blur-3xl" />

          <div className="relative flex h-full min-w-0 flex-col px-8 py-7 xl:px-14 xl:py-9">
            {/* ---------- Header ---------- */}
            <header className="flex shrink-0 items-start justify-between gap-6">
              <div>
                <img
                  src={logo}
                  alt="FwdNourish"
                  className="block h-auto w-[230px] max-w-full object-contain object-left mix-blend-screen xl:w-[270px]"
                />
                <p className="-mt-1 pl-1 text-[11px] font-medium text-emerald-100/60">
                  AI-powered food redistribution software solution.
                </p>
              </div>

              <p className="hidden pt-3 text-xs font-medium text-emerald-50/60 2xl:block">
                Food <span className="mx-2 text-emerald-400">•</span>
                People <span className="mx-2 text-emerald-400">•</span>
                A Better Tomorrow
              </p>
            </header>

            {/* ---------- Main ---------- */}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center py-4">
              <h2 className="max-w-[640px] text-[40px] font-extrabold leading-[1.05] tracking-[-0.03em] text-white xl:text-[54px]">
                Turn surplus food into{" "}
                <span className="auth-gradient-text">community impact</span>
                <span className="text-yellow-400">.</span>
              </h2>

              <p className="mt-4 max-w-[560px] text-[14px] leading-6 text-emerald-50/70 xl:text-[16px] xl:leading-7">
                FwdNourish helps food businesses monitor inventory, predict
                waste risk, identify surplus food and connect with NGOs and
                community organizations for redistribution.
              </p>

              <AuthIllustration />
            </div>

            {/* ---------- Feature bar ---------- */}
            <div className="shrink-0">
              <div className="grid grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 bg-black/20 py-3.5 backdrop-blur-md">
                <Feature title="Track" text="Inventory & expiry" icon={<TrackIcon />} />
                <Feature title="Predict" text="AI waste risk" icon={<PredictIcon />} />
                <Feature title="Redistribute" text="Connect with NGOs" icon={<PeopleIcon />} />
              </div>
            </div>
          </div>
        </aside>

        {/* =====================================================
            RIGHT PANEL
        ====================================================== */}

        <main className="h-[100dvh] min-w-0 flex-1 overflow-y-auto bg-[#f7faf9] lg:h-screen">
          {/* Mobile brand header (hidden on desktop, where the left panel shows the logo) */}
          <div className="relative overflow-hidden bg-[#013a34] px-5 pb-4 pt-[calc(1rem+env(safe-area-inset-top,0px))] lg:hidden">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(16,185,129,0.28),transparent_60%),radial-gradient(ellipse_at_90%_100%,rgba(132,204,22,0.18),transparent_55%),linear-gradient(160deg,#013a34_0%,#012621_100%)]" />
            <div className="pointer-events-none absolute -right-16 -top-10 h-40 w-40 rounded-full bg-emerald-400/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-12 -left-16 h-36 w-36 rounded-full bg-lime-400/10 blur-3xl" />

            <div className="relative flex flex-col items-start">
              <img
                src={logo}
                alt="FwdNourish"
                className="block h-auto w-[210px] max-w-[72%] object-contain object-left mix-blend-screen sm:w-[240px]"
              />
              <p className="-mt-1 pl-9 text-xs font-medium text-emerald-100/65">
                AI-powered food redistribution software.
              </p>
            </div>
          </div>

          <div className="mx-auto flex min-h-full w-full max-w-[680px] flex-col px-5 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] sm:px-8 sm:py-9 lg:px-10 lg:py-10">
            <div className="mb-6 lg:mb-7">
              {mode === "pending" && (
                <div className="mb-3 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                  Account review
                </div>
              )}

              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                {title}
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                {subtitle}
              </p>
            </div>

            <div className="flex-1">{children}</div>
          </div>
        </main>
      </div>

      <style>{`
        .auth-gradient-text {
          background: linear-gradient(90deg, #34d399 0%, #10b981 60%, #6ee7b7 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
      `}</style>
    </div>
  );
}

/* =========================================================
   FEATURE (bottom bar item)
========================================================= */

function Feature({
  title,
  text,
  icon,
}: {
  title: string;
  text: string;
  icon: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center justify-center gap-3 px-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center text-emerald-400">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-white">{title}</p>
        <p className="truncate text-xs text-emerald-100/60">{text}</p>
      </div>
    </div>
  );
}

/* =========================================================
   ICONS
========================================================= */

function TrackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor">
      <rect x="3" y="12" width="4.5" height="9" rx="1.2" />
      <rect x="9.75" y="4" width="4.5" height="17" rx="1.2" />
      <rect x="16.5" y="9" width="4.5" height="12" rx="1.2" />
    </svg>
  );
}

function PredictIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor">
      <path d="m10 3 2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6Z" />
      <path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor">
      <circle cx="9" cy="8" r="3.4" />
      <circle cx="17.5" cy="9.5" r="2.6" />
      <path d="M2.5 20.5c.5-4.2 3-6.5 6.5-6.5s6 2.3 6.5 6.5h-13Z" />
      <path d="M16 14.2c3.2-.3 5.2 1.6 5.6 5.3H17c-.1-2-.5-3.7-1-5.3Z" />
    </svg>
  );
}