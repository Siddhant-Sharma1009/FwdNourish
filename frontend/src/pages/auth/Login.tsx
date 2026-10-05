import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import AuthLayout from "../../components/auth/AuthLayout";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const user = await login(email, password);

      if (user.role === "ADMIN") {
        navigate("/admin", { replace: true });
      } else if (user.role === "NGO") {
        navigate("/ngo", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail || "";

      if (String(detail).startsWith("ACCOUNT_PENDING")) {
        navigate("/pending", {
          state: {
            message:
              "Your account is still waiting for administrator verification.",
          },
        });

        return;
      }

      setError(
        String(detail).replace(
          /^ACCOUNT_(REJECTED|SUSPENDED):\s*/i,
          ""
        ) ||
          "Unable to sign in. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back !!"
      subtitle="Sign in to turn surplus food into community impact."
      mode="login"
    >
      <div className="mx-auto w-full max-w-[540px]">

        <form
          onSubmit={submit}
          className="auth-login-card relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8"
        >

          {/* Decorative glow */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-emerald-100/70 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-20 h-40 w-40 rounded-full bg-lime-100/40 blur-3xl" />

          <div className="relative">

            {/* Security header */}
            <div className="mb-6 flex items-center justify-between md:mb-7">

              <div className="flex items-center gap-2.5">

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 md:h-10 md:w-10 md:rounded-xl">
                  <ShieldIcon />
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-800 md:text-xs">
                    Secure sign in
                  </p>

                  <p className="mt-0.5 text-xs text-slate-400 md:text-[11px]">
                    Access your FwdNourish workspace
                  </p>
                </div>

              </div>

              <span className="hidden rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-700 sm:inline-flex">
                Secure
              </span>

            </div>

            {/* Error */}
            {error && (
              <div
                role="alert"
                className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700 md:rounded-xl"
              >
                {error}
              </div>
            )}

            {/* Email */}
            <div>

              <label
                htmlFor="login-email"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Email address
                <span className="ml-1 text-red-500">*</span>
              </label>

              <div className="relative">

                <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <MailIcon />
                </div>

                <input
                  id="login-email"
                  type="email"
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-base text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 md:h-12 md:rounded-xl md:text-sm"
                />

              </div>

            </div>

            {/* Password */}
            <div className="mt-5">

              <label
                htmlFor="login-password"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Password
                <span className="ml-1 text-red-500">*</span>
              </label>

              <div className="relative">

                <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <LockIcon />
                </div>

                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-14 text-base text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 md:h-12 md:rounded-xl md:pr-12 md:text-sm"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((current) => !current)
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 active:bg-slate-100 md:right-3 md:h-8 md:w-8 md:rounded-lg"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>

              </div>

            </div>

            {/* Remember + forgot */}
            <div className="mt-2 flex items-center justify-between md:mt-4">

              <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 md:min-h-0 md:gap-2">

                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) =>
                    setRememberMe(event.target.checked)
                  }
                  className="h-5 w-5 cursor-pointer rounded border-slate-300 accent-emerald-600 focus:ring-emerald-500 md:h-4 md:w-4"
                />

                <span className="text-sm font-medium text-slate-600 md:text-xs">
                  Remember me
                </span>

              </label>

              <Link
                to="/forgot-password"
                className="inline-flex min-h-[44px] items-center text-sm font-bold text-emerald-600 transition-colors hover:text-emerald-700 md:min-h-0 md:text-xs"
              >
                Forgot password?
              </Link>

            </div>

            {/* Sign in */}
            <button
              type="submit"
              disabled={loading}
              className="group relative mt-4 flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-500 px-5 text-base font-bold text-white shadow-[0_10px_25px_rgba(16,185,129,0.20)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(16,185,129,0.28)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 md:mt-6 md:h-12 md:rounded-xl md:text-sm md:active:scale-100"
            >

              <span className="pointer-events-none absolute inset-y-0 -left-20 w-16 skew-x-[-20deg] bg-white/20 transition-all duration-700 group-hover:left-[110%]" />

              <span className="relative">
                {loading ? "Signing in..." : "Sign in"}
              </span>

              {!loading && (
                <ArrowIcon />
              )}

            </button>

            {/* Divider */}
            <div className="my-6 flex items-center gap-4 md:my-7">

              <div className="h-px flex-1 bg-slate-200" />

              <span className="text-xs font-medium text-slate-400">
                or
              </span>

              <div className="h-px flex-1 bg-slate-200" />

            </div>

            {/* Registration */}
            <div className="text-center">

              <p className="text-xs font-medium text-slate-400">
                New to FwdNourish?
              </p>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">

                <Link
                  to="/signup/tenant"
                  className="group flex h-14 items-center justify-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-3 text-base font-bold text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50/40 hover:text-emerald-700 active:bg-emerald-50 md:h-12 md:rounded-xl md:text-sm"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-transform group-hover:scale-110 md:h-8 md:w-8 md:rounded-lg">
                    <StoreIcon />
                  </span>

                  Register Business
                </Link>

                <Link
                  to="/signup/ngo"
                  className="group flex h-14 items-center justify-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-3 text-base font-bold text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50/40 hover:text-emerald-700 active:bg-emerald-50 md:h-12 md:rounded-xl md:text-sm"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-transform group-hover:scale-110 md:h-8 md:w-8 md:rounded-lg">
                    <UsersIcon />
                  </span>

                  Register NGO
                </Link>

              </div>

            </div>

            {/* Trust message */}
            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 md:rounded-xl">

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <ShieldIcon small />
              </div>

              <p className="text-xs leading-5 text-slate-500 md:text-[11px]">
                Your account and workspace are protected with
                secure authentication.
              </p>

            </div>

          </div>
        </form>
      </div>

      <style>{`
        @keyframes loginCardIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .auth-login-card {
          animation: loginCardIn 0.55s ease-out both;
        }
      `}</style>
    </AuthLayout>
  );
}

/* =========================================================
   INLINE SVG ICONS
   No lucide-react dependency
========================================================= */

function ShieldIcon({ small = false }: { small?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={small ? "h-4 w-4" : "h-5 w-5"}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3 20 6v5c0 5.2-3.4 8.7-8 10-4.6-1.3-8-4.8-8-10V6l8-3Z" />
      <path d="m8.5 12 2.2 2.2 4.8-5" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      <circle cx="12" cy="15" r="1" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m3 3 18 18" />
      <path d="M10.6 6.2A10.7 10.7 0 0 1 12 6c6 0 9.5 6 9.5 6a17.4 17.4 0 0 1-3.2 3.8" />
      <path d="M6.7 6.8C3.9 8.4 2.5 12 2.5 12s3.5 6 9.5 6c1 0 1.9-.2 2.7-.5" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="relative h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h13" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function StoreIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 10v9h16v-9" />
      <path d="M3 10 5 4h14l2 6" />
      <path d="M3 10c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3" />
      <path d="M9 19v-4h6v4" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3.5 20c.5-4 2.5-6 5.5-6s5 2 5.5 6" />
      <path d="M14 14.5c2.5-.5 5 .8 6 3.5" />
    </svg>
  );
}