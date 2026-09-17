export interface Inventory {
  id: number;
  tenant_id: number;
  sku: string;
  name: string;
  category_id: number;
  quantity: number;
  unit: string;
  batch_number: string | null;
  purchase_date: string;
  expiry_date: string;
  expiry_threshold_days: number;
  created_at: string;
}

export interface InventoryCreate {
  tenant_id: number;
  sku: string;
  name: string;
  category_id: number;
  quantity: number;
  unit: string;
  batch_number?: string | null;
  purchase_date: string;
  expiry_date: string;
  expiry_threshold_days: number;
}