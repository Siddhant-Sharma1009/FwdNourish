import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import AuthField from "../../components/auth/AuthField";
import AuthLayout from "../../components/auth/AuthLayout";
import FormErrorSummary from "../../components/auth/FormErrorSummary";
import LocationSelector, {
  type LocationData,
} from "../../components/common/LocationSelector";

import { registerNgo } from "../../services/authApi";

const steps = [
  "Account",
  "Organization",
  "Location",
  "Profile",
];

export default function NgoSignup() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    phone: "",

    organization_name: "",
    registration_number: "",

    service_radius_km: "25",

    website: "",
    instagram: "",
    facebook: "",
    linkedin: "",
    google_maps_link: "",
    description: "",
  });

  const [location, setLocation] = useState<LocationData>({
    address: "",
    city: "",
    state: "",
    pincode: "",
    latitude: "",
    longitude: "",
  });

  const [errors, setErrors] = useState<string[]>([]);

  const [fieldErrors, setFieldErrors] = useState<
    Record<string, string>
  >({});

  const [loading, setLoading] = useState(false);

  const firstFieldRef = useRef<HTMLInputElement>(null);

  function update(
    key: keyof typeof form,
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));

    setFieldErrors((previous) => ({
      ...previous,
      [key]: "",
    }));

    setErrors([]);
  }

  function validateStep(currentStep: number) {
    const next: Record<string, string> = {};

    if (currentStep === 1) {
      if (form.full_name.trim().length < 2) {
        next.full_name =
          "Contact person name is required.";
      }

      if (!form.email.trim()) {
        next.email = "Email address is required.";
      } else if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
      ) {
        next.email =
          "Please enter a valid email address.";
      }

      if (form.password.length < 8) {
        next.password =
          "Password must contain at least 8 characters.";
      }
    }

    if (currentStep === 2) {
      if (form.organization_name.trim().length < 2) {
        next.organization_name =
          "Organization name is required.";
      }

      if (!form.registration_number.trim()) {
        next.registration_number =
          "Registration number is required.";
      }

      const radius = Number(
        form.service_radius_km
      );

      if (
        !Number.isFinite(radius) ||
        radius <= 0 ||
        radius > 500
      ) {
        next.service_radius_km =
          "Service radius must be between 1 and 500 km.";
      }
    }

    if (currentStep === 3) {
      if (!location.address.trim()) {
        next.address = "Address is required.";
      }

      if (!location.city.trim()) {
        next.city = "City is required.";
      }

      if (!location.state) {
        next.state = "State is required.";
      }

      if (location.pincode.length !== 6) {
        next.pincode =
          "Pincode must contain exactly 6 digits.";
      }

      if (!location.latitude || !location.longitude) {
        next.coordinates =
          "Please use Current Location to capture coordinates.";
      }
    }

    const messages = Object.values(next);

    setFieldErrors(next);
    setErrors(messages);

    if (messages.length > 0) {
      setTimeout(() => {
        firstFieldRef.current?.focus();
      }, 50);

      return false;
    }

    return true;
  }

  function nextStep() {
    if (!validateStep(step)) {
      return;
    }

    setStep((previous) =>
      Math.min(previous + 1, 4)
    );
  }

  function previousStep() {
    setErrors([]);
    setFieldErrors({});

    setStep((previous) =>
      Math.max(previous - 1, 1)
    );
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!validateStep(4)) {
      return;
    }

    setLoading(true);
    setErrors([]);

    try {
      const result = await registerNgo({
        ...form,
        ...location,
        service_radius_km: Number(
          form.service_radius_km
        ),
      });

      navigate("/pending", {
        state: {
          message: result.message,
        },
      });
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ||
        "Registration failed. Please check your information.";

      setErrors([
        typeof detail === "string"
          ? detail
          : "Registration failed.",
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Create your NGO account"
      subtitle="Connect your organization with businesses that want to redistribute surplus food."
      mode="signup"
    >
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center">
          {steps.map((label, index) => {
            const number = index + 1;
            const active = number === step;
            const completed = number < step;

            return (
              <div
                key={label}
                className="flex flex-1 items-center"
              >
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                      active || completed
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {completed ? "✓" : number}
                  </div>

                  <span
                    className={`mt-1.5 text-[10px] font-semibold sm:text-xs ${
                      active
                        ? "text-emerald-700"
                        : "text-slate-400"
                    }`}
                  >
                    {label}
                  </span>
                </div>

                {number < steps.length && (
                  <div
                    className={`mx-2 mb-5 h-0.5 flex-1 ${
                      number < step
                        ? "bg-emerald-500"
                        : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <FormErrorSummary errors={errors} />

      <form
        onSubmit={submit}
        noValidate
        className="space-y-6"
      >
        {/* STEP 1 */}
        {step === 1 && (
          <div className="space-y-5">
            

            <AuthField
              ref={firstFieldRef}
              label="Contact person"
              value={form.full_name}
              onChange={(e) =>
                update("full_name", e.target.value)
              }
              placeholder="Full name"
              required
              error={fieldErrors.full_name}
            />

            <AuthField
              label="Email address"
              type="email"
              value={form.email}
              onChange={(e) =>
                update("email", e.target.value)
              }
              placeholder="organization@example.com"
              required
              error={fieldErrors.email}
            />

            <AuthField
              label="Phone number"
              type="tel"
              value={form.phone}
              onChange={(e) =>
                update("phone", e.target.value)
              }
              placeholder="+91 XXXXX XXXXX"
              hint="Optional"
            />

            <AuthField
              label="Password"
              type="password"
              value={form.password}
              onChange={(e) =>
                update("password", e.target.value)
              }
              placeholder="Minimum 8 characters"
              required
              error={fieldErrors.password}
            />
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Organization Details
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Tell us about the organization that will receive
                surplus food.
              </p>
            </div>

            <AuthField
              ref={firstFieldRef}
              label="Organization name"
              value={form.organization_name}
              onChange={(e) =>
                update(
                  "organization_name",
                  e.target.value
                )
              }
              placeholder="NGO / organization name"
              required
              error={fieldErrors.organization_name}
            />

            <AuthField
              label="Registration number"
              value={form.registration_number}
              onChange={(e) =>
                update(
                  "registration_number",
                  e.target.value
                )
              }
              placeholder="Official registration number"
              required
              error={fieldErrors.registration_number}
            />

            <AuthField
              label="Service radius"
              type="number"
              min={1}
              max={500}
              value={form.service_radius_km}
              onChange={(e) =>
                update(
                  "service_radius_km",
                  e.target.value
                )
              }
              placeholder="25"
              required
              error={fieldErrors.service_radius_km}
              hint="Maximum distance your organization normally supports for food pickup."
            />
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Organization Location
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Your location helps the matching engine find suitable
                surplus food nearby.
              </p>
            </div>

            <LocationSelector
              value={location}
              onChange={(data) => {
                setLocation(data);
                setErrors([]);
                setFieldErrors({});
              }}
            />

            {Object.values(fieldErrors).length > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                {fieldErrors.coordinates ||
                  fieldErrors.address ||
                  fieldErrors.city ||
                  fieldErrors.state ||
                  fieldErrors.pincode}
              </div>
            )}
          </div>
        )}

        {/* STEP 4 */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Organization Profile
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Optional information that helps donors understand your
                organization.
              </p>
            </div>

            <AuthField
              label="Organization description"
              textarea
              value={form.description}
              onChange={(e) =>
                update(
                  "description",
                  e.target.value
                )
              }
              placeholder="Describe your organization, the communities you serve, and your food distribution activities."
              hint="Optional"
            />

            <AuthField
              label="Website"
              type="url"
              value={form.website}
              onChange={(e) =>
                update("website", e.target.value)
              }
              placeholder="https://example.org"
            />

            <AuthField
              label="Instagram"
              type="url"
              value={form.instagram}
              onChange={(e) =>
                update("instagram", e.target.value)
              }
              placeholder="https://instagram.com/..."
            />

            <AuthField
              label="Facebook"
              type="url"
              value={form.facebook}
              onChange={(e) =>
                update("facebook", e.target.value)
              }
              placeholder="https://facebook.com/..."
            />

            <AuthField
              label="LinkedIn"
              type="url"
              value={form.linkedin}
              onChange={(e) =>
                update("linkedin", e.target.value)
              }
              placeholder="https://linkedin.com/..."
            />

            <AuthField
              label="Google Maps link"
              type="url"
              value={form.google_maps_link}
              onChange={(e) =>
                update(
                  "google_maps_link",
                  e.target.value
                )
              }
              placeholder="https://maps.google.com/..."
            />
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 pt-2">
          {step > 1 && (
            <button
              type="button"
              onClick={previousStep}
              className="h-12 flex-1 rounded-xl border border-slate-300 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Back
            </button>
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={nextStep}
              className="h-12 flex-1 rounded-xl bg-emerald-600 text-sm font-bold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-100"
            >
              Continue
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="h-12 flex-1 rounded-xl bg-emerald-600 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Submitting..."
                : "Submit for Verification"}
            </button>
          )}
        </div>
      </form>

      <p className="mt-7 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-semibold text-emerald-700 hover:text-emerald-800"
        >
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}