import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { resetPassword } from "../../services/authApi";
import AuthLayout from "../../components/auth/AuthLayout";

export default function ResetPassword() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!token) {
      setError("Invalid password reset link.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await resetPassword(token, password);

      setMessage(response.message);
      setPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1500);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          "Unable to reset your password. The link may have expired."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Create a new password"
      subtitle="Choose a strong password with at least 8 characters."
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
              <rect
                x="5"
                y="10"
                width="14"
                height="10"
                rx="2"
              />

              <path
                strokeLinecap="round"
                d="M8 10V7a4 4 0 0 1 8 0v3"
              />

              <circle
                cx="12"
                cy="15"
                r="1"
                fill="currentColor"
                stroke="none"
              />
            </svg>
          </div>

          {message && (
            <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-5 text-emerald-700">
              <p>{message}</p>

              <p className="mt-1 text-xs text-emerald-600">
                Redirecting to sign in...
              </p>
            </div>
          )}

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="new-password"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              New password
            </label>

            <input
              id="new-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
              autoComplete="new-password"
              placeholder="Enter your new password"
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
            />
          </div>

          <div className="mt-4">
            <label
              htmlFor="confirm-password"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Confirm new password
            </label>

            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              minLength={8}
              required
              autoComplete="new-password"
              placeholder="Confirm your new password"
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !!message}
            className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Updating password..." : "Reset password"}
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