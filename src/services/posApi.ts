import api from "./api";

export interface POSResponse {
  message: string;
  sku: string;
  quantity_changed: number;
  remaining_quantity: number;
}

export interface POSRequest {
  tenant_id: number;
  sku: string;
  quantity: number;
  reference_id: string;
}

export async function processSale(
  data: POSRequest
): Promise<POSResponse> {
  const response = await api.post<POSResponse>(
    "/pos/sale",
    data
  );

  return response.data;
}

export async function processPurchase(
  data: POSRequest
): Promise<POSResponse> {
  const response = await api.post<POSResponse>(
    "/pos/purchase",
    data
  );

  return response.data;
}