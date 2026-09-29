import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../../services/authApi";
import AuthLayout from "../../components/auth/AuthLayout";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();

    setMessage("");
    setError("");
    setLoading(true);

    try {
      const response = await forgotPassword(email);

      setMessage(response.message);
      setEmail("");
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          "Unable to process your request. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="Enter the email address associated with your account. If an account exists, we'll send you a password reset link."
    >
      <div className="mx-auto w-full max-w-md">
        <form
          onSubmit={submit}
          className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_10px_35px_rgba(15,23,42,0.06)] sm:p-7"
        >
          {/* Header icon */}
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-6 w-6"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 8.5 12 14l9-5.5"
              />
              <rect
                x="3"
                y="5"
                width="18"
                height="14"
                rx="2"
              />
            </svg>
          </div>

          {message && (
            <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-5 text-emerald-700">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="forgot-email"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Email address
            </label>

            <input
              id="forgot-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send reset link"}
          </button>

          <div className="mt-6 border-t border-slate-100 pt-5 text-center">
            <Link
              to="/login"
              className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-800"
            >
              ← Back to sign in
            </Link>
          </div>
        </form>
      </div>
    </AuthLayout>
  );
}