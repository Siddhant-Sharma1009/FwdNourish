export interface SurplusListing {
  id: number;
  tenant_id: number;
  inventory_id: number;
  quantity: number;
  committed_quantity: number;
  remaining_quantity: number;
  recipient_name: string | null;

  pickup_location: string | null;
  pickup_latitude: number | null;
  pickup_longitude: number | null;

  available_from: string | null;
  available_until: string | null;

  donation_status: string;
  note: string | null;
  donated_at: string | null;
  created_at: string;

  ngo_id?: number | null;
  ngo_name?: string | null;
  ngo_contact_name?: string | null;
  ngo_contact_phone?: string | null;
  ngo_contact_email?: string | null;

  pickup_notes?: string | null;
  pickup_scheduled_start?: string | null;
  pickup_scheduled_end?: string | null;
}

export interface SurplusListingCreate {
  tenant_id: number;
  inventory_id: number;
  quantity: number;
  recipient_name?: string;
  pickup_location?: string;
  pickup_latitude?: number;
  pickup_longitude?: number;
  available_from?: string;
  available_until?: string;

  note?: string;
}