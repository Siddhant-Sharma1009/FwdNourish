import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Search,
  ChevronRight,
  ChevronLeft,
  Check,
  Sparkles,
  Building2,
  AlertTriangle,
  Clock,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";

import type {
  DonationInventoryItem,
  LocationData,
  NGOOption,
  AIRecommendedNGO,
} from "../../types/donation";

import { getInventory } from "../../services/inventoryApi";

import {
  createDonation,
} from "../../services/donationApi";

import {
  getAvailableNGOs,
  getAIRecommendedNGOs,
} from "../../services/ngoApi";

import LocationSelector from "../../components/common/LocationSelector";


type SelectionMode =
  | "MANUAL"
  | "AI"
  | null;


const initialLocation: LocationData = {
  address: "",
  city: "",
  state: "",
  pincode: "",
  latitude: "",
  longitude: "",
};


function getDaysRemaining(
  expiryDate: string
): number {
  const today = new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  const expiry = new Date(
    expiryDate
  );

  expiry.setHours(
    0,
    0,
    0,
    0
  );

  return Math.ceil(
    (
      expiry.getTime() -
      today.getTime()
    ) /
      (1000 * 60 * 60 * 24)
  );
}


function getRisk(
  item: DonationInventoryItem
) {
  const days = getDaysRemaining(
    item.expiry_date
  );

  if (days < 0) {
    return "EXPIRED";
  }

  if (
    days <=
    item.expiry_threshold_days
  ) {
    return "CRITICAL";
  }

  if (days <= 7) {
    return "EXPIRING_SOON";
  }

  return "SAFE";
}


export default function CreateDonation() {
  const { user } = useAuth();

  const tenantId =
    user?.tenant_id;

  const [step, setStep] =
    useState(1);

  const [inventory, setInventory] =
    useState<DonationInventoryItem[]>(
      []
    );

  const [ngos, setNGOs] =
    useState<NGOOption[]>([]);

  const [aiRecommendations, setAIRecommendations] =
    useState<AIRecommendedNGO[]>(
      []
    );

  const [selectedInventoryId, setSelectedInventoryId] =
    useState<number | null>(
      null
    );

  const [quantity, setQuantity] =
    useState(1);

  const [location, setLocation] =
    useState<LocationData>(
      initialLocation
    );

  const [availableFrom, setAvailableFrom] =
    useState("");

  const [availableUntil, setAvailableUntil] =
    useState("");

  const [selectionMode, setSelectionMode] =
    useState<SelectionMode>(
      null
    );

  const [selectedNGOId, setSelectedNGOId] =
    useState<number | null>(
      null
    );

  const [selectedMatchId, setSelectedMatchId] =
    useState<number | null>(
      null
    );

  const [note, setNote] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [riskFilter, setRiskFilter] =
    useState<
      "ALL" |
      "CRITICAL" |
      "EXPIRING_SOON" |
      "SAFE"
    >("ALL");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");


  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        const [
          inventoryData,
          ngoData,
        ] = await Promise.all([
          getInventory(),
          getAvailableNGOs(),
        ]);

        setInventory(
          inventoryData
        );

        setNGOs(
          ngoData
        );

      } catch (err) {
        console.error(err);

        setError(
          "Failed to load donation data."
        );
      } finally {
        setLoading(false);
      }
    }

    if (tenantId) {
      load();
    }
  }, [tenantId]);


  /*
   * Only inventory that is actually
   * eligible for donation is shown.
   */
  const eligibleInventory =
    useMemo(() => {

      return inventory.filter(
        (item) => {

          const deleted =
            item.is_deleted === true;

          const expired =
            getDaysRemaining(
              item.expiry_date
            ) < 0;

          const zeroQuantity =
            item.quantity <= 0;

          return (
            !deleted &&
            !expired &&
            !zeroQuantity
          );
        }
      );

    }, [inventory]);


  const filteredInventory =
    useMemo(() => {

      return eligibleInventory.filter(
        (item) => {

          const matchesSearch =
            item.name
              .toLowerCase()
              .includes(
                search
                  .toLowerCase()
              ) ||
            item.sku
              .toLowerCase()
              .includes(
                search
                  .toLowerCase()
              );

          const risk =
            getRisk(item);

          const matchesRisk =
            riskFilter === "ALL" ||
            risk === riskFilter;

          return (
            matchesSearch &&
            matchesRisk
          );
        }
      );

    }, [
      eligibleInventory,
      search,
      riskFilter,
    ]);


  const selectedInventory =
    inventory.find(
      (item) =>
        item.id ===
        selectedInventoryId
    );


  function selectInventory(
    item: DonationInventoryItem
  ) {
    setSelectedInventoryId(
      item.id
    );

    setQuantity(1);

    setError("");
  }


  function nextStep() {

    setError("");

    if (step === 1) {

      if (!selectedInventory) {
        setError(
          "Please select a food item."
        );

        return;
      }

      if (
        quantity <= 0 ||
        quantity >
          selectedInventory.quantity
      ) {
        setError(
          "Please enter a valid donation quantity."
        );

        return;
      }
    }


    if (step === 2) {

      if (
        !location.address.trim()
      ) {
        setError(
          "Please provide the pickup location."
        );

        return;
      }
    }


    if (step === 3) {

      if (
        !availableFrom ||
        !availableUntil
      ) {
        setError(
          "Please provide the availability window."
        );

        return;
      }

      const from =
        new Date(
          availableFrom
        );

      const until =
        new Date(
          availableUntil
        );

      if (until <= from) {
        setError(
          "End time must be after start time."
        );

        return;
      }

      if (selectedInventory) {

        const expiry =
          new Date(
            selectedInventory.expiry_date
          );

        expiry.setHours(
          23,
          59,
          59,
          999
        );

        if (until > expiry) {
          setError(
            "Pickup availability cannot extend beyond the food expiry date."
          );

          return;
        }
      }
    }


    if (step === 4) {

      if (!selectionMode) {
        setError(
          "Please choose manual NGO selection or AI-assisted selection."
        );

        return;
      }

      if (
        selectionMode ===
          "MANUAL" &&
        !selectedNGOId
      ) {
        setError(
          "Please select an NGO."
        );

        return;
      }

      if (
        selectionMode === "AI" &&
        !selectedMatchId
      ) {
        setError(
          "Please select one of the AI-suggested NGOs."
        );

        return;
      }
    }


    setStep(
      (current) =>
        Math.min(
          current + 1,
          5
        )
    );
  }


  function previousStep() {

    setError("");

    setStep(
      (current) =>
        Math.max(
          current - 1,
          1
        )
    );
  }


  async function loadAIRecommendations() {

    setError("");

    /*
     * AI recommendations are generated
     * after the donation exists.
     *
     * We therefore create the donation first
     * in the final publish step if AI mode is
     * selected.
     */
  }


  async function submitDonation() {

    setError("");
    setSuccess("");

    if (!tenantId) {
      setError(
        "Business account information is unavailable."
      );

      return;
    }

    if (!selectedInventory) {
      setError(
        "Please select an inventory item."
      );

      return;
    }

    if (!selectionMode) {
      setError(
        "Please select an NGO selection method."
      );

      return;
    }

    try {

      setLoading(true);

      const result =
        await createDonation({
          tenant_id:
            tenantId,

          inventory_id:
            selectedInventory.id,

          quantity,

          pickup_location:
            location.address,

          pickup_latitude:
            location.latitude
              ? Number(
                  location.latitude
                )
              : undefined,

          pickup_longitude:
            location.longitude
              ? Number(
                  location.longitude
                )
              : undefined,

          available_from:
            new Date(
              availableFrom
            ).toISOString(),

          available_until:
            new Date(
              availableUntil
            ).toISOString(),

          note:
            note.trim() ||
            undefined,

          ngo_id:
            selectionMode ===
            "MANUAL"
              ? selectedNGOId ??
                undefined
              : undefined,

          match_id:
            selectionMode ===
            "AI"
              ? selectedMatchId ??
                undefined
              : undefined,
        });


      /*
       * If AI mode was used, refresh
       * recommendations against the newly
       * created donation.
       */
      if (
        selectionMode === "AI"
      ) {
        try {
          const recommendations =
            await getAIRecommendedNGOs(
              result.id
            );

          setAIRecommendations(
            recommendations
          );
        } catch {
          /*
           * Donation itself was already
           * created successfully.
           */
        }
      }


      setSuccess(
        "Donation published successfully."
      );

      setStep(5);

    } catch (err: any) {

      console.error(err);

      const detail =
        err?.response?.data
          ?.detail;

      setError(
        typeof detail ===
          "string"
          ? detail
          : "Failed to publish donation."
      );

    } finally {
      setLoading(false);
    }
  }


  return (
    <div className="min-h-full bg-slate-50 p-6">

      <div className="mx-auto max-w-6xl">

        {/* HEADER */}

        <div className="mb-6">

          <h1 className="text-2xl font-bold text-slate-900">
            Create Food Donation
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Share surplus food with registered NGOs.
          </p>

        </div>


        {/* STEPS */}

        <div className="mb-6 grid grid-cols-5 gap-2">

          {[
            "Food",
            "Location",
            "Availability",
            "NGO",
            "Review",
          ].map(
            (
              label,
              index
            ) => {

              const number =
                index + 1;

              const active =
                number === step;

              const completed =
                number < step;

              return (
                <div
                  key={label}
                  className={`rounded-lg border p-3 text-center ${
                    active
                      ? "border-emerald-500 bg-emerald-50"
                      : completed
                      ? "border-emerald-200 bg-white"
                      : "border-slate-200 bg-white"
                  }`}
                >

                  <div className="text-xs font-semibold">
                    STEP {number}
                  </div>

                  <div className="mt-1 text-sm font-medium">
                    {label}
                  </div>

                </div>
              );
            }
          )}

        </div>


        {error && (
          <div className="mb-5 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}


        {success && (
          <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {success}
          </div>
        )}


        {/* STEP 1 */}

        {step === 1 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="mb-5">

              <h2 className="text-lg font-bold">
                Select food items
              </h2>

              <p className="text-sm text-slate-500">
                Expired, deleted and zero-stock
                items are automatically excluded.
              </p>

            </div>


            <div className="mb-5 flex flex-col gap-3 md:flex-row">

              <div className="relative flex-1">

                <Search
                  className="absolute left-3 top-3 h-4 w-4 text-slate-400"
                />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search food or SKU..."
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-500"
                />

              </div>

              <select
                value={riskFilter}
                onChange={(event) =>
                  setRiskFilter(
                    event.target.value as any
                  )
                }
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
              >
                <option value="ALL">
                  All items
                </option>

                <option value="CRITICAL">
                  🔴 Critical
                </option>

                <option value="EXPIRING_SOON">
                  🟠 Expiring Soon
                </option>

                <option value="SAFE">
                  🟢 Safe
                </option>

              </select>

            </div>


            <div className="space-y-3">

              {filteredInventory.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
                  No eligible inventory items found.
                </div>
              )}


              {filteredInventory.map(
                (item) => {

                  const risk =
                    getRisk(item);

                  const days =
                    getDaysRemaining(
                      item.expiry_date
                    );

                  const selected =
                    selectedInventoryId ===
                    item.id;

                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() =>
                        selectInventory(item)
                      }
                      className={`w-full rounded-xl border p-4 text-left transition ${
                        selected
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-slate-200 hover:border-emerald-300"
                      }`}
                    >

                      <div className="flex items-center justify-between">

                        <div>

                          <div className="flex items-center gap-2">

                            <span className="font-semibold">
                              {item.name}
                            </span>

                            {risk ===
                              "CRITICAL" && (
                              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                                CRITICAL
                              </span>
                            )}

                            {risk ===
                              "EXPIRING_SOON" && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                                EXPIRING SOON
                              </span>
                            )}

                          </div>

                          <p className="mt-1 text-xs text-slate-500">
                            SKU: {item.sku}
                          </p>

                        </div>


                        <div className="text-right">

                          <p className="font-semibold">
                            {item.quantity}{" "}
                            {item.unit}
                          </p>

                          <p className="text-xs text-slate-500">
                            {days === 0
                              ? "Expires today"
                              : `${days} day${
                                  days === 1
                                    ? ""
                                    : "s"
                                } remaining`}
                          </p>

                        </div>

                      </div>

                    </button>
                  );
                }
              )}

            </div>


            {selectedInventory && (
              <div className="mt-5 rounded-xl bg-slate-50 p-4">

                <label className="text-sm font-semibold">
                  Donation quantity
                </label>

                <div className="mt-2 flex items-center gap-3">

                  <input
                    type="number"
                    min="0.01"
                    max={
                      selectedInventory.quantity
                    }
                    step="0.01"
                    value={quantity}
                    onChange={(event) =>
                      setQuantity(
                        Number(
                          event.target.value
                        )
                      )
                    }
                    className="w-40 rounded-lg border border-slate-300 px-3 py-2"
                  />

                  <span className="text-sm text-slate-500">
                    {selectedInventory.unit}
                  </span>

                </div>

              </div>
            )}

          </section>
        )}


        {/* STEP 2 */}

        {step === 2 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <h2 className="text-lg font-bold">
              Pickup location
            </h2>

            <p className="mb-5 text-sm text-slate-500">
              Where should the NGO collect the donated food?
            </p>

            <LocationSelector
              value={location}
              onChange={setLocation}
            />

          </section>
        )}


        {/* STEP 3 */}

        {step === 3 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <h2 className="text-lg font-bold">
              Pickup availability
            </h2>

            <p className="mb-5 text-sm text-slate-500">
              The availability window must finish before
              the selected food expires.
            </p>


            {selectedInventory && (
              <div className="mb-5 flex items-center gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">

                <Clock className="h-5 w-5" />

                <div>
                  <strong>
                    {selectedInventory.name}
                  </strong>

                  <div>
                    Expires on{" "}
                    {new Date(
                      selectedInventory.expiry_date
                    ).toLocaleDateString(
                      "en-IN"
                    )}
                  </div>

                </div>

              </div>
            )}


            <div className="grid gap-5 md:grid-cols-2">

              <div>

                <label className="text-sm font-semibold">
                  Available from
                </label>

                <input
                  type="datetime-local"
                  value={availableFrom}
                  onChange={(event) =>
                    setAvailableFrom(
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5"
                />

              </div>


              <div>

                <label className="text-sm font-semibold">
                  Available until
                </label>

                <input
                  type="datetime-local"
                  value={availableUntil}
                  onChange={(event) =>
                    setAvailableUntil(
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5"
                />

              </div>

            </div>

          </section>
        )}


        {/* STEP 4 */}

        {step === 4 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <h2 className="text-lg font-bold">
              Choose NGO
            </h2>

            <p className="mb-5 text-sm text-slate-500">
              You can select an NGO yourself or let the AI
              matching engine suggest suitable NGOs.
            </p>


            <div className="grid gap-4 md:grid-cols-2">

              {/* MANUAL */}

              <button
                type="button"
                onClick={() => {
                  setSelectionMode(
                    "MANUAL"
                  );

                  setSelectedMatchId(
                    null
                  );
                }}
                className={`rounded-xl border p-5 text-left ${
                  selectionMode ===
                  "MANUAL"
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-slate-200"
                }`}
              >

                <Building2 className="h-6 w-6 text-emerald-600" />

                <h3 className="mt-3 font-bold">
                  Select NGO manually
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Choose a specific registered NGO yourself.
                </p>

              </button>


              {/* AI */}

              <button
                type="button"
                onClick={() => {
                  setSelectionMode(
                    "AI"
                  );

                  setSelectedNGOId(
                    null
                  );
                }}
                className={`rounded-xl border p-5 text-left ${
                  selectionMode === "AI"
                    ? "border-violet-500 bg-violet-50"
                    : "border-slate-200"
                }`}
              >

                <Sparkles className="h-6 w-6 text-violet-600" />

                <h3 className="mt-3 font-bold">
                  AI-assisted selection
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Let AI compare food, quantity, distance
                  and expiry requirements.
                </p>

              </button>

            </div>


            {/* MANUAL NGO LIST */}

            {selectionMode ===
              "MANUAL" && (
              <div className="mt-6">

                <h3 className="mb-3 font-semibold">
                  Available NGOs
                </h3>

                <div className="space-y-3">

                  {ngos.map(
                    (ngo) => {

                      const selected =
                        selectedNGOId ===
                        ngo.id;

                      return (
                        <button
                          type="button"
                          key={ngo.id}
                          onClick={() =>
                            setSelectedNGOId(
                              ngo.id
                            )
                          }
                          className={`w-full rounded-xl border p-4 text-left ${
                            selected
                              ? "border-emerald-500 bg-emerald-50"
                              : "border-slate-200"
                          }`}
                        >

                          <div className="flex items-center justify-between">

                            <div>

                              <p className="font-semibold">
                                {
                                  ngo.organization_name
                                }
                              </p>

                              <p className="text-sm text-slate-500">
                                {
                                  ngo.address
                                }
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                Contact:{" "}
                                {ngo.full_name}{" "}
                                ·{" "}
                                {ngo.phone}
                              </p>

                            </div>

                            {selected && (
                              <Check className="h-5 w-5 text-emerald-600" />
                            )}

                          </div>

                        </button>
                      );
                    }
                  )}

                </div>

              </div>
            )}


            {/* AI */}

            {selectionMode ===
              "AI" && (
              <div className="mt-6">

                <button
                  type="button"
                  disabled
                  className="mb-5 flex items-center gap-2 rounded-lg bg-violet-100 px-4 py-2 text-sm font-semibold text-violet-700"
                >
                  <Sparkles className="h-4 w-4" />
                  AI recommendations will be generated
                  after the donation listing is created.
                </button>

                <div className="rounded-xl border border-violet-200 bg-violet-50 p-5">

                  <p className="text-sm text-violet-800">
                    The AI engine will analyze:
                  </p>

                  <ul className="mt-3 grid gap-2 text-sm text-violet-700 md:grid-cols-2">

                    <li>✓ Food type</li>
                    <li>✓ Quantity requirement</li>
                    <li>✓ Distance</li>
                    <li>✓ NGO service radius</li>
                    <li>✓ Expiry</li>
                    <li>✓ Required-by date</li>

                  </ul>

                </div>

                <p className="mt-4 text-sm text-slate-500">
                  On the next backend step, we will make the
                  AI suggestions available here before final
                  publication.
                </p>

              </div>
            )}

          </section>
        )}


        {/* STEP 5 */}

        {step === 5 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <h2 className="text-lg font-bold">
              Review donation
            </h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">

              <div className="rounded-xl bg-slate-50 p-4">

                <p className="text-xs font-semibold uppercase text-slate-400">
                  Food
                </p>

                <p className="mt-1 font-bold">
                  {selectedInventory?.name}
                </p>

                <p className="text-sm text-slate-500">
                  {quantity}{" "}
                  {selectedInventory?.unit}
                </p>

              </div>


              <div className="rounded-xl bg-slate-50 p-4">

                <p className="text-xs font-semibold uppercase text-slate-400">
                  Pickup
                </p>

                <p className="mt-1 font-semibold">
                  {location.address}
                </p>

                <p className="text-sm text-slate-500">
                  {new Date(
                    availableFrom
                  ).toLocaleString(
                    "en-IN"
                  )}
                  {" — "}
                  {new Date(
                    availableUntil
                  ).toLocaleString(
                    "en-IN"
                  )}
                </p>

              </div>

            </div>


            <div className="mt-5">

              <label className="text-sm font-semibold">
                Note
              </label>

              <textarea
                value={note}
                onChange={(event) =>
                  setNote(
                    event.target.value
                  )
                }
                rows={4}
                placeholder="Add any useful information for the NGO..."
                className="mt-2 w-full rounded-lg border border-slate-300 p-3"
              />

            </div>


            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">

              <div className="flex gap-2">

                <AlertTriangle className="h-5 w-5 shrink-0" />

                <p>
                  Please verify the food quantity, pickup
                  location and availability window before
                  publishing.
                </p>

              </div>

            </div>

          </section>
        )}


        {/* NAVIGATION */}

        <div className="mt-6 flex items-center justify-between">

          <button
            type="button"
            disabled={
              step === 1 ||
              loading
            }
            onClick={
              previousStep
            }
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>


          {step < 5 ? (

            <button
              type="button"
              disabled={loading}
              onClick={nextStep}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Continue
              <ChevronRight className="h-4 w-4" />
            </button>

          ) : (

            <button
              type="button"
              disabled={loading}
              onClick={submitDonation}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading
                ? "Publishing..."
                : "Publish Donation"}

              <Check className="h-4 w-4" />

            </button>

          )}

        </div>

      </div>

    </div>
  );
}