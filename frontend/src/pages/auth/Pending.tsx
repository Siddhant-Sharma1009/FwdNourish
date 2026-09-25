import { Link } from "react-router-dom";
import AuthLayout from "../../components/auth/AuthLayout";

export default function Pending() {
  return (
    <AuthLayout
      title="Application under review"
      subtitle="Your registration has been submitted successfully. An administrator will review your account before access is granted."
      mode="pending"
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        {/* Status icon */}
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50">
          <svg
            className="h-7 w-7 text-amber-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
        </div>

        {/* Heading */}
        <h3 className="mt-5 text-xl font-bold text-slate-900">
          Your account is pending approval
        </h3>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Thanks for registering with FwdNourish. Your information has been
          submitted and is currently waiting for administrator verification.
        </p>

        {/* Status timeline */}
        <div className="mt-7 space-y-4">
          <StatusItem
            number="1"
            title="Registration submitted"
            description="Your organization details have been received."
            completed
          />

          <StatusItem
            number="2"
            title="Administrator review"
            description="Our administrator will verify your registration details."
            active
          />

          <StatusItem
            number="3"
            title="Account activation"
            description="You'll be able to access the platform after approval."
          />
        </div>

        {/* Information */}
        <div className="mt-7 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
          <div className="flex gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm text-emerald-700">
              i
            </div>

            <div>
              <p className="text-sm font-semibold text-emerald-900">
                What happens next?
              </p>

              <p className="mt-1 text-xs leading-5 text-emerald-700">
                Once your account is approved, you can sign in and start using
                FwdNourish's inventory, AI prediction and food redistribution
                features.
              </p>
            </div>
          </div>
        </div>

        {/* Back to login */}
        <Link
          to="/login"
          className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Continue to Login

          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14" />
            <path d="m13 6 6 6-6 6" />
          </svg>
        </Link>
      </div>
    </AuthLayout>
  );
}

function StatusItem({
  number,
  title,
  description,
  completed = false,
  active = false,
}: {
  number: string;
  title: string;
  description: string;
  completed?: boolean;
  active?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          completed
            ? "bg-emerald-100 text-emerald-700"
            : active
              ? "bg-amber-100 text-amber-700"
              : "bg-slate-100 text-slate-400"
        }`}
      >
        {completed ? "✓" : number}
      </div>

      <div className="pt-0.5">
        <p className="text-sm font-semibold text-slate-800">
          {title}
        </p>

        <p className="mt-0.5 text-xs leading-5 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}