import api from "./api";

export interface Pickup {
  id: number;
  donation_id: number;
  match_id: number;
  ngo_id: number;

  scheduled_start: string | null;
  scheduled_end: string | null;
  pickup_location: string | null;

  status: string;
  confirmation_status: string;
  ngo_confirmation: string;
  business_confirmation: string;

  notes: string | null;
  created_at: string | null;

  // Donation information
  donation_quantity?: number | null;
  committed_quantity?: number | null;
  donation_unit?: string | null;
  donation_status?: string | null;

  // Donor information
  donor_organization_name?: string | null;
  donor_owner_name?: string | null;
  donor_owner_phone?: string | null;
  donor_owner_email?: string | null;

  // NGO information
  ngo_organization_name?: string | null;
  ngo_contact_name?: string | null;
  ngo_contact_phone?: string | null;
  ngo_contact_email?: string | null;

  // Pickup person information
  pickup_person_name?: string | null;
  pickup_person_phone?: string | null;
  pickup_person_email?: string | null;
}

export interface SchedulePickupData {
  match_id: number;
  scheduled_start: string;
  scheduled_end: string;
  notes?: string;
}

export async function schedulePickup(
  data: SchedulePickupData
): Promise<Pickup> {
  const response = await api.post<Pickup>("/pickups/", data);
  return response.data;
}

export async function getNGOPickups(): Promise<Pickup[]> {
  const response = await api.get<Pickup[]>("/pickups/ngo");
  return response.data;
}

export async function getBusinessPickups(): Promise<Pickup[]> {
  const response = await api.get<Pickup[]>("/pickups/business");
  return response.data;
}

export async function confirmNGOPickup(
  pickupId: number
): Promise<Pickup> {
  const response = await api.patch<Pickup>(
    `/pickups/${pickupId}/ngo-confirm`
  );

  return response.data;
}

export async function confirmBusinessPickup(
  pickupId: number
): Promise<Pickup> {
  const response = await api.patch<Pickup>(
    `/pickups/${pickupId}/business-confirm`
  );

  return response.data;
}

export async function cancelNGOPickup(
  pickupId: number
): Promise<Pickup> {
  const response = await api.patch<Pickup>(
    `/pickups/${pickupId}/ngo-cancel`
  );

  return response.data;
}

export async function cancelBusinessPickup(
  pickupId: number
): Promise<Pickup> {
  const response = await api.patch<Pickup>(
    `/pickups/${pickupId}/business-cancel`
  );

  return response.data;
}

export async function completePickup(
  pickupId: number
): Promise<Pickup> {
  const response = await api.patch<Pickup>(
    `/pickups/${pickupId}/complete`
  );

  return response.data;
}