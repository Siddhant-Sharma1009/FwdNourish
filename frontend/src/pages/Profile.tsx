import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
    getProfile,
    updateProfile,
    changePassword,
    type CompleteProfile,
} from "../services/authApi";

export default function Profile() {
    const navigate = useNavigate();
    const { user, refreshUser } = useAuth();
    const [profile, setProfile] = useState<CompleteProfile | null>(null);
    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [originalFullName, setOriginalFullName] = useState("");
    const [originalPhone, setOriginalPhone] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [changingPassword, setChangingPassword] = useState(false);
    const [passwordSuccess, setPasswordSuccess] = useState("");
    const [passwordError, setPasswordError] = useState("");
    // ==========================================================
    // LOAD COMPLETE PROFILE
    // ==========================================================

    useEffect(() => {
        async function loadProfile() {
            try {
                setLoading(true);

                const data = await getProfile();

                setProfile(data);

                setFullName(data.full_name || "");
                setPhone(data.phone || "");

                setOriginalFullName(data.full_name || "");
                setOriginalPhone(data.phone || "");
            } catch (error: any) {
                setErrorMessage(
                    error?.response?.data?.detail ||
                    "Unable to load your profile."
                );
            } finally {
                setLoading(false);
            }
        }

        if (user) {
            loadProfile();
        }
    }, [user]);

    async function handleChangePassword(event: React.FormEvent) {
        event.preventDefault();

        setPasswordSuccess("");
        setPasswordError("");

        if (!currentPassword || !newPassword || !confirmPassword) {
            setPasswordError("Please fill in all password fields.");
            return;
        }

        if (newPassword.length < 8) {
            setPasswordError("New password must be at least 8 characters long.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordError("New password and confirm password do not match.");
            return;
        }

        if (currentPassword === newPassword) {
            setPasswordError(
                "New password must be different from your current password."
            );
            return;
        }

        try {
            setChangingPassword(true);

            const response = await changePassword({
                current_password: currentPassword,
                new_password: newPassword,
            });

            setPasswordSuccess(
                response.message || "Password changed successfully."
            );

            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (error: any) {
            setPasswordError(
                error?.response?.data?.detail ||
                "Unable to change password. Please try again."
            );
        } finally {
            setChangingPassword(false);
        }
    }

    // ==========================================================
    // LOADING
    // ==========================================================

    if (!user || loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center bg-slate-50">
                <div className="text-center">
                    {!user ? (
                        <>
                            <p className="text-slate-500">
                                Please login to view your profile.
                            </p>

                            <button
                                type="button"
                                onClick={() => navigate("/login")}
                                className="mt-4 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                            >
                                Go to Login
                            </button>
                        </>
                    ) : (
                        <div className="flex items-center gap-3 text-slate-500">
                            <svg
                                className="h-5 w-5 animate-spin"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    className="opacity-25"
                                />

                                <path
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                    className="opacity-75"
                                />
                            </svg>

                            Loading profile...
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center bg-slate-50">
                <p className="text-slate-500">Unable to load your profile.</p>
            </div>
        );
    }

    // ==========================================================
    // CANCEL
    // ==========================================================

    function handleCancel() {
        // Restore the exact values that existed
        // when the profile was loaded.
        setFullName(originalFullName);
        setPhone(originalPhone);

        setSuccessMessage("");
        setErrorMessage("");
    }

    // ==========================================================
    // SAVE
    // ==========================================================

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();

        setSuccessMessage("");
        setErrorMessage("");

        const trimmedName = fullName.trim();
        const trimmedPhone = phone.trim();

        if (!trimmedName) {
            setErrorMessage("Full name cannot be empty.");
            return;
        }

        try {
            setSaving(true);

            const updated = await updateProfile({
                full_name: trimmedName,
                phone: trimmedPhone || null,
            });

            setProfile(updated);

            setFullName(updated.full_name || "");
            setPhone(updated.phone || "");

            setOriginalFullName(updated.full_name || "");
            setOriginalPhone(updated.phone || "");

            await refreshUser();

            setSuccessMessage("Profile updated successfully.");
        } catch (error: any) {
            setErrorMessage(
                error?.response?.data?.detail ||
                "Unable to update your profile. Please try again."
            );
        } finally {
            setSaving(false);
        }
    }

    // ==========================================================
    // HELPERS
    // ==========================================================

    const roleLabel =
        profile.role === "ADMIN"
            ? "Platform Administration"
            : profile.role === "NGO"
                ? "NGO"
                : "Business";

    const statusLabel = profile.status
        ? profile.status.charAt(0).toUpperCase() +
        profile.status.slice(1).toLowerCase()
        : "Unknown";

    const isNgo = profile.role === "NGO";
    const isTenant = profile.role === "TENANT";

    function displayValue(value: unknown) {
        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return "Not provided";
        }

        return String(value);
    }

    // ==========================================================
    // FIELD COMPONENT
    // (mobile: clean list row · desktop: original boxed field)
    // ==========================================================

    function ReadOnlyField({
        label,
        value,
        fullWidth = false,
    }: {
        label: string;
        value: unknown;
        fullWidth?: boolean;
    }) {
        return (
            <div className={fullWidth ? "sm:col-span-2" : ""}>
                <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400 md:mb-1.5 md:text-xs">
                    {label}
                </p>

                <div className="min-h-0 break-words border-0 border-b border-slate-100 bg-transparent px-0 py-2 text-[15px] font-medium text-slate-800 md:min-h-[44px] md:break-normal md:rounded-xl md:border md:border-slate-200 md:bg-slate-50 md:px-4 md:py-3 md:text-sm md:font-normal md:text-slate-700">
                    {displayValue(value)}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-full bg-slate-50 p-4 pb-28 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-6xl">

                {/* ====================================================
            HEADER
        ==================================================== */}

                <div className="mb-4 flex items-center gap-3 md:mb-6">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        aria-label="Go back"
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition active:scale-95 hover:bg-slate-100 hover:text-slate-800 md:h-9 md:w-9 md:rounded-lg md:shadow-none"
                    >
                        ←
                    </button>

                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">
                            Profile
                        </h1>

                        <p className="mt-1 text-sm text-slate-500">
                            View and manage your account information.
                        </p>
                    </div>
                </div>

                {/* ====================================================
            MESSAGES
        ==================================================== */}

                {successMessage && (
                    <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 md:rounded-xl">
                        ✓ {successMessage}
                    </div>
                )}

                {errorMessage && (
                    <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 md:rounded-xl">
                        ⚠ {errorMessage}
                    </div>
                )}

                {/* ====================================================
            MOBILE PROFILE HERO
        ==================================================== */}

                <div className="mb-4 rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-600 p-5 text-white shadow-lg md:hidden">
                    <div className="flex items-center gap-4">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl font-bold">
                            {profile.full_name
                                ? profile.full_name.charAt(0).toUpperCase()
                                : "U"}
                        </div>

                        <div className="min-w-0">
                            <h2 className="truncate text-lg font-bold">
                                {displayValue(profile.full_name)}
                            </h2>

                            <p className="truncate text-sm text-emerald-100">
                                {profile.email}
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                            {roleLabel}
                        </span>

                        <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                            {statusLabel}
                        </span>
                    </div>
                </div>

                {/* ====================================================
            MAIN GRID
        ==================================================== */}

                <div className="grid gap-4 md:gap-6 lg:grid-cols-3">

                    {/* ==================================================
              PROFILE SUMMARY
          ================================================== */}

                    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:rounded-2xl md:p-6">
                        <div className="hidden flex-col items-center text-center md:flex">

                            <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-3xl font-bold text-white shadow-lg">
                                {profile.full_name
                                    ? profile.full_name.charAt(0).toUpperCase()
                                    : "U"}
                            </div>

                            <h2 className="mt-4 text-lg font-bold text-slate-900">
                                {displayValue(profile.full_name)}
                            </h2>

                            <p className="mt-1 break-all text-sm text-slate-500">
                                {profile.email}
                            </p>

                            <div className="mt-4 flex flex-wrap justify-center gap-2">
                                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                    {roleLabel}
                                </span>

                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                    {statusLabel}
                                </span>
                            </div>
                        </div>

                        <div className="mt-0 border-t-0 pt-0 md:mt-6 md:border-t md:border-slate-100 md:pt-5">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                Account
                            </p>

                            <div className="mt-2 space-y-2 md:mt-4 md:space-y-4">
                                <ReadOnlyField
                                    label="Account ID"
                                    value={`${profile.id}`}
                                />

                                <ReadOnlyField
                                    label="Role"
                                    value={roleLabel}
                                />

                                <ReadOnlyField
                                    label="Status"
                                    value={statusLabel}
                                />

                                {profile.tenant_id && (
                                    <ReadOnlyField
                                        label="Business ID"
                                        value={`${profile.tenant_id}`}
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ==================================================
              PROFILE DETAILS
          ================================================== */}

                    <div className="space-y-4 md:space-y-6 lg:col-span-2">

                        {/* =================================================
                PERSONAL INFORMATION
            ================================================= */}

                        <form
                            onSubmit={handleSubmit}
                            className="rounded-3xl border border-slate-200 bg-white shadow-sm md:rounded-2xl"
                        >
                            <div className="border-b border-slate-100 p-4 md:p-6">
                                <h2 className="text-lg font-bold text-slate-900">
                                    Personal Information
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    Fields with an editable indicator can be changed.
                                </p>

                                <div className="mt-5 grid gap-4 sm:grid-cols-2 md:mt-6 md:gap-5">

                                    {/* Full Name */}
                                    <div>
                                        <label
                                            htmlFor="full_name"
                                            className="mb-2 block text-sm font-semibold text-slate-700"
                                        >
                                            Full Name
                                            <span className="ml-2 text-xs font-medium text-emerald-600">
                                                Editable
                                            </span>
                                        </label>

                                        <input
                                            id="full_name"
                                            type="text"
                                            value={fullName}
                                            onChange={(e) =>
                                                setFullName(e.target.value)
                                            }
                                            className="min-h-[48px] w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 md:min-h-0 md:text-sm"
                                        />
                                    </div>

                                    {/* Phone */}
                                    <div>
                                        <label
                                            htmlFor="phone"
                                            className="mb-2 block text-sm font-semibold text-slate-700"
                                        >
                                            Phone Number
                                            <span className="ml-2 text-xs font-medium text-emerald-600">
                                                Editable
                                            </span>
                                        </label>

                                        <input
                                            id="phone"
                                            type="tel"
                                            value={phone}
                                            onChange={(e) =>
                                                setPhone(e.target.value)
                                            }
                                            placeholder="Not provided"
                                            className="min-h-[48px] w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 md:min-h-0 md:text-sm"
                                        />
                                    </div>

                                    <ReadOnlyField
                                        label="Email Address"
                                        value={profile.email}
                                    />

                                    <ReadOnlyField
                                        label="Account Status"
                                        value={statusLabel}
                                    />
                                </div>
                            </div>

                            {/* =================================================
                  ORGANIZATION INFORMATION
              ================================================= */}

                            <div className="border-b border-slate-100 p-4 md:p-6">
                                <div className="mb-3 md:mb-5">
                                    <h2 className="text-lg font-bold text-slate-900">
                                        {isNgo
                                            ? "NGO Information"
                                            : isTenant
                                                ? "Business Information"
                                                : "Organization Information"}
                                    </h2>

                                    <p className="mt-1 text-sm text-slate-500">
                                        Organization details associated with this account.
                                    </p>
                                </div>

                                <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2 md:gap-5">

                                    <ReadOnlyField
                                        label={
                                            isNgo
                                                ? "Organization Name"
                                                : "Business Name"
                                        }
                                        value={profile.organization_name}
                                    />

                                    {isTenant && (
                                        <ReadOnlyField
                                            label="Business Type"
                                            value={profile.business_type}
                                        />
                                    )}

                                    <ReadOnlyField
                                        label="Registration Number"
                                        value={profile.registration_number}
                                    />

                                    {isNgo && (
                                        <ReadOnlyField
                                            label="Service Radius"
                                            value={
                                                profile.service_radius_km !== null &&
                                                    profile.service_radius_km !== undefined
                                                    ? `${profile.service_radius_km} km`
                                                    : null
                                            }
                                        />
                                    )}

                                    <ReadOnlyField
                                        label="Description"
                                        value={profile.description}
                                        fullWidth
                                    />
                                </div>
                            </div>

                            {/* =================================================
                  ADDRESS
              ================================================= */}

                            <div className="border-b border-slate-100 p-4 md:p-6">
                                <h2 className="text-lg font-bold text-slate-900">
                                    Address & Location
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    Registered organization location.
                                </p>

                                <div className="mt-4 grid gap-x-4 gap-y-2 sm:grid-cols-2 md:mt-5 md:gap-5">

                                    <ReadOnlyField
                                        label="Address"
                                        value={profile.address}
                                        fullWidth
                                    />

                                    <ReadOnlyField
                                        label="City"
                                        value={profile.city}
                                    />

                                    <ReadOnlyField
                                        label="State"
                                        value={profile.state}
                                    />

                                    <ReadOnlyField
                                        label="Pincode"
                                        value={profile.pincode}
                                    />

                                    <ReadOnlyField
                                        label="Latitude"
                                        value={profile.latitude}
                                    />

                                    <ReadOnlyField
                                        label="Longitude"
                                        value={profile.longitude}
                                    />

                                    <ReadOnlyField
                                        label="Google Maps"
                                        value={profile.google_maps_link}
                                        fullWidth
                                    />


                                </div>

                            </div>



                            {/* =================================================
                  ONLINE PRESENCE
              ================================================= */}

                            <div className="border-b border-slate-100 p-4 md:p-6">
                                <h2 className="text-lg font-bold text-slate-900">
                                    Online Presence
                                </h2>

                                <div className="mt-4 grid gap-x-4 gap-y-2 sm:grid-cols-2 md:mt-5 md:gap-5">

                                    <ReadOnlyField
                                        label="Website"
                                        value={profile.website}
                                    />

                                    <ReadOnlyField
                                        label="Instagram"
                                        value={profile.instagram}
                                    />

                                    <ReadOnlyField
                                        label="Facebook"
                                        value={profile.facebook}
                                    />

                                    <ReadOnlyField
                                        label="LinkedIn"
                                        value={profile.linkedin}
                                    />
                                </div>
                            </div>

                            {/* =================================================
                  ACTIONS
                  (mobile: sticky save bar · desktop: original)
              ================================================= */}

                            <div className="sticky bottom-0 z-10 flex flex-col-reverse gap-3 rounded-b-3xl border-t border-slate-100 bg-white/95 p-4 backdrop-blur sm:flex-row sm:justify-end md:static md:rounded-none md:border-t-0 md:bg-transparent md:p-6 md:backdrop-blur-none">

                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    disabled={saving}
                                    className="min-h-[48px] rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-600 transition active:scale-[0.98] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 md:min-h-0"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="min-h-[48px] rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98] hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 md:min-h-0"
                                >
                                    {saving ? "Saving..." : "Save Changes"}
                                </button>

                            </div>
                        </form>

                        {/* =================================================
    CHANGE PASSWORD
================================================= */}

                        <form
                            onSubmit={handleChangePassword}
                            className="rounded-3xl border border-slate-200 bg-white shadow-sm md:rounded-2xl"
                        >
                            <div className="border-b border-slate-100 p-4 md:p-6">
                                <h2 className="text-lg font-bold text-slate-900">
                                    Change Password
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    Update your password to keep your account secure.
                                </p>
                            </div>

                            <div className="p-4 md:p-6">
                                {passwordSuccess && (
                                    <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 md:rounded-xl">
                                        ✓ {passwordSuccess}
                                    </div>
                                )}

                                {passwordError && (
                                    <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 md:rounded-xl">
                                        ⚠ {passwordError}
                                    </div>
                                )}

                                <div className="grid gap-4 sm:grid-cols-2 md:gap-5">
                                    {/* Current Password */}
                                    <div className="sm:col-span-2">
                                        <label
                                            htmlFor="current_password"
                                            className="mb-2 block text-sm font-semibold text-slate-700"
                                        >
                                            Current Password
                                        </label>

                                        <input
                                            id="current_password"
                                            type="password"
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            placeholder="Enter your current password"
                                            autoComplete="current-password"
                                            className="min-h-[48px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 md:min-h-0 md:text-sm"
                                        />
                                    </div>

                                    {/* New Password */}
                                    <div>
                                        <label
                                            htmlFor="new_password"
                                            className="mb-2 block text-sm font-semibold text-slate-700"
                                        >
                                            New Password
                                        </label>

                                        <input
                                            id="new_password"
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Enter new password"
                                            autoComplete="new-password"
                                            className="min-h-[48px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 md:min-h-0 md:text-sm"
                                        />

                                        <p className="mt-1.5 text-xs text-slate-400">
                                            Minimum 8 characters.
                                        </p>
                                    </div>

                                    {/* Confirm Password */}
                                    <div>
                                        <label
                                            htmlFor="confirm_password"
                                            className="mb-2 block text-sm font-semibold text-slate-700"
                                        >
                                            Confirm New Password
                                        </label>

                                        <input
                                            id="confirm_password"
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Confirm new password"
                                            autoComplete="new-password"
                                            className="min-h-[48px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 md:min-h-0 md:text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="mt-6 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={changingPassword}
                                        className="min-h-[48px] w-full rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98] hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 md:min-h-0 md:w-auto"
                                    >
                                        {changingPassword ? "Changing Password..." : "Change Password"}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}