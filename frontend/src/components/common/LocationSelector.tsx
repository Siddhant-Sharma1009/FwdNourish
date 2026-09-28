import { useState } from "react";

export interface LocationData {
  address: string;
  city: string;
  state: string;
  pincode: string;
  latitude: string;
  longitude: string;
  google_maps_link: string;
}

interface LocationSelectorProps {
  value: LocationData;
  onChange: (data: LocationData) => void;
}



export default function LocationSelector({
  value,
  onChange,
}: LocationSelectorProps) {
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [locationMessageType, setLocationMessageType] = useState<
    "success" | "error" | "info"
  >("info");

  function update(key: keyof LocationData, newValue: string) {
    onChange({
      ...value,
      [key]: newValue,
    });
  }

  function showMessage(
    message: string,
    type: "success" | "error" | "info"
  ) {
    setLocationMessage(message);
    setLocationMessageType(type);
  }

  function useCurrentLocation() {
    setLocationMessage("");

    if (!navigator.geolocation) {
      showMessage(
        "Geolocation is not supported by this browser. Please enter the coordinates manually.",
        "error"
      );
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude.toFixed(6);
        const longitude = position.coords.longitude.toFixed(6);

        const googleMapsLink =
          `https://www.google.com/maps?q=${latitude},${longitude}`;

        onChange({
          ...value,
          latitude,
          longitude,
          google_maps_link: googleMapsLink,
        });

        showMessage(
          "Current location captured successfully. Latitude, longitude and Google Maps link have been filled.",
          "success"
        );

        setLocating(false);
      },
      (error) => {
        let message = "Unable to get your location.";

        if (error.code === error.PERMISSION_DENIED) {
          message =
            "Location permission was denied. Please allow location access in your browser.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message =
            "Your current location could not be determined. Please enter the coordinates manually.";
        } else if (error.code === error.TIMEOUT) {
          message =
            "Location request timed out. Please try again or enter the coordinates manually.";
        }

        showMessage(message, "error");
        setLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }

  function clearCoordinates() {
    onChange({
      ...value,
      latitude: "",
      longitude: "",
      google_maps_link: "",
    });

    showMessage(
      "Coordinates and Google Maps link cleared.",
      "info"
    );
  }

  function coordinatesAreValid() {
    const latitude = Number(value.latitude);
    const longitude = Number(value.longitude);

    return (
      value.latitude.trim() !== "" &&
      value.longitude.trim() !== "" &&
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180
    );
  }

  const coordinatesValid = coordinatesAreValid();

  return (
    <div className="space-y-5">
      

      {/* Location message */}
      {locationMessage && (
        <div
          className={`rounded-lg border px-3 py-2.5 text-sm ${
            locationMessageType === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : locationMessageType === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-blue-200 bg-blue-50 text-blue-700"
          }`}
        >
          {locationMessage}
        </div>
      )}

      {/* Full address */}
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
          Full Address
          <span className="text-red-500"> *</span>
        </label>

        <textarea
          value={value.address}
          onChange={(e) => update("address", e.target.value)}
          required
          rows={3}
          placeholder="House / building, street, area, landmark"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />

        <p className="mt-1 text-xs text-slate-500">
          Include a landmark if it helps the NGO locate the pickup point.
        </p>
      </div>

      {/* City / State / Pincode */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* City */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">
            City
            <span className="text-red-500"> *</span>
          </label>

          <input
            type="text"
            value={value.city}
            onChange={(e) => update("city", e.target.value)}
            required
            placeholder="City"
            className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        {/* State */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">
            State
            <span className="text-red-500"> *</span>
          </label>

          <select
            value={value.state}
            onChange={(e) => update("state", e.target.value)}
            required
            className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="">Select state</option>
            <option value="Andhra Pradesh">Andhra Pradesh</option>
            <option value="Arunachal Pradesh">Arunachal Pradesh</option>
            <option value="Assam">Assam</option>
            <option value="Bihar">Bihar</option>
            <option value="Chhattisgarh">Chhattisgarh</option>
            <option value="Goa">Goa</option>
            <option value="Gujarat">Gujarat</option>
            <option value="Haryana">Haryana</option>
            <option value="Himachal Pradesh">Himachal Pradesh</option>
            <option value="Jharkhand">Jharkhand</option>
            <option value="Karnataka">Karnataka</option>
            <option value="Kerala">Kerala</option>
            <option value="Madhya Pradesh">Madhya Pradesh</option>
            <option value="Maharashtra">Maharashtra</option>
            <option value="Manipur">Manipur</option>
            <option value="Meghalaya">Meghalaya</option>
            <option value="Mizoram">Mizoram</option>
            <option value="Nagaland">Nagaland</option>
            <option value="Odisha">Odisha</option>
            <option value="Punjab">Punjab</option>
            <option value="Rajasthan">Rajasthan</option>
            <option value="Sikkim">Sikkim</option>
            <option value="Tamil Nadu">Tamil Nadu</option>
            <option value="Telangana">Telangana</option>
            <option value="Tripura">Tripura</option>
            <option value="Uttar Pradesh">Uttar Pradesh</option>
            <option value="Uttarakhand">Uttarakhand</option>
            <option value="West Bengal">West Bengal</option>
            <option value="Delhi">Delhi</option>
            <option value="Jammu and Kashmir">
              Jammu and Kashmir
            </option>
            <option value="Ladakh">Ladakh</option>
          </select>
        </div>

        {/* Pincode */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">
            Pincode
            <span className="text-red-500"> *</span>
          </label>

          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={value.pincode}
            onChange={(e) =>
              update(
                "pincode",
                e.target.value.replace(/\D/g, "").slice(0, 6)
              )
            }
            required
            placeholder="6-digit pincode"
            className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />

          {value.pincode.length > 0 &&
            value.pincode.length !== 6 && (
              <p className="mt-1 text-xs text-amber-600">
                Pincode must contain 6 digits.
              </p>
            )}
        </div>
      </div>

      {/* Coordinates + Google Maps */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🧭</span>

            <p className="text-sm font-semibold text-slate-800">
              Pickup Coordinates
            </p>
          </div>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Use Current Location to automatically capture the pickup
            coordinates and generate a Google Maps link.
          </p>
        </div>

        {/* Latitude / Longitude */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Latitude */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Latitude
            </label>

            <input
              type="text"
              inputMode="decimal"
              value={value.latitude}
              onChange={(e) =>
                update(
                  "latitude",
                  e.target.value.replace(/[^0-9.-]/g, "")
                )
              }
              placeholder="Example: 25.5941"
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />

            <p className="mt-1 text-[11px] text-slate-400">
              Range: -90 to 90
            </p>
          </div>

          {/* Longitude */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Longitude
            </label>

            <input
              type="text"
              inputMode="decimal"
              value={value.longitude}
              onChange={(e) =>
                update(
                  "longitude",
                  e.target.value.replace(/[^0-9.-]/g, "")
                )
              }
              placeholder="Example: 85.1376"
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />

            <p className="mt-1 text-[11px] text-slate-400">
              Range: -180 to 180
            </p>
          </div>
        </div>

        {/* Google Maps Link */}
        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">
            Google Maps Link
          </label>

          <input
            type="url"
            value={value.google_maps_link}
            onChange={(e) =>
              update("google_maps_link", e.target.value)
            }
            placeholder="https://www.google.com/maps?q=25.5941,85.1376"
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />

          <p className="mt-1 text-[11px] text-slate-400">
            This is automatically generated when you use Current Location.
            You can also paste or edit the link manually.
          </p>
        </div>

        {/* Coordinate actions */}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={locating}
            className="rounded-lg border border-emerald-600 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {locating
              ? "Locating..."
              : "📍 Use Current Location"}
          </button>

          <button
            type="button"
            onClick={clearCoordinates}
            disabled={
              !value.latitude &&
              !value.longitude &&
              !value.google_maps_link
            }
            className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear
          </button>
        </div>

        {coordinatesValid && (
          <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2.5">
            <p className="text-xs leading-5 text-emerald-700">
              ✓ Valid pickup coordinates captured.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}




