import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { FormEvent } from "react";

import { useAuth } from "../context/AuthContext";

import type { Inventory } from "../types/inventory";
import type { SurplusListing } from "../types/surplus";

import { getInventory } from "../services/inventoryApi";

import {
  createSurplusListing,
  getSurplusListings,
  cancelSurplusListing,
  completeSurplusListing,
  generateDonationMatches,
  previewDonationMatches,
  selectDonationMatch,
} from "../services/surplusApi";

import {
  getAvailableNGOs,
  type NGOOption,
} from "../services/ngoApi";



interface LocationState {
  latitude: string;
  longitude: string;
}


const initialLocation: LocationState = {
  latitude: "",
  longitude: "",
};


function SurplusListings() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const prefillAppliedRef = useRef(false);

  const tenantId = user?.tenant_id;

  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [listings, setListings] = useState<SurplusListing[]>([]);

  const [inventoryId, setInventoryId] = useState(0);
  // Kept as a string so the user can clear the field or type "0.5" freely.
  const [quantityInput, setQuantityInput] = useState("1");
  const quantity = Number(quantityInput);
  const [recipientName, setRecipientName] = useState("");

  const [inventorySearch, setInventorySearch] = useState("");
  const [inventorySelectorOpen, setInventorySelectorOpen] = useState(false);

  const [location, setLocation] =
    useState<LocationState>(initialLocation);

  const [googleMapsLink, setGoogleMapsLink] = useState("");
  const [availableFrom, setAvailableFrom] = useState("");
  const [availableUntil, setAvailableUntil] = useState("");

  const [note, setNote] = useState("");

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [listingSearch, setListingSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  const [ngos, setNgos] = useState<NGOOption[]>([]);
  const [selectedNgoId, setSelectedNgoId] = useState<number>(0);
  const [ngoSearch, setNgoSearch] = useState("");
  const [loadingNGOs, setLoadingNGOs] = useState(false);

  const [ngoSelectionMode, setNgoSelectionMode] =
    useState<"MANUAL" | "AI">("MANUAL");

  const [aiMatches, setAiMatches] = useState<any[]>([]);
  const [aiRecommendation, setAiRecommendation] = useState<any | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [selectedNgoDetails, setSelectedNgoDetails] = useState<NGOOption | null>(null);
  const [selectedListingDetails, setSelectedListingDetails] = useState<SurplusListing | null>(null);
  const [completingListingId, setCompletingListingId] = useState<number | null>(null);
  // ============================================================
  // LOAD DATA
  // ============================================================
  async function loadNGOs() {
    try {
      setLoadingNGOs(true);

      const data = await getAvailableNGOs();

      setNgos(data);
    } catch (err) {
      console.error("Failed to load NGOs:", err);

      setError("Failed to load registered NGOs.");
    } finally {
      setLoadingNGOs(false);
    }
  }

  async function loadData() {
    try {
      setError("");

      const [inventoryData, listingData] =
        await Promise.all([
          getInventory(),
          getSurplusListings(),
        ]);

      setInventory(inventoryData);
      setListings(listingData);
    } catch (err) {
      console.error(err);
      setError("Failed to load surplus listings.");
    } finally {
      setInitialLoading(false);
    }
  }


  useEffect(() => {
    if (tenantId) {
      loadData();
      loadNGOs();
    }
  }, [tenantId]);


  // ============================================================
  // SELECTED INVENTORY
  // ============================================================

  const selectedInventory = useMemo(
    () =>
      inventory.find(
        (item) => item.id === inventoryId
      ),
    [inventory, inventoryId]
  );

  const filteredNGOs = useMemo(() => {
    const search = ngoSearch.trim().toLowerCase();

    if (!search) {
      return ngos;
    }

    return ngos.filter((ngo) => {
      const text = [
        ngo.organization_name,
        ngo.registration_number,
        ngo.full_name,
        ngo.city,
        ngo.state,
        ngo.pincode,
        ngo.description ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return text.includes(search);
    });
  }, [ngos, ngoSearch]);


  const eligibleInventory = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return inventory.filter((item) => {
      if (!item.expiry_date) {
        return false;
      }

      const expiryDate = new Date(`${item.expiry_date}T00:00:00`);

      if (Number.isNaN(expiryDate.getTime())) {
        return false;
      }

      const hasStock = Number(item.quantity) > 0;
      const isNotExpired = expiryDate >= today;

      return hasStock && isNotExpired;
    });
  }, [inventory]);


  // ============================================================
  // INVENTORY -> SURPLUS PREFILL
  // ============================================================

  useEffect(() => {
    const rawInventoryId = searchParams.get("inventoryId");

    if (prefillAppliedRef.current) {
      return;
    }

    if (!rawInventoryId || inventory.length === 0) {
      return;
    }

    const item = inventory.find(
      (currentItem) =>
        Number(currentItem.id) === Number(rawInventoryId)
    );

    if (!item) {
      return;
    }

    const isEligible = eligibleInventory.some(
      (currentItem) => currentItem.id === item.id
    );

    if (!isEligible) {
      return;
    }

    prefillAppliedRef.current = true;
    setInventoryId(item.id);
    setInventorySearch(item.name);
    setInventorySelectorOpen(false);

    setQuantityInput((currentInput) => {
      const available = Number(item.quantity);
      if (!Number.isFinite(available) || available <= 0) {
        return "1";
      }

      const current = Number(currentInput);
      const base = Number.isFinite(current) && current > 0 ? current : 1;

      return String(Math.min(base, available));
    });
  }, [inventory, eligibleInventory, searchParams]);


  // ============================================================
  // SEARCH INVENTORY
  // ============================================================

  const filteredInventory = useMemo(() => {
    const search = inventorySearch.trim().toLowerCase();

    if (!search) {
      return eligibleInventory;
    }

    return eligibleInventory.filter((item) => {
      const name = String(item.name ?? "").toLowerCase();
      const sku = String(item.sku ?? "").toLowerCase();
      const categoryId = String(item.category_id ?? "").toLowerCase();

      return (
        name.includes(search) ||
        sku.includes(search) ||
        categoryId.includes(search)
      );
    });
  }, [eligibleInventory, inventorySearch]);


  // ============================================================
  // EXPIRY HELPERS
  // ============================================================

  function getDaysRemaining(expiryDate: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiry = new Date(`${expiryDate}T00:00:00`);

    if (Number.isNaN(expiry.getTime())) {
      return null;
    }

    const difference =
      expiry.getTime() - today.getTime();

    return Math.ceil(
      difference / (1000 * 60 * 60 * 24)
    );
  }


  function formatExpiryDate(expiryDate: string) {
    const date = new Date(`${expiryDate}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
      return "Unknown";
    }

    return date.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }


  function getExpiryLabel(expiryDate: string) {
    const days = getDaysRemaining(expiryDate);

    if (days === null) {
      return {
        text: "Expiry unavailable",
        className:
          "bg-slate-100 text-slate-600",
      };
    }

    if (days === 0) {
      return {
        text: "Expires today",
        className:
          "bg-amber-50 text-amber-700",
      };
    }

    if (days <= 3) {
      return {
        text: `${days} day${days === 1 ? "" : "s"} left`,
        className:
          "bg-orange-50 text-orange-700",
      };
    }

    return {
      text: `${days} days left`,
      className:
        "bg-emerald-50 text-emerald-700",
    };
  }


  // ============================================================
  // SELECT INVENTORY
  // ============================================================

  function clearAiRecommendation() {
    setAiMatches([]);
    setAiRecommendation(null);

    // Only reset the NGO choice in AI mode. In manual mode the NGO was picked
    // by the user and must not be wiped when they edit other fields.
    if (ngoSelectionMode === "AI") {
      setSelectedNgoId(0);
    }
  }

  function handleInventorySelect(item: Inventory) {
    clearAiRecommendation();
    setInventoryId(item.id);

    setQuantityInput((currentInput) => {
      const available = Number(item.quantity);
      const current = Number(currentInput);

      if (!Number.isFinite(available) || available <= 0) {
        return "1";
      }

      if (!Number.isFinite(current) || current <= 0) {
        return String(Math.min(1, available));
      }

      return String(Math.min(current, available));
    });

    setInventorySearch(item.name);
    setInventorySelectorOpen(false);
    setError("");
  }


  // ============================================================
  // CURRENT LOCATION
  // ============================================================

  function handleUseCurrentLocation() {
    setError("");
    setMessage("");

    if (!navigator.geolocation) {
      setError("Current location is not supported by this browser.");
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude.toFixed(6);
        const longitude = position.coords.longitude.toFixed(6);

        clearAiRecommendation();
        setLocation({ latitude, longitude });
        setGoogleMapsLink(
          `https://www.google.com/maps?q=${latitude},${longitude}`
        );
        setLocating(false);
        setMessage("Current location added to the pickup coordinates and Google Maps link.");
      },
      (geoError) => {
        setLocating(false);

        if (geoError.code === geoError.PERMISSION_DENIED) {
          setError("Location permission was denied. Allow location access in your browser and try again.");
        } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
          setError("Your current location could not be determined. Try again or enter the coordinates manually.");
        } else {
          setError("Could not get your current location. Please try again.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }


  // ============================================================
  // AI PREVIEW
  // ============================================================

  async function handleAiPreview() {
    setError("");
    setMessage("");

    if (!inventoryId || !selectedInventory) {
      setError("Select an eligible inventory item before using AI recommendation.");
      return;
    }

    if (
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      quantity > Number(selectedInventory.quantity)
    ) {
      setError("Enter a valid surplus quantity before using AI recommendation.");
      return;
    }

    if (!location.latitude.trim() || !location.longitude.trim()) {
      setError("Enter latitude and longitude before using AI recommendation.");
      return;
    }

    const latitude = Number(location.latitude);
    const longitude = Number(location.longitude);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      setError("Please provide valid latitude and longitude values.");
      return;
    }

    let availableUntilIso: string | undefined;

    if (availableUntil) {
      const untilDate = new Date(availableUntil);

      if (Number.isNaN(untilDate.getTime())) {
        setError("Please provide a valid 'Available Until' date and time.");
        return;
      }

      availableUntilIso = untilDate.toISOString();
    }

    try {
      setAiLoading(true);

      const result = await previewDonationMatches({
        inventory_id: inventoryId,
        quantity,
        pickup_latitude: latitude,
        pickup_longitude: longitude,
        available_until: availableUntilIso,
      });

      const matches = Array.isArray(result?.matches)
        ? [...result.matches].sort(
          (a: any, b: any) =>
            Number(b.match_score ?? 0) - Number(a.match_score ?? 0)
        )
        : [];

      setAiMatches(matches);
      setAiRecommendation(matches[0] ?? null);
      setSelectedNgoId(0);

      if (matches.length === 0) {
        setMessage("AI could not find a compatible NGO for the current donation details.");
      } else {
        setMessage(
          `AI found ${matches.length} compatible NGO${matches.length === 1 ? "" : "s"}. Review the recommendation and select one before publishing.`
        );
      }
    } catch (err: any) {
      console.error("AI preview failed:", err);
      const detail = err?.response?.data?.detail;
      setError(
        typeof detail === "string"
          ? detail
          : "Failed to generate the AI recommendation."
      );
    } finally {
      setAiLoading(false);
    }
  }


  // ============================================================
  // CREATE LISTING
  // ============================================================

  async function handleSubmit(
    event: FormEvent
  ) {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!tenantId) {
      setError(
        "Business account information is unavailable."
      );
      return;
    }

    if (!selectedNgoId) {
      setError(
        ngoSelectionMode === "AI"
          ? "Use AI Recommend, review the result, and select an NGO before publishing."
          : "Please select an NGO for this surplus donation."
      );
      return;
    }

    if (!inventoryId) {
      setError(
        "Please select an eligible inventory item."
      );
      return;
    }

    if (!selectedInventory) {
      setError(
        "The selected inventory item is no longer available."
      );
      return;
    }

    // ----------------------------------------------------------
    // Frontend expiry protection
    // ----------------------------------------------------------

    if (
      !selectedInventory.expiry_date ||
      getDaysRemaining(selectedInventory.expiry_date) === null
    ) {
      setError(
        "The selected food has an invalid expiry date."
      );
      return;
    }

    const daysRemaining = getDaysRemaining(
      selectedInventory.expiry_date
    );

    if (
      daysRemaining !== null &&
      daysRemaining < 0
    ) {
      setError(
        "Expired food cannot be published as surplus."
      );
      return;
    }

    if (Number(selectedInventory.quantity) <= 0) {
      setError(
        "This inventory item has no available stock."
      );
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError(
        "Quantity must be greater than zero."
      );
      return;
    }

    if (
      quantity > Number(selectedInventory.quantity)
    ) {
      setError(
        `Only ${selectedInventory.quantity} ${selectedInventory.unit} is available in inventory.`
      );
      return;
    }

    if (!location.latitude.trim() || !location.longitude.trim()) {
      setError("Please provide both latitude and longitude.");
      return;
    }

    const latitude = Number(location.latitude);
    const longitude = Number(location.longitude);

    if (
      Number.isNaN(latitude) ||
      Number.isNaN(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      setError("Please provide valid latitude and longitude values.");
      return;
    }

    if (!googleMapsLink.trim()) {
      setError("Please provide the Google Maps pickup link.");
      return;
    }

    try {
      const parsedLink = new URL(googleMapsLink.trim());

      if (
        parsedLink.protocol !== "http:" &&
        parsedLink.protocol !== "https:"
      ) {
        throw new Error("Unsupported protocol");
      }
    } catch {
      setError("Please provide a valid Google Maps link starting with http:// or https://.");
      return;
    }

    if (!availableFrom || !availableUntil) {
      setError(
        "Please provide the pickup availability window."
      );
      return;
    }

    const from = new Date(availableFrom);
    const until = new Date(availableUntil);

    if (
      Number.isNaN(from.getTime()) ||
      Number.isNaN(until.getTime())
    ) {
      setError(
        "Please provide valid pickup dates and times."
      );
      return;
    }

    if (until <= from) {
      setError(
        "Availability end time must be after the start time."
      );
      return;
    }

    if (until <= new Date()) {
      setError(
        "Availability end time must be in the future."
      );
      return;
    }

    // ----------------------------------------------------------
    // Do not allow availability after expiry
    // ----------------------------------------------------------

    const expiryEnd = new Date(
      `${selectedInventory.expiry_date}T23:59:59`
    );

    if (until > expiryEnd) {
      setError(
        `Pickup availability cannot extend beyond the food expiry date (${formatExpiryDate(
          selectedInventory.expiry_date
        )}).`
      );
      return;
    }

    try {
      setLoading(true);

      const createdListing = await createSurplusListing({
        tenant_id: tenantId,
        inventory_id: inventoryId,
        quantity,
        recipient_name: recipientName.trim() || undefined,

        // The existing backend stores pickup_location as a string.
        // We use that field for the submitted Google Maps link while
        // keeping latitude/longitude as dedicated coordinates.
        pickup_location: googleMapsLink.trim(),

        pickup_latitude: latitude,
        pickup_longitude: longitude,

        available_from: from.toISOString(),
        available_until: until.toISOString(),

        note: note.trim() || undefined,

        // Both manual and AI flows publish only after one NGO
        // has been explicitly selected.
        ngo_id: selectedNgoId,
      } as any);

      if (ngoSelectionMode === "AI") {
        // The recommendation was calculated before publishing. Now create
        // the persisted match for the selected NGO and notify that NGO.
        setAiLoading(true);

        const result = await generateDonationMatches(createdListing.id);
        const matches = Array.isArray(result?.matches)
          ? [...result.matches].sort(
            (a: any, b: any) =>
              Number(b.match_score ?? 0) - Number(a.match_score ?? 0)
          )
          : [];

        const selectedMatch = matches.find(
          (match: any) => Number(match.ngo_id) === Number(selectedNgoId)
        );

        if (!selectedMatch?.match_id) {
          throw new Error(
            "The selected AI NGO is no longer available for this listing. Please try the AI recommendation again."
          );
        }

        await selectDonationMatch(selectedMatch.match_id);

        setAiMatches(matches);
        setAiRecommendation(selectedMatch);

        setMessage(
          "Surplus food published successfully and the selected AI-recommended NGO has been notified."
        );
      } else {
        setMessage(
          "Surplus food published successfully and the selected NGO has been notified."
        );
      }

      // Reset form
      setInventoryId(0);
      setQuantityInput("1");
      setSelectedNgoId(0);
      setNgoSearch("");
      setRecipientName("");
      setInventorySearch("");
      setInventorySelectorOpen(false);
      setLocation(initialLocation);
      setGoogleMapsLink("");
      setAvailableFrom("");
      setAvailableUntil("");
      setNote("");
      setAiMatches([]);
      setAiRecommendation(null);

      await loadData();
    } catch (err: any) {
      console.error(err);

      const detail =
        err?.response?.data?.detail;

      setError(
        typeof detail === "string"
          ? detail
          : "Failed to publish surplus listing."
      );
    } finally {
      setLoading(false);
      setAiLoading(false);
    }
  }


  // ============================================================
  // CANCEL LISTING
  // ============================================================

  async function handleCancel(
    listingId: number
  ) {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this surplus listing?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setMessage("");

      await cancelSurplusListing(listingId);

      setMessage(
        "Surplus listing cancelled successfully."
      );

      await loadData();
    } catch (err: any) {
      console.error(err);

      const detail =
        err?.response?.data?.detail;

      setError(
        typeof detail === "string"
          ? detail
          : "Failed to cancel surplus listing."
      );
    }
  }

  const handleMarkDonated = async (
    listing: SurplusListing
  ) => {
    if (completingListingId !== null) {
      return;
    }

    const confirmed = window.confirm(
      `Confirm that donation #${listing.id} has been successfully handed over to the NGO?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setCompletingListingId(listing.id);
      setMessage("");

      await completeSurplusListing(listing.id);

      await loadData();

      if (selectedListingDetails?.id === listing.id) {
        setSelectedListingDetails(null);
      }

      setMessage(
        `Donation #${listing.id} has been marked as donated successfully.`
      );
    } catch (error: any) {
      console.error(
        "Failed to complete donation:",
        error
      );

      const detail =
        error?.response?.data?.detail ||
        "Failed to mark donation as donated.";

      setMessage(detail);
    } finally {
      setCompletingListingId(null);
    }
  };
  // ============================================================
  // FILTER
  // ============================================================

  const filteredListings = useMemo(() => {
    const search = listingSearch.trim().toLowerCase();

    const filtered = listings.filter((listing) => {
      if (
        statusFilter !== "ALL" &&
        listing.donation_status !== statusFilter
      ) {
        return false;
      }

      if (!search) {
        return true;
      }

      const listingInventory = inventory.find(
        (item) => item.id === listing.inventory_id
      );

      const searchableText = [
        String(listing.id),
        String(listing.inventory_id),
        listing.recipient_name ?? "",
        listing.note ?? "",
        listing.pickup_location ?? "",
        listingInventory?.name ?? "",
        listingInventory?.sku ?? "",
        listing.donation_status ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(search);
    });

    return [...filtered].sort((a, b) => {
      const aTime = new Date(a.created_at).getTime();
      const bTime = new Date(b.created_at).getTime();

      return sortOrder === "newest"
        ? bTime - aTime
        : aTime - bTime;
    });
  }, [listings, inventory, statusFilter, listingSearch, sortOrder]);


  // ============================================================
  // LOADING
  // ============================================================

  if (initialLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600" />

          <p className="mt-3 text-sm font-medium text-slate-600">
            Loading surplus listings...
          </p>
        </div>
      </div>
    );
  }


  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">

      {/* ======================================================
          HEADER
      ======================================================= */}

      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">

          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-lg text-emerald-600">
                ♻
              </span>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Surplus Food
              </h1>
            </div>

            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Publish safe, available surplus food so registered
              NGOs can discover and schedule pickups.
            </p>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
              Eligible inventory
            </p>

            <p className="mt-1 text-xl font-bold text-emerald-800">
              {eligibleInventory.length}
            </p>
          </div>

        </div>
      </div>


      {/* ======================================================
          SUCCESS
      ======================================================= */}

      {message && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">

          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700">
            ✓
          </div>

          <p className="pt-1 text-sm font-semibold text-emerald-800">
            {message}
          </p>

        </div>
      )}


      {/* ======================================================
          ERROR
      ======================================================= */}

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">

          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-100 font-bold text-rose-700">
            !
          </div>

          <p className="pt-1 text-sm font-medium text-rose-700">
            {error}
          </p>

        </div>
      )}


      {/* ======================================================
          CREATE LISTING
      ======================================================= */}

      <form
        onSubmit={handleSubmit}
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >

        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-lg text-emerald-600">
              ♻
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-900">
                Create Surplus Listing
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Select safe food from your inventory and make it
                available for redistribution.
              </p>
            </div>

          </div>

        </div>


        <div className="space-y-7 p-5 sm:p-6">

          {/* ==================================================
              INVENTORY
          =================================================== */}

          <div>
            <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">

              <label className="block text-xs font-semibold text-slate-700">
                Food / Inventory Item
              </label>

              <span className="text-[11px] text-slate-400">
                Expired and empty-stock items are hidden
              </span>

            </div>


            {/* SEARCHABLE INVENTORY SELECTOR */}

            <div className="relative">

              <div className="relative">

                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                  🔍
                </span>

                <input
                  type="text"
                  value={inventorySearch}
                  onFocus={() => {
                    setInventorySelectorOpen(true);
                  }}
                  onChange={(event) => {
                    setInventorySearch(
                      event.target.value
                    );

                    setInventorySelectorOpen(
                      true
                    );

                    if (
                      selectedInventory &&
                      event.target.value !==
                      selectedInventory.name
                    ) {
                      clearAiRecommendation();
                      setInventoryId(0);
                    }
                  }}
                  placeholder="Search food name, SKU or category..."
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-10 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />

                {inventorySearch && (
                  <button
                    type="button"
                    onClick={() => {
                      clearAiRecommendation();
                      setInventorySearch("");
                      setInventoryId(0);
                      setInventorySelectorOpen(true);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 transition hover:text-slate-700"
                    aria-label="Clear inventory search"
                  >
                    ✕
                  </button>
                )}

              </div>


              {inventorySelectorOpen && (
                <>

                  <button
                    type="button"
                    aria-label="Close inventory selector"
                    className="fixed inset-0 z-10 cursor-default"
                    onClick={() =>
                      setInventorySelectorOpen(false)
                    }
                  />

                  <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl">

                    {filteredInventory.length === 0 ? (
                      <div className="px-4 py-8 text-center">

                        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-lg">
                          📦
                        </div>

                        <p className="mt-3 text-sm font-semibold text-slate-700">
                          No eligible inventory found
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Try another search or add available
                          non-expired stock to your inventory.
                        </p>

                      </div>
                    ) : (
                      <div className="space-y-1">

                        {filteredInventory.map(
                          (item) => {

                            const expiry =
                              getExpiryLabel(
                                item.expiry_date
                              );

                            const isSelected =
                              item.id ===
                              inventoryId;

                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() =>
                                  handleInventorySelect(
                                    item
                                  )
                                }
                                className={`w-full rounded-xl border p-3 text-left transition ${isSelected
                                  ? "border-emerald-300 bg-emerald-50"
                                  : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                                  }`}
                              >

                                <div className="flex items-start gap-3">

                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-lg">
                                    🍱
                                  </div>

                                  <div className="min-w-0 flex-1">

                                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">

                                      <p className="truncate text-sm font-bold text-slate-800">
                                        {item.name}
                                      </p>

                                      <span
                                        className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-bold ${expiry.className}`}
                                      >
                                        {expiry.text}
                                      </span>

                                    </div>

                                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">

                                      <span>
                                        SKU:{" "}
                                        <strong className="text-slate-600">
                                          {item.sku}
                                        </strong>
                                      </span>

                                      <span>
                                        Category ID:{" "}
                                        <strong className="text-slate-600">
                                          {item.category_id}
                                        </strong>
                                      </span>

                                    </div>

                                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">

                                      <span className="font-semibold text-slate-700">
                                        Available:{" "}
                                        <span className="text-emerald-700">
                                          {item.quantity}{" "}
                                          {item.unit}
                                        </span>
                                      </span>

                                      <span className="text-slate-400">
                                        •
                                      </span>

                                      <span className="text-slate-500">
                                        Expires:{" "}
                                        {formatExpiryDate(
                                          item.expiry_date
                                        )}
                                      </span>

                                    </div>

                                  </div>

                                </div>

                              </button>
                            );
                          }
                        )}

                      </div>
                    )}

                  </div>
                </>
              )}

            </div>


            {/* SELECTED INVENTORY SUMMARY */}

            {selectedInventory && (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {selectedInventory.name}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      SKU: {selectedInventory.sku}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">

                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                      Stock:{" "}
                      {selectedInventory.quantity}{" "}
                      {selectedInventory.unit}
                    </span>

                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                      Expires:{" "}
                      {formatExpiryDate(
                        selectedInventory.expiry_date
                      )}
                    </span>

                  </div>

                </div>

              </div>
            )}

          </div>


          {/* ==================================================
              QUANTITY
          =================================================== */}

          <div className="grid gap-5 md:grid-cols-2">

            <div>

              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Surplus Quantity
              </label>

              <div className="relative">

                <input
                  type="number"
                  min="0.01"
                  max={
                    selectedInventory
                      ? selectedInventory.quantity
                      : undefined
                  }
                  step="0.01"
                  value={quantityInput}
                  onChange={(event) => {
                    clearAiRecommendation();
                    setQuantityInput(event.target.value);
                  }}
                  className="h-11 w-full rounded-lg border border-slate-300 px-3 pr-16 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  required
                />

                {selectedInventory && (
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                    {selectedInventory.unit}
                  </span>
                )}

              </div>

              {selectedInventory &&
                quantityInput !== "" &&
                quantity > Number(selectedInventory.quantity) && (
                  <p className="mt-2 text-xs font-semibold text-rose-600">
                    Quantity exceeds available stock.
                  </p>
                )}

              {selectedInventory && (
                <p className="mt-2 text-xs text-slate-500">
                  Maximum based on current inventory:{" "}
                  <strong>
                    {selectedInventory.quantity}{" "}
                    {selectedInventory.unit}
                  </strong>
                </p>
              )}

            </div>


            <div>

              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Note
              </label>

              <input
                type="text"
                value={note}
                onChange={(event) =>
                  setNote(event.target.value)
                }
                maxLength={1000}
                placeholder="Optional information for NGOs"
                className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />

              <p className="mt-2 text-xs text-slate-400">
                Add useful information such as packaging,
                storage or handling instructions.
              </p>

            </div>

          </div>


          {/* ==================================================
              RECIPIENT / NOTE
          =================================================== */}




          {/* ==================================================
              NGO SELECTION
          =================================================== */}

          <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-900">
                Select NGO
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Choose one registered NGO manually or let the AI matching engine
                recommend a compatible NGO after the listing is published.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setNgoSelectionMode("MANUAL");
                  setAiMatches([]);
                  setAiRecommendation(null);
                  setSelectedNgoId(0);
                  setError("");
                }}
                className={`rounded-xl border px-4 py-3 text-left transition ${ngoSelectionMode === "MANUAL"
                  ? "border-emerald-400 bg-emerald-50"
                  : "border-slate-200 bg-white hover:border-emerald-300"
                  }`}
              >
                <p className="text-sm font-semibold text-slate-800">
                  Select Manually
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Browse registered NGOs and view their requirements.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setNgoSelectionMode("AI");
                  setSelectedNgoId(0);
                  setError("");
                }}
                className={`rounded-xl border px-4 py-3 text-left transition ${ngoSelectionMode === "AI"
                  ? "border-blue-400 bg-blue-50"
                  : "border-slate-200 bg-white hover:border-blue-300"
                  }`}
              >
                <p className="text-sm font-semibold text-slate-800">
                  AI Recommend
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Match food, quantity, location and expiry automatically.
                </p>
              </button>
            </div>

            {ngoSelectionMode === "MANUAL" && (
              <div className="mt-4">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs font-semibold text-slate-700">
                    Registered NGOs
                  </p>
                  <input
                    type="text"
                    value={ngoSearch}
                    onChange={(event) => setNgoSearch(event.target.value)}
                    placeholder="Search NGO..."
                    className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 sm:w-64"
                  />
                </div>

                {loadingNGOs ? (
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-xs text-slate-500">
                    Loading NGOs...
                  </div>
                ) : filteredNGOs.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-xs text-slate-500">
                    No registered active NGOs found.
                  </div>
                ) : (
                  <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                    {filteredNGOs.map((ngo) => {
                      const isSelected = ngo.id === selectedNgoId;

                      return (
                        <div
                          key={ngo.id}
                          className={`flex items-center gap-3 rounded-xl border bg-white px-3 py-3 transition ${isSelected
                            ? "border-emerald-400 bg-emerald-50/70"
                            : "border-slate-200 hover:border-slate-300"
                            }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-800">
                              {ngo.organization_name}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-500">
                              {ngo.city}, {ngo.state}
                              {ngo.requirements?.length != null
                                ? ` • ${ngo.requirements.length} active requirement${ngo.requirements.length === 1 ? "" : "s"
                                }`
                                : ""}
                            </p>
                          </div>

                          {isSelected && (
                            <span className="hidden rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700 sm:inline-flex">
                              Selected
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedNgoDetails(ngo)}
                            className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            View Details
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedNgoId(ngo.id);
                              setError("");
                            }}
                            className={`shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-bold ${isSelected
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-900 text-white hover:bg-slate-800"
                              }`}
                          >
                            {isSelected ? "Selected" : "Select"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {selectedNgoId > 0 && (
                  <div className="mt-3 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">
                        Selected NGO
                      </p>
                      <p className="truncate text-xs font-semibold text-slate-800">
                        {ngos.find((ngo) => ngo.id === selectedNgoId)?.organization_name}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedNgoId(0)}
                      className="text-[11px] font-semibold text-rose-600 hover:text-rose-700"
                    >
                      Change
                    </button>
                  </div>
                )}
              </div>
            )}

            {ngoSelectionMode === "AI" && (
              <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/40 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      AI NGO Recommendation
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Get the recommendation now, select one NGO, then publish.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAiPreview}
                    disabled={aiLoading}
                    className="rounded-lg bg-blue-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {aiLoading ? "Finding NGO..." : "Get AI Recommendation"}
                  </button>
                </div>

                {aiRecommendation && (
                  <div className="mt-3 rounded-lg border border-blue-200 bg-white p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-[9px] font-bold uppercase tracking-wide text-blue-600">
                          Recommended NGO
                        </p>
                        <p className="mt-1 truncate text-sm font-bold text-slate-900">
                          {ngos.find((ngo) => Number(ngo.id) === Number(aiRecommendation.ngo_id))?.organization_name || `NGO #${aiRecommendation.ngo_id}`}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500">
                          Score: <span className="font-bold text-blue-700">{Number(aiRecommendation.match_score ?? 0).toFixed(2)}%</span>
                          {aiRecommendation.distance_km != null && ` • ${Number(aiRecommendation.distance_km).toFixed(2)} km away`}
                        </p>
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const ngo = ngos.find((item) => Number(item.id) === Number(aiRecommendation.ngo_id));
                            if (ngo) setSelectedNgoDetails(ngo);
                          }}
                          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          View Details
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedNgoId(Number(aiRecommendation.ngo_id));
                            setError("");
                          }}
                          className={`rounded-lg px-3 py-1.5 text-[10px] font-bold ${selectedNgoId === Number(aiRecommendation.ngo_id)
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-900 text-white hover:bg-slate-800"
                            }`}
                        >
                          {selectedNgoId === Number(aiRecommendation.ngo_id) ? "Selected" : "Select NGO"}
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {[
                        ["Food", aiRecommendation.food_match_score],
                        ["Quantity", aiRecommendation.quantity_match_score],
                        ["Distance", aiRecommendation.distance_match_score],
                        ["Expiry", aiRecommendation.expiry_match_score],
                      ].map(([label, score]) => (
                        <div key={String(label)} className="rounded-md bg-slate-50 px-2.5 py-2">
                          <p className="text-[9px] font-semibold uppercase text-slate-400">{label}</p>
                          <p className="mt-0.5 text-xs font-bold text-slate-700">{Number(score ?? 0).toFixed(1)}%</p>
                        </div>
                      ))}
                    </div>

                    {aiMatches.length > 1 && (
                      <div className="mt-3 border-t border-slate-100 pt-3">
                        <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Other compatible NGOs</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {aiMatches.filter((match) => Number(match.ngo_id) !== Number(aiRecommendation.ngo_id)).slice(0, 5).map((match) => (
                            <button
                              key={`${match.ngo_id}-${match.requirement_id}`}
                              type="button"
                              onClick={() => {
                                setAiRecommendation(match);
                                setSelectedNgoId(0);
                              }}
                              className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
                            >
                              {ngos.find((ngo) => Number(ngo.id) === Number(match.ngo_id))?.organization_name || `NGO #${match.ngo_id}`}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!aiRecommendation && !aiLoading && (
                  <p className="mt-3 text-[10px] text-slate-500">
                    The recommendation uses the same food, quantity, distance and expiry scoring used by the backend matcher.
                  </p>
                )}
              </div>
            )}
          </section>

          {/* ==================================================
              LOCATION
          =================================================== */}

          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-900">
                Pickup Location
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Use your current location to fill both coordinates and a Google Maps link, or enter them manually.
              </p>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={locating}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span>{locating ? "⌛" : "📍"}</span>
                {locating ? "Getting current location..." : "Use Current Location"}
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={location.latitude}
                  onChange={(event) => {
                    clearAiRecommendation();
                    setLocation((current) => ({
                      ...current,
                      latitude: event.target.value,
                    }));
                  }}
                  placeholder="e.g. 28.4595"
                  className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={location.longitude}
                  onChange={(event) => {
                    clearAiRecommendation();
                    setLocation((current) => ({
                      ...current,
                      longitude: event.target.value,
                    }));
                  }}
                  placeholder="e.g. 77.0266"
                  className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Google Maps Pickup Link
                </label>
                <input
                  type="url"
                  value={googleMapsLink}
                  onChange={(event) => setGoogleMapsLink(event.target.value)}
                  placeholder="https://www.google.com/maps?q=28.4595,77.0266"
                  className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  required
                />
                <p className="mt-1.5 text-[11px] text-slate-400">
                  The Current Location button fills this automatically. You can also paste or edit a Google Maps link here.
                </p>
              </div>
            </div>
          </section>

          {/* ==================================================
              AVAILABILITY
          =================================================== */}

          <div>

            <div className="mb-3">

              <h3 className="text-sm font-bold text-slate-900">
                Pickup Availability
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Select when the food can be collected. The
                availability period cannot extend beyond the
                food's expiry date.
              </p>

            </div>

            <div className="grid gap-5 md:grid-cols-2">

              <div>

                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Available From
                </label>

                <input
                  type="datetime-local"
                  value={availableFrom}
                  max={
                    selectedInventory?.expiry_date
                      ? `${selectedInventory.expiry_date}T23:59`
                      : undefined
                  }
                  onChange={(event) =>
                    setAvailableFrom(
                      event.target.value
                    )
                  }
                  className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  required
                />

              </div>


              <div>

                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Available Until
                </label>

                <input
                  type="datetime-local"
                  value={availableUntil}
                  min={availableFrom || undefined}
                  max={
                    selectedInventory?.expiry_date
                      ? `${selectedInventory.expiry_date}T23:59`
                      : undefined
                  }
                  onChange={(event) => {
                    // The AI preview depends on this value, so it is now stale.
                    clearAiRecommendation();
                    setAvailableUntil(event.target.value);
                  }}
                  className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  required
                />

              </div>

            </div>

          </div>


          {/* ==================================================
              SUBMIT
          =================================================== */}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">

            <p className="text-xs leading-5 text-slate-400">
              {ngoSelectionMode === "AI"
                ? "Get the AI recommendation, select one NGO, then publish the surplus."
                : "Select one active NGO, then publish only non-expired food with available stock."}
            </p>

            <button
              type="submit"
              disabled={
                loading ||
                !selectedInventory ||
                eligibleInventory.length === 0
              }
              className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-emerald-900/10 transition hover:from-emerald-700 hover:to-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Publishing..."
                : "Publish Surplus Food"}
            </button>

          </div>

        </div>

      </form>


      {/* ======================================================
          LISTINGS
      ======================================================= */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">

          <div>

            <h2 className="text-base font-bold text-slate-900">
              My Surplus Listings
            </h2>

            <p className="mt-0.5 text-xs text-slate-500">
              Food published for redistribution, with pickup and recipient details.
            </p>

          </div>


          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <input
              type="text"
              value={listingSearch}
              onChange={(event) =>
                setListingSearch(event.target.value)
              }
              placeholder="Search listings..."
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 sm:w-52"
            />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 sm:w-auto"
            >
              <option value="ALL">All Statuses</option>
              <option value="PUBLISHED">Published</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="PICKUP_SCHEDULED">Pickup Scheduled</option>
              <option value="READY_FOR_PICKUP">Ready for Pickup</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <select
              value={sortOrder}
              onChange={(event) =>
                setSortOrder(
                  event.target.value as "newest" | "oldest"
                )
              }
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 sm:w-auto"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>

        </div>


        {filteredListings.length === 0 ? (

          <div className="px-6 py-14 text-center">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-xl">
              ♻
            </div>

            <h3 className="mt-4 text-sm font-semibold text-slate-800">
              No surplus listings
            </h3>

            <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
              Published surplus food will appear here.
            </p>

          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full min-w-[900px] text-left">

              <thead className="border-b border-slate-200 bg-slate-50">

                <tr>

                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Food
                  </th>

                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Quantity
                  </th>

                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Available
                  </th>

                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Pickup
                  </th>

                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Status
                  </th>

                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Action
                  </th>

                </tr>

              </thead>


              <tbody className="divide-y divide-slate-100">

                {filteredListings.map(
                  (listing) => {

                    const status =
                      listing.donation_status.toUpperCase();

                    const canCancel =
                      status === "PUBLISHED";

                    const listingInventory =
                      inventory.find(
                        (item) =>
                          item.id ===
                          listing.inventory_id
                      );

                    return (
                      <tr
                        key={listing.id}
                        onClick={() => setSelectedListingDetails(listing)}
                        className="cursor-pointer transition hover:bg-slate-50"
                      >

                        <td className="px-6 py-4">

                          <p className="text-sm font-semibold text-slate-800">
                            {listingInventory?.name ||
                              `Inventory #${listing.inventory_id}`}
                          </p>

                          {listingInventory && (
                            <p className="mt-0.5 text-xs text-slate-400">
                              SKU:{" "}
                              {listingInventory.sku}
                            </p>
                          )}



                          {listing.recipient_name && (
                            <p className="mt-1 text-xs text-slate-500">
                              Recipient:{" "}
                              <span className="font-medium text-slate-700">
                                {listing.recipient_name}
                              </span>
                            </p>
                          )}

                        </td>


                        <td className="px-6 py-4">

                          <p className="text-sm font-bold text-slate-800">
                            {listing.quantity}{" "}
                            {listingInventory?.unit || ""}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-400">
                            Remaining:{" "}
                            {listing.remaining_quantity}{" "}
                            {listingInventory?.unit || ""}
                          </p>

                        </td>


                        <td className="px-6 py-4">

                          <p className="text-xs text-slate-700">
                            {listing.available_from
                              ? new Date(
                                listing.available_from
                              ).toLocaleString()
                              : "—"}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            to{" "}
                            {listing.available_until
                              ? new Date(
                                listing.available_until
                              ).toLocaleString()
                              : "—"}
                          </p>

                        </td>


                        <td className="px-6 py-4">

                          <p className="max-w-xs truncate text-xs font-medium text-slate-700">
                            {listing.pickup_location ||
                              "Not specified"}
                          </p>

                          {listing.pickup_latitude != null &&
                            listing.pickup_longitude != null && (
                              <p className="mt-1 text-[10px] text-slate-400">
                                📍 Coordinates available
                              </p>
                            )}

                        </td>


                        <td className="px-6 py-4">

                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${status === "PUBLISHED"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : status === "PICKUP_SCHEDULED"
                                ? "border-blue-200 bg-blue-50 text-blue-700"
                                : status === "COMPLETED"
                                  ? "border-teal-200 bg-teal-50 text-teal-700"
                                  : status === "CANCELLED"
                                    ? "border-rose-200 bg-rose-50 text-rose-700"
                                    : "border-slate-200 bg-slate-50 text-slate-700"
                              }`}
                          >
                            {status.replaceAll(
                              "_",
                              " "
                            )}
                          </span>

                        </td>


                        <td className="px-6 py-4">

                          <div className="flex items-center gap-2">
                            {listing.donation_status === "PUBLISHED" && (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleCancel(listing.id);
                                }}
                                className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                              >
                                Cancel
                              </button>
                            )}

                            {(listing.donation_status === "PICKUP_SCHEDULED" ||
                              listing.donation_status === "READY_FOR_PICKUP") && (
                                <button
                                  type="button"
                                  disabled={completingListingId === listing.id}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleMarkDonated(listing);
                                  }}
                                  className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {completingListingId === listing.id
                                    ? "Completing..."
                                    : "Donated"}
                                </button>
                              )}

                            {listing.donation_status === "COMPLETED" && (
                              <span className="text-sm font-medium text-green-600">
                                Completed
                              </span>
                            )}

                            {listing.donation_status !== "PUBLISHED" &&
                              listing.donation_status !== "PICKUP_SCHEDULED" &&
                              listing.donation_status !== "READY_FOR_PICKUP" &&
                              listing.donation_status !== "COMPLETED" && (
                                <span className="text-gray-400">
                                  —
                                </span>
                              )}
                          </div>

                        </td>

                      </tr>
                    );
                  }
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>


      {/* ==================================================
          NGO DETAILS MODAL
      =================================================== */}
      {selectedNgoDetails && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => setSelectedNgoDetails(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">
                  NGO Details
                </p>
                <h3 className="mt-1 text-lg font-bold text-slate-900">
                  {selectedNgoDetails.organization_name}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Registration: {selectedNgoDetails.registration_number || "—"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNgoDetails(null)}
                className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-[10px] font-semibold uppercase text-slate-400">
                  Contact Person
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {selectedNgoDetails.full_name || "—"}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-[10px] font-semibold uppercase text-slate-400">
                  Phone
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {selectedNgoDetails.phone || "—"}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 sm:col-span-2">
                <p className="text-[10px] font-semibold uppercase text-slate-400">
                  Address
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {selectedNgoDetails.address || "—"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedNgoDetails.city || "—"},{" "}
                  {selectedNgoDetails.state || "—"}{" "}
                  {selectedNgoDetails.pincode || ""}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-[10px] font-semibold uppercase text-slate-400">
                  Service Radius
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {selectedNgoDetails.service_radius_km ?? "—"} km
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-[10px] font-semibold uppercase text-slate-400">
                  Active Requirements
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {selectedNgoDetails.requirements?.length ?? 0}
                </p>
              </div>
            </div>

            {selectedNgoDetails.description && (
              <div className="mt-4">
                <p className="text-xs font-bold text-slate-700">Description</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {selectedNgoDetails.description}
                </p>
              </div>
            )}

            <div className="mt-5">
              <p className="text-xs font-bold text-slate-700">
                Active Requirements
              </p>
              {selectedNgoDetails.requirements?.length ? (
                <div className="mt-2 space-y-2">
                  {selectedNgoDetails.requirements.map((requirement) => (
                    <div
                      key={requirement.id}
                      className="rounded-lg border border-slate-200 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-800">
                          {requirement.food_name}
                        </p>
                        <span className="text-xs font-semibold text-slate-500">
                          {requirement.quantity_required} {requirement.unit}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {requirement.food_category || "No category"} • Required by{" "}
                        {new Date(requirement.required_by).toLocaleDateString()}
                        {requirement.max_distance_km != null &&
                          ` • Max ${requirement.max_distance_km} km`}
                      </p>
                      {requirement.notes && (
                        <p className="mt-1 text-[11px] text-slate-500">
                          {requirement.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-slate-500">
                  No active requirements listed.
                </p>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedNgoDetails(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedNgoId(selectedNgoDetails.id);
                  setNgoSelectionMode("MANUAL");
                  setSelectedNgoDetails(null);
                }}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
              >
                Select This NGO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================
          SURPLUS LISTING DETAILS MODAL
      =================================================== */}
      {selectedListingDetails && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => setSelectedListingDetails(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            {(() => {
              const detailListing = selectedListingDetails;
              const detailInventory = inventory.find(
                (item) => item.id === detailListing.inventory_id
              );

              return (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">
                        Surplus Listing {detailListing.id}
                      </p>
                      <h3 className="mt-1 text-lg font-bold text-slate-900">
                        {detailInventory?.name ||
                          `Inventory ${detailListing.inventory_id}`}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedListingDetails(null)}
                      className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-[10px] font-semibold uppercase text-slate-400">
                        Quantity
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-800">
                        {detailListing.quantity} {detailInventory?.unit || ""}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Remaining: {detailListing.remaining_quantity}{" "}
                        {detailInventory?.unit || ""}
                      </p>
                    </div>

                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-[10px] font-semibold uppercase text-slate-400">
                        Status
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-800">
                        {detailListing.donation_status.replaceAll("_", " ")}
                      </p>
                    </div>

                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-[10px] font-semibold uppercase text-slate-400">
                        Expiry
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {detailInventory?.expiry_date || "—"}
                      </p>
                    </div>

                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-[10px] font-semibold uppercase text-slate-400">
                        SKU
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {detailInventory?.sku || "—"}
                      </p>
                    </div>

                    <div className="rounded-lg bg-slate-50 p-3 sm:col-span-2">
                      <p className="text-[10px] font-semibold uppercase text-slate-400">
                        Pickup Location
                      </p>
                      <p className="mt-1 break-all text-sm text-slate-700">
                        {detailListing.pickup_location || "—"}
                      </p>
                    </div>

                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-[10px] font-semibold uppercase text-slate-400">
                        Latitude
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {detailListing.pickup_latitude ?? "—"}
                      </p>
                    </div>

                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-[10px] font-semibold uppercase text-slate-400">
                        Longitude
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {detailListing.pickup_longitude ?? "—"}
                      </p>
                    </div>

                    <div className="rounded-lg bg-slate-50 p-3 sm:col-span-2">
                      <p className="text-[10px] font-semibold uppercase text-slate-400">
                        Availability
                      </p>
                      <p className="mt-1 text-sm text-slate-700">
                        {detailListing.available_from
                          ? new Date(detailListing.available_from).toLocaleString()
                          : "—"}{" "}
                        →{" "}
                        {detailListing.available_until
                          ? new Date(detailListing.available_until).toLocaleString()
                          : "—"}
                      </p>
                    </div>
                  </div>

                  {detailListing.note && (
                    <div className="mt-4">
                      <p className="text-xs font-bold text-slate-700">Note</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {detailListing.note}
                      </p>
                    </div>
                  )}

                  {detailListing.pickup_location?.startsWith("http") && (
                    <a
                      href={detailListing.pickup_location}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
                    >
                      Open Google Maps
                    </a>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

    </div>
  );
}


export default SurplusListings;