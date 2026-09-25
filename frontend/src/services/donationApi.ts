import api from "./api";

import type {
  DonationCreateRequest,
  DonationResponse,
} from "../types/donation";

export async function createDonation(
  data: DonationCreateRequest
): Promise<DonationResponse> {
  const response = await api.post<DonationResponse>(
    "/donations/",
    data
  );

  return response.data;
}

export async function getMyDonations(): Promise<
  DonationResponse[]
> {
  const response = await api.get<DonationResponse[]>(
    "/donations/"
  );

  return response.data;
}

export async function cancelDonation(
  donationId: number
): Promise<DonationResponse> {
  const response = await api.patch<DonationResponse>(
    `/donations/${donationId}/cancel`
  );

  return response.data;
}