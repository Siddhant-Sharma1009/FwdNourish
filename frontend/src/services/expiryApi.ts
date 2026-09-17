import api from "./api";
import type { ExpiryStatus } from "../types/expiry";


export async function getExpiryStatuses(
  tenantId: number
): Promise<ExpiryStatus[]> {

  const response = await api.get<ExpiryStatus[]>(
    "/expiry/",
    {
      params: {
        tenant_id: tenantId,
      },
    }
  );

  return response.data;
}


export async function getExpiryAlerts(
  tenantId: number
): Promise<ExpiryStatus[]> {

  const response = await api.get<ExpiryStatus[]>(
    "/expiry/alerts",
    {
      params: {
        tenant_id: tenantId,
      },
    }
  );

  return response.data;
}