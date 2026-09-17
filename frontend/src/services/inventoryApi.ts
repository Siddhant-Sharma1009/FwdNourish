import api from "./api";
import type {
  Inventory,
  InventoryCreate,
} from "../types/inventory";


export async function getInventory(
  tenantId: number
): Promise<Inventory[]> {

  const response = await api.get<Inventory[]>(
    "/inventory/",
    {
      params: {
        tenant_id: tenantId,
      },
    }
  );

  return response.data;
}


export async function createInventory(
  data: InventoryCreate
): Promise<Inventory> {

  const response = await api.post<Inventory>(
    "/inventory/",
    data
  );

  return response.data;
}


export async function deleteInventory(
  inventoryId: number,
  tenantId: number
): Promise<void> {

  await api.delete(
    `/inventory/${inventoryId}`,
    {
      params: {
        tenant_id: tenantId,
      },
    }
  );
}

export async function getInventoryBySku(
  sku: string,
  tenantId: number
): Promise<Inventory> {

  const response = await api.get<Inventory>(
    `/inventory/sku/${encodeURIComponent(sku)}`,
    {
      params: {
        tenant_id: tenantId,
      },
    }
  );

  return response.data;
}