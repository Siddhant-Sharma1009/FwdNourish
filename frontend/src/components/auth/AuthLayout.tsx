import type { ReactNode } from "react";
import AuthIllustration from "./AuthIllustration";
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
    <div className="h-screen overflow-hidden bg-slate-100">
      <div className="flex h-full w-full">
        {/* =====================================================
            LEFT PANEL
            Fixed / No Scroll
        ====================================================== */}
        <aside className="relative hidden h-screen w-[45%] shrink-0 overflow-hidden bg-slate-950 lg:block xl:w-[46%]">
          {/* Background glow */}
          <div className="absolute -left-32 -top-32 h-[460px] w-[460px] rounded-full bg-emerald-500/10 blur-3xl" />

          <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-3xl" />

          <div className="relative flex h-full flex-col px-10 py-8 xl:px-14 xl:py-10">
            {/* =================================================
                BRAND
            ================================================== */}
            <div className="shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-xl font-black text-white shadow-lg shadow-emerald-500/20">
                  F
                </div>

                <div>
                  <h1 className="text-xl font-bold tracking-tight text-white">
                    FwdNourish
                  </h1>

                  <p className="mt-0.5 text-xs text-slate-400">
                    AI-powered food redistribution
                  </p>
                </div>
              </div>
            </div>

            {/* =================================================
                MAIN CONTENT
            ================================================== */}
            <div className="flex min-h-0 flex-1 flex-col justify-center">
              {/* Badge */}
              <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />

                Reducing food waste through technology
              </div>

              {/* Main heading */}
              <h2 className="max-w-2xl text-4xl font-bold leading-[1.12] tracking-tight text-white xl:text-5xl">
                Turn surplus food into{" "}
                <span className="text-emerald-400">
                  community impact.
                </span>
              </h2>

              {/* Description */}
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-400">
                FwdNourish helps food businesses monitor inventory, predict
                waste risk, identify surplus food and connect with NGOs and
                community organizations for redistribution.
              </p>

              {/* Illustration */}
              <AuthIllustration />

              {/* Feature cards */}
              <div className="mt-6 grid grid-cols-3 gap-3">
                <Feature
                  title="Track"
                  text="Inventory & expiry"
                />

                <Feature
                  title="Predict"
                  text="AI waste risk"
                />

                <Feature
                  title="Redistribute"
                  text="Connect with NGOs"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 text-xs text-slate-600">
              Smart inventory • AI forecasting • Food redistribution
            </div>
          </div>
        </aside>

        {/* =====================================================
            RIGHT PANEL
            Independently Scrollable
        ====================================================== */}
        <main className="h-screen min-w-0 flex-1 overflow-y-auto bg-slate-50">
          {/* Mobile brand */}
          <div className="bg-slate-950 px-5 py-5 lg:hidden">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-lg font-black text-white">
                F
              </div>

              <div>
                <h1 className="font-bold text-white">
                  FwdNourish
                </h1>

                <p className="text-xs text-slate-400">
                  AI-powered food redistribution
                </p>
              </div>
            </div>
          </div>

          <div className="mx-auto flex min-h-full w-full max-w-[680px] flex-col px-5 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-10">
            
            <div className="mb-7">
              {mode === "signup" }

              {mode === "pending" && (
                <div className="mb-3 inline-flex rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                  Account review
                </div>
              )}

              <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                {title}
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                {subtitle}
              </p>
            </div>

            {/* =================================================
                CONTENT
            ================================================== */}
            <div className="flex-1">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

/* =========================================================
   FEATURE CARD
========================================================= */

function Feature({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <p className="text-sm font-bold text-white">
        {title}
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {text}
      </p>
    </div>
  );
}