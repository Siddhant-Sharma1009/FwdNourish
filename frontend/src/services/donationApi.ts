import api from "./api";

import type {
  Donation,
  DonationCreate,
} from "../types/donation";


export async function createDonation(
  data: DonationCreate
): Promise<Donation> {

  const response = await api.post<Donation>(
    "/donations/",
    data
  );

  return response.data;
}


export async function getDonations(
  tenantId: number
): Promise<Donation[]> {

  const response = await api.get<Donation[]>(
    "/donations/",
    {
      params: {
        tenant_id: tenantId,
      },
    }
  );

  return response.data;
}