import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import AuthField from "../../components/auth/AuthField";
import AuthLayout from "../../components/auth/AuthLayout";
import { useAuth } from "../../context/AuthContext";

interface LocationState {
  message?: string;
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const { login: loginUser } = useAuth();

  const emailRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    general?: string;
  }>({});

  const [infoMessage, setInfoMessage] = useState("");
  const [loading, setLoading] = useState(false);

  /* =========================================================
     SHOW MESSAGE PASSED FROM ANOTHER PAGE
  ========================================================= */

  useEffect(() => {
    const state = location.state as LocationState | null;

    if (state?.message) {
      setInfoMessage(state.message);

      navigate(location.pathname, {
        replace: true,
        state: {},
      });
    }
  }, [location, navigate]);

  /* =========================================================
     UPDATE FORM
  ========================================================= */

  function update(
    key: keyof typeof form,
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [key]: undefined,
      general: undefined,
    }));
  }

  /* =========================================================
     VALIDATION
  ========================================================= */

  function validate() {
    const nextErrors: {
      email?: string;
      password?: string;
      general?: string;
    } = {};

    if (!form.email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
    ) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!form.password) {
      nextErrors.password = "Password is required.";
    }

    setErrors(nextErrors);

    if (nextErrors.email) {
      emailRef.current?.focus();
    }

    return Object.keys(nextErrors).length === 0;
  }

  /* =========================================================
     LOGIN
  ========================================================= */

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setInfoMessage("");
    setErrors({});

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      /*
       * IMPORTANT:
       *
       * Use AuthContext.login() instead of calling
       * authApi.login() directly.
       *
       * AuthContext.login():
       * 1. Calls backend
       * 2. Saves JWT in localStorage
       * 3. Updates authenticated user
       */
      const user = await loginUser(
        form.email.trim(),
        form.password
      );

      /* =====================================================
         HANDLE ACCOUNT STATUS
      ===================================================== */

      if (user.status === "PENDING") {
        navigate("/pending", {
          replace: true,
        });

        return;
      }

      if (user.status === "REJECTED") {
        setErrors({
          general:
            user.rejection_reason ||
            "Your account registration has been rejected.",
        });

        return;
      }

      /* =====================================================
         ROLE-BASED NAVIGATION
      ===================================================== */

      if (user.role === "ADMIN") {
        navigate("/admin", {
          replace: true,
        });

        return;
      }

      if (user.role === "NGO") {
        navigate("/ngo", {
          replace: true,
        });

        return;
      }

      if (user.role === "TENANT") {
        navigate("/dashboard", {
          replace: true,
        });

        return;
      }

      setErrors({
        general:
          "Your account role is not recognized. Please contact the administrator.",
      });
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ||
        "Unable to sign in. Please check your email and password.";

      setErrors({
        general:
          typeof detail === "string"
            ? detail
            : "Unable to sign in. Please check your email and password.",
      });
    } finally {
      setLoading(false);
    }
  }

  /* =========================================================
     UI
  ========================================================= */

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue managing food inventory, surplus and redistribution."
      mode="login"
    >
      {/* Information message */}
      {infoMessage && (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {infoMessage}
        </div>
      )}

      {/* General error */}
      {errors.general && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {errors.general}
        </div>
      )}

      <form
        onSubmit={submit}
        noValidate
        className="space-y-5"
      >
        {/* Email */}
        <AuthField
          ref={emailRef}
          label="Email address"
          type="email"
          value={form.email}
          onChange={(e) =>
            update("email", e.target.value)
          }
          placeholder="you@example.com"
          autoComplete="email"
          required
          error={errors.email}
        />

        {/* Password */}
        <AuthField
          label="Password"
          type="password"
          value={form.password}
          onChange={(e) =>
            update("password", e.target.value)
          }
          placeholder="Enter your password"
          autoComplete="current-password"
          required
          error={errors.password}
        />

        {/* Login button */}
        <button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-xl bg-emerald-600 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      {/* Registration divider */}
      <div className="my-7 flex items-center gap-4">
        <div className="h-px flex-1 bg-slate-200" />

        <span className="text-xs text-slate-400">
          New to FwdNourish?
        </span>

        <div className="h-px flex-1 bg-slate-200" />
      </div>

      {/* Registration options */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          to="/signup/tenant"
          className="rounded-xl border border-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700"
        >
          Register Business
        </Link>

        <Link
          to="/signup/ngo"
          className="rounded-xl border border-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700"
        >
          Register NGO
        </Link>
      </div>
    </AuthLayout>
  );
}