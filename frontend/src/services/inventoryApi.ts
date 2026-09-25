import api from "./api";

import type {
  Inventory,
  InventoryCreate,
} from "../types/inventory";


// ============================================================
// GET ALL INVENTORY
// Backend automatically returns inventory for logged-in tenant
// ============================================================

export async function getInventory(): Promise<Inventory[]> {
  const response = await api.get<Inventory[]>("/inventory/");
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


// ============================================================
// DELETE INVENTORY
// Tenant is determined by JWT on backend
// ============================================================

export async function deleteInventory(
  inventoryId: number
): Promise<void> {

  await api.delete(
    `/inventory/${inventoryId}`
  );
}


// ============================================================
// GET INVENTORY BY SKU
// Tenant is determined by JWT on backend
// ============================================================

export async function getInventoryBySku(
  sku: string
): Promise<Inventory> {

  const response = await api.get<Inventory>(
    `/inventory/sku/${encodeURIComponent(sku)}`
  );

  return response.data;
}