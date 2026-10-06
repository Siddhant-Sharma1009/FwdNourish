export interface DonationInventoryItem {
  id: number;
  sku: string;
  name: string;
  category_id: number;
  quantity: number;
  unit: string;
  expiry_date: string;
  expiry_threshold_days: number;
  is_deleted?: boolean;
}

export interface LocationData {
  address: string;
  city: string;
  state: string;
  pincode: string;
  latitude: string;
  longitude: string;
  google_maps_link: string;
}

export interface NGOOption {
  id: number;
  user_id: number;
  organization_name: string;
  registration_number: string;
  full_name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number | null;
  longitude: number | null;
  service_radius_km: number;
  description?: string | null;
}

export interface MatchBreakdown {
  food_match_score: number;
  quantity_match_score: number;
  distance_km: number | null;
  distance_match_score: number;
  expiry_match_score: number;
  match_score: number;
}

export interface AIRecommendedNGO extends NGOOption {
  match_id: number;
  requirement_id: number;
  required_quantity: number;
  required_unit: string;
  match_breakdown: MatchBreakdown;
}

export interface DonationCreateRequest {
  tenant_id: number;
  inventory_id: number;
  quantity: number;

  pickup_location: string;
  pickup_latitude?: number;
  pickup_longitude?: number;

  available_from: string;
  available_until: string;

  note?: string;
  ngo_id?: number;
  match_id?: number;
}

export interface DonationResponse {
  id: number;
  tenant_id: number;
  inventory_id: number;
  quantity: number;
  committed_quantity: number;
  remaining_quantity: number;

  pickup_location: string | null;
  pickup_latitude: number | null;
  pickup_longitude: number | null;

  available_from: string;
  available_until: string;

  donation_status: string;
  note: string | null;

  created_at: string;
  donated_at: string | null;
}