import api from "./api";
import type { SurplusListing, SurplusListingCreate } from "../types/surplus";

export async function createSurplusListing(
  data: SurplusListingCreate & { ngo_id?: number }
): Promise<SurplusListing> {
  const response = await api.post<SurplusListing>(
    "/donations/",
    data
  );

  return response.data;
}

export async function getSurplusListings(): Promise<SurplusListing[]> {
  const response = await api.get<SurplusListing[]>(
    "/donations/"
  );

  return response.data;
}

export async function cancelSurplusListing(
  donationId: number
): Promise<SurplusListing> {
  const response = await api.patch<SurplusListing>(
    `/donations/${donationId}/cancel`
  );

  return response.data;
}

export async function completeSurplusListing(
  listingId: number
): Promise<SurplusListing> {
  const response = await api.patch<SurplusListing>(
    `/donations/${listingId}/complete`
  );

  return response.data;
}

export interface DonationMatchResult {
  match_id: number | null;
  donation_id: number | null;
  requirement_id: number;
  ngo_id: number;
  food_match_score: number;
  quantity_match_score: number;
  distance_km: number | null;
  distance_match_score: number;
  expiry_match_score: number;
  match_score: number;
  status: string;
}

export interface GenerateDonationMatchesResponse {
  donation_id: number;
  total_matches: number;
  diagnostics?: {
    total_active_requirements?: number;
    diagnostic_results?: Array<Record<string, unknown>>;
  };
  matches: DonationMatchResult[];
}

export interface PreviewDonationMatchesRequest {
  inventory_id: number;
  quantity: number;
  pickup_latitude?: number;
  pickup_longitude?: number;
  available_until?: string;
}

export interface PreviewDonationMatchesResponse {
  total_matches: number;
  matches: DonationMatchResult[];
}

export async function previewDonationMatches(
  data: PreviewDonationMatchesRequest
): Promise<PreviewDonationMatchesResponse> {
  const response = await api.post<PreviewDonationMatchesResponse>(
    "/donation-matches/preview",
    data
  );

  return response.data;
}

export async function generateDonationMatches(
  donationId: number
): Promise<GenerateDonationMatchesResponse> {
  const response =
    await api.post<GenerateDonationMatchesResponse>(
      `/donation-matches/${donationId}/generate`
    );

  return response.data;
}

export async function selectDonationMatch(
  matchId: number
): Promise<{
  message: string;
  match_id: number;
  donation_id: number;
  ngo_id: number;
  status: string;
}> {
  const response = await api.post(
    `/donation-matches/${matchId}/select`
  );

  return response.data;
}
