import api from "./api";

import type { ExpiryStatus } from "../types/expiry";

export async function getExpiryStatuses(): Promise<ExpiryStatus[]> {
  const response = await api.get<ExpiryStatus[]>("/expiry/");

  return response.data;
}

export async function getExpiryAlerts(): Promise<ExpiryStatus[]> {
  const response = await api.get<ExpiryStatus[]>("/expiry/alerts");

  return response.data;
}