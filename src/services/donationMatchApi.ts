import api from "./api";

export interface DonationMatch {
  match_id: number;
  donation_id: number;
  requirement_id: number;

  food_name: string;

  required_quantity: number;
  required_unit: string;
  available_quantity: number;

  // Donor / business information
  donor_organization_name: string | null;
  donor_owner_name: string | null;
  donor_owner_phone: string | null;
  donor_owner_email: string | null;
  donor_address: string | null;

  // Pickup location
  pickup_location: string | null;
  pickup_latitude: number | null;
  pickup_longitude: number | null;

  // Donor note
  note: string | null;

  // Donation availability
  available_from: string | null;
  available_until: string | null;

  // Matching information
  distance_km: number | null;
  food_match_score: number;
  quantity_match_score: number;
  distance_match_score: number;
  expiry_match_score: number;
  match_score: number;

  status: string;
}

interface NGOMatchesResponse {
  ngo_id: number;
  total_matches: number;
  matches: DonationMatch[];
}

export async function getNGOMatches(): Promise<DonationMatch[]> {
  const response = await api.get<NGOMatchesResponse>(
    "/donation-matches/ngo/matches"
  );

  return response.data.matches ?? [];
}
